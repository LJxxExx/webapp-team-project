from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import OperationalError
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from pwdlib import PasswordHash
import models
from database import engine, SessionLocal
from contextlib import asynccontextmanager
import bulk_insert
import seed
import time

# 1. DB 테이블 자동 생성
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("서버를 시작합니다. DB 연결을 시도합니다...")
    
    max_retries = 5  # 최대 5번 재시도
    for attempt in range(max_retries):
        try:
            # DB 연결을 가장 먼저 시도하는 부분 (테이블 생성)
            models.Base.metadata.create_all(bind=engine)
            ensure_lecture_schema()
            ensure_user_schema()
            print("DB 연결 및 테이블 뼈대 생성 성공!")
            break  # 성공하면 반복문 탈출
        except OperationalError:
            print(f"DB가 아직 준비되지 않았습니다. 3초 후 다시 시도합니다... ({attempt + 1}/{max_retries})")
            time.sleep(3)
    else:
        # 5번 다 실패했을 때만 에러 발생
        raise Exception("DB 연결에 최종 실패했습니다. DB 상태를 확인하세요.")

    # 연결 성공 후 데이터 주입 진행
    bulk_insert.insert_lectures()
    seed.seed_db()
    print("모든 데이터베이스 준비가 완료되었습니다.")
    yield

    # 서버 종료시 실행
    print("서버를 종료합니다.")

app = FastAPI(lifespan=lifespan)

# 2. CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. DB 세션 공급 함수

def ensure_lecture_schema():
    columns = [
        ('liberal_type', 'VARCHAR(50)'),
        ('liberal_area', 'VARCHAR(100)'),
        ('college_code', 'VARCHAR(20)'),
        ('major_name', 'VARCHAR(100)'),
        ('major_code', 'VARCHAR(20)'),
        ('division_name', 'VARCHAR(100)'),
        ('division_code', 'VARCHAR(20)'),
        ('course_type', 'VARCHAR(50)'),
        ('target_grade', 'INT'),
        ('target_audience', 'VARCHAR(100)'),
        ('note', 'VARCHAR(100)'),
    ]

    with engine.begin() as connection:
        for column_name, column_type in columns:
            try:
                connection.execute(text(f"ALTER TABLE lectures ADD COLUMN {column_name} {column_type}"))
                print(f"강의 테이블 컬럼 추가: {column_name}")
            except Exception as exc:
                message = str(exc).lower()
                if 'duplicate' not in message and 'already exists' not in message:
                    raise

def ensure_user_schema():
    columns = [
        ('email', 'VARCHAR(100)'),
        ('department', 'VARCHAR(100)'),
        ('grade', 'VARCHAR(20) DEFAULT "1학년"'),
    ]
    with engine.begin() as connection:
        for column_name, column_type in columns:
            try:
                connection.execute(text(f"ALTER TABLE users ADD COLUMN {column_name} {column_type}"))
                print(f"사용자 테이블 컬럼 추가: {column_name}")
            except Exception as exc:
                message = str(exc).lower()
                if 'duplicate' not in message and 'already exists' not in message:
                    raise

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Pydantic 스키마 ---
class LoginRequest(BaseModel):
    student_id: str
    password: str

class SignupRequest(BaseModel):
    email: str
    student_id: str
    department: str
    password: str

class SyncData(BaseModel):
    timetable: list
    assignments: list
    grades: dict

class AssignmentCreate(BaseModel):
    title: str
    due: str
    urgency: str
    done: bool = False

class AssignmentUpdate(BaseModel):
    title: Optional[str] = None
    due: Optional[str] = None
    urgency: Optional[str] = None
    done: Optional[bool] = None

class EnrollmentCreate(BaseModel):
    lecture_id: str


def resolve_lecture(db: Session, lecture_identifier: str):
    value = (lecture_identifier or '').strip()
    if not value:
        return None

    lecture = db.query(models.Lecture).filter(models.Lecture.id == value).first()
    if lecture:
        return lecture

    if '-' in value:
        lecture_code, section_code = value.split('-', 1)
        return db.query(models.Lecture).filter(
            models.Lecture.lecture_code == lecture_code,
            models.Lecture.section_code == section_code
        ).first()

    return None


def meeting_start(meeting):
    return meeting.start_hour * 60 + (meeting.start_minute or 0)


def meeting_end(meeting):
    return meeting.end_hour * 60 + (meeting.end_minute or 0)


def find_time_conflict(user, new_lecture):
    for enrollment in user.enrollments:
        current_lecture = enrollment.lecture
        if not current_lecture or current_lecture.id == new_lecture.id:
            continue

        for new_meeting in new_lecture.meetings:
            for current_meeting in current_lecture.meetings:
                if new_meeting.day != current_meeting.day:
                    continue
                if meeting_start(new_meeting) < meeting_end(current_meeting) and meeting_end(new_meeting) > meeting_start(current_meeting):
                    return current_lecture

    return None

# ---------------------------------------------------------
# 4. 전체 강의 목록 조회 API
# ---------------------------------------------------------
pwd_context = PasswordHash.recommended()

# ---------------------------------------------------------
# JSON 데이터 관리
# ---------------------------------------------------------
import json
import os

USERS_DATA_FILE = "users_data.json"

def load_users_data():
    if not os.path.exists(USERS_DATA_FILE):
        return {}
    with open(USERS_DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_users_data(data):
    with open(USERS_DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

@app.post("/api/signup")
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    if len(req.student_id) != 7:
        raise HTTPException(status_code=400, detail="학번은 7자리여야 합니다.")
    if "@" not in req.email:
        raise HTTPException(status_code=400, detail="유효한 이메일을 입력해주세요.")
        
    user = db.query(models.User).filter(models.User.student_id == req.student_id).first()
    if user:
        raise HTTPException(status_code=400, detail="이미 존재하는 학번입니다.")
        
    hashed_pw = pwd_context.hash(req.password)
    new_user = models.User(
        student_id=req.student_id,
        name="신규회원", 
        email=req.email,
        department=req.department,
        hashed_password=hashed_pw
    )
    db.add(new_user)
    db.commit()
    
    # JSON 파일에도 초기 데이터 생성
    data = load_users_data()
    data[req.student_id] = {
        "timetable": [],
        "assignments": [],
        "grades": {}
    }
    save_users_data(data)
    
    return {"message": "회원가입이 완료되었습니다."}

@app.post("/api/users/{student_id}/sync")
def sync_user_data(student_id: str, payload: SyncData, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.student_id == student_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    data = load_users_data()
    data[student_id] = {
        "timetable": payload.timetable,
        "assignments": payload.assignments,
        "grades": payload.grades
    }
    save_users_data(data)
    return {"message": "데이터가 성공적으로 저장되었습니다."}

@app.get("/api/users/{student_id}/data")
def get_user_data(student_id: str, db: Session = Depends(get_db)):
    data = load_users_data()
    user_data = data.get(student_id, {
        "timetable": [],
        "assignments": [],
        "grades": {}
    })
    return user_data

@app.post("/api/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.student_id == req.student_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="존재하지 않는 학번입니다.")
    if not pwd_context.verify(req.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="비밀번호가 일치하지 않습니다.")
    
    return {
        "id": user.student_id,
        "name": user.name,
        "email": user.email,
        "dept": user.department,
        "grade": user.grade or "1학년"
    }

class UserUpdate(BaseModel):
    grade: str

@app.put("/api/users/{student_id}/profile")
def update_user_profile(student_id: str, profile: UserUpdate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.student_id == student_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.grade = profile.grade
    db.commit()
    return {"message": "Profile updated", "grade": user.grade}

@app.get("/api/lectures")
def get_all_lectures(db: Session = Depends(get_db)):
    lectures = db.query(models.Lecture).all()
    result = []
    for lecture in lectures:
        result.append({
            "id": lecture.id,
            "lectureCode": lecture.lecture_code,
            "sectionCode": lecture.section_code,
            "name": lecture.name,
            "professor": lecture.professor,
            "room": lecture.room,
            "credit": lecture.credit,
            "category": lecture.category,
            "college": lecture.college,
            "collegeCode": lecture.college_code,
            "divisionCode": lecture.division_code,
            "divisionName": lecture.division_name,
            "majorCode": lecture.major_code,
            "majorName": lecture.major_name,
            "department": lecture.department,
            "liberalType": lecture.liberal_type,
            "liberalArea": lecture.liberal_area,
            "courseType": lecture.course_type,
            "targetGrade": lecture.target_grade,
            "targetAudience": lecture.target_audience,
            "note": lecture.note,
            "capacity": lecture.capacity,
            "enrolled": lecture.enrolled,
            "successRate": lecture.success_rate,
            "color": lecture.color,
            "meetings": [
                {
                    "day": m.day,
                    "startHour": m.start_hour,
                    "startMinute": m.start_minute,
                    "endHour": m.end_hour,
                    "endMinute": m.end_minute
                } for m in lecture.meetings
            ]
        })
    return result

# ---------------------------------------------------------
# 5. 학번(student_id) 기반 시간표 조회 및 수강신청 API
# ---------------------------------------------------------
@app.get("/api/users/{student_id}/timetable")
def get_user_timetable(student_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.student_id == student_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="해당 학번의 학생을 찾을 수 없습니다.")

    timetable_entries = []
    for enrollment in user.enrollments:
        lecture = enrollment.lecture
        for idx, meeting in enumerate(lecture.meetings):
            timetable_entries.append({
                "id": f"{lecture.id}-{idx}",
                "lectureId": lecture.id,
                "name": lecture.name,
                "professor": lecture.professor,
                "room": lecture.room,
                "lectureCode": lecture.lecture_code,
                "sectionCode": lecture.section_code,
                "credit": lecture.credit,
                "courseType": lecture.course_type,
                "targetGrade": lecture.target_grade,
                "targetAudience": lecture.target_audience,
                "note": lecture.note,
                "color": lecture.color,
                "day": meeting.day,
                "startHour": meeting.start_hour,
                "startMinute": meeting.start_minute,
                "endHour": meeting.end_hour,
                "endMinute": meeting.end_minute,
            })
            
    return timetable_entries

@app.post("/api/users/{student_id}/enrollments")
def enroll_lecture(student_id: str, enrollment_data: EnrollmentCreate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.student_id == student_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="학생을 찾을 수 없습니다.")

    lecture = resolve_lecture(db, enrollment_data.lecture_id)
    if not lecture:
        raise HTTPException(status_code=404, detail="해당 강의를 찾을 수 없습니다.")

    existing = db.query(models.Enrollment).filter(
        models.Enrollment.user_id == user.id,
        models.Enrollment.lecture_id == lecture.id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="이미 수강신청한 강의입니다.")

    conflicting_lecture = find_time_conflict(user, lecture)
    if conflicting_lecture:
        raise HTTPException(status_code=409, detail=f"{conflicting_lecture.name} 강의와 시간이 겹칩니다.")

    new_enrollment = models.Enrollment(user_id=user.id, lecture_id=lecture.id)
    db.add(new_enrollment)
    db.commit()
    return {"detail": "수강신청 완료", "lectureId": lecture.id}

@app.delete("/api/users/{student_id}/enrollments/{lecture_id}")
def drop_lecture(student_id: str, lecture_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.student_id == student_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="학생을 찾을 수 없습니다.")

    lecture = resolve_lecture(db, lecture_id)
    if not lecture:
        raise HTTPException(status_code=404, detail="해당 강의를 찾을 수 없습니다.")

    enrollment = db.query(models.Enrollment).filter(
        models.Enrollment.user_id == user.id,
        models.Enrollment.lecture_id == lecture.id
    ).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="수강 내역을 찾을 수 없습니다.")

    db.delete(enrollment)
    db.commit()
    return {"detail": "수강 취소 완료", "lectureId": lecture.id}

# ---------------------------------------------------------
# 6. 학번(student_id) 기반 과제 API (CRUD)
# ---------------------------------------------------------
@app.get("/api/users/{student_id}/assignments")
def get_user_assignments(student_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.student_id == student_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="해당 학번의 학생을 찾을 수 없습니다.")
    
    return [
        {
            "id": assign.id,
            "title": assign.title,
            "due": assign.due,
            "urgency": assign.urgency,
            "done": assign.done
        } for assign in user.assignments
    ]

@app.post("/api/users/{student_id}/assignments")
def create_user_assignment(student_id: str, assignment: AssignmentCreate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.student_id == student_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="해당 학번의 학생을 찾을 수 없습니다.")
    
    new_assignment = models.Assignment(
        user_id=user.id,
        title=assignment.title,
        due=assignment.due,
        urgency=assignment.urgency,
        done=assignment.done
    )
    db.add(new_assignment)
    db.commit()
    db.refresh(new_assignment)
    return new_assignment

@app.put("/api/assignments/{assignment_id}")
def update_assignment(assignment_id: int, assignment_data: AssignmentUpdate, db: Session = Depends(get_db)):
    db_assignment = db.query(models.Assignment).filter(models.Assignment.id == assignment_id).first()
    if not db_assignment:
        raise HTTPException(status_code=404, detail="해당 과제를 찾을 수 없습니다.")
    
    update_data = assignment_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_assignment, key, value)
    
    db.commit()
    db.refresh(db_assignment)
    return db_assignment

@app.delete("/api/assignments/{assignment_id}")
def delete_assignment(assignment_id: int, db: Session = Depends(get_db)):
    db_assignment = db.query(models.Assignment).filter(models.Assignment.id == assignment_id).first()
    if not db_assignment:
        raise HTTPException(status_code=404, detail="해당 과제를 찾을 수 없습니다.")
    
    db.delete(db_assignment)
    db.commit()
    return {"detail": "과제가 삭제되었습니다."}
