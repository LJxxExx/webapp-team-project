from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import models
from database import engine, SessionLocal

# 1. DB 테이블 자동 생성
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# 2. CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. DB 세션 공급 함수
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Pydantic 스키마 ---
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

# ---------------------------------------------------------
# 🚀 4. 전체 강의 목록 조회 API
# ---------------------------------------------------------
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
            "department": lecture.department,
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
# 🚀 5. 학번(student_id) 기반 시간표 조회 및 수강신청 API
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
    
    # 이미 수강 중인지 확인
    existing = db.query(models.Enrollment).filter(
        models.Enrollment.user_id == user.id,
        models.Enrollment.lecture_id == enrollment_data.lecture_id
    ).first()
    if existing:
        return {"detail": "이미 수강 중인 강의입니다."}

    new_enrollment = models.Enrollment(user_id=user.id, lecture_id=enrollment_data.lecture_id)
    db.add(new_enrollment)
    db.commit()
    return {"detail": "수강신청 완료"}

@app.delete("/api/users/{student_id}/enrollments/{lecture_id}")
def drop_lecture(student_id: str, lecture_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.student_id == student_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="학생을 찾을 수 없습니다.")
    
    enrollment = db.query(models.Enrollment).filter(
        models.Enrollment.user_id == user.id,
        models.Enrollment.lecture_id == lecture_id
    ).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="수강 내역을 찾을 수 없습니다.")
    
    db.delete(enrollment)
    db.commit()
    return {"detail": "수강 취소 완료"}

# ---------------------------------------------------------
# 🚀 6. 학번(student_id) 기반 과제 API (CRUD)
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