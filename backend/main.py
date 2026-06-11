"""
main.py - FastAPI 메인 서버 모듈

웹 애플리케이션의 백엔드 API 서버를 구성합니다.
RESTful API를 통해 프론트엔드(React)와 통신하며, 
SQLAlchemy ORM을 사용하여 MySQL 데이터베이스와 상호작용합니다.

주요 기능:
    - 사용자 인증 (로그인/회원가입)
    - 강의 목록 조회 및 수강 신청
    - 과제 CRUD
    - 사용자 데이터 동기화
"""

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
import json
import os


# =============================================================================
# 서버 생명주기 관리 (Lifespan)
# =============================================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI 서버의 시작과 종료 시 실행되는 생명주기 관리 함수입니다.
    
    시작 시 수행 작업:
        1. 데이터베이스 연결 시도 (최대 5회 재시도)
        2. 테이블 스키마 생성 및 마이그레이션
        3. 강의 데이터 동기화 (bulk_insert)
        4. 초기 테스트 데이터 시딩 (seed)
    
    종료 시:
        - 정리 작업 수행 (현재는 로그 출력만)
    
    Yields:
        None: 서버가 실행 중인 동안 제어권을 FastAPI에 넘김
    
    Raises:
        Exception: DB 연결 5회 실패 시 서버 시작 중단
    """
    print("서버를 시작합니다. DB 연결을 시도합니다...")
    
    # Docker 환경에서 DB 컨테이너가 준비될 때까지 대기
    max_retries = 5
    for attempt in range(max_retries):
        try:
            # 테이블 생성 (models.py에 정의된 모든 모델)
            models.Base.metadata.create_all(bind=engine)
            
            # 스키마 마이그레이션 (새 컬럼 추가)
            ensure_lecture_schema()
            ensure_user_schema()
            
            print("DB 연결 및 테이블 뼈대 생성 성공!")
            break
        except OperationalError:
            print(f"DB가 아직 준비되지 않았습니다. 3초 후 다시 시도합니다... ({attempt + 1}/{max_retries})")
            time.sleep(3)
    else:
        # for-else: 반복문이 break 없이 완료되면 실행
        raise Exception("DB 연결에 최종 실패했습니다. DB 상태를 확인하세요.")

    # 연결 성공 후 데이터 주입 진행
    bulk_insert.insert_lectures()  # lectures.json → DB 동기화
    seed.seed_db()                 # 테스트 데이터 시딩
    
    print("모든 데이터베이스 준비가 완료되었습니다.")
    
    yield  # 서버 실행 중...

    # 서버 종료 시 정리 작업
    print("서버를 종료합니다.")


# =============================================================================
# FastAPI 앱 인스턴스 생성
# =============================================================================
app = FastAPI(lifespan=lifespan)


# =============================================================================
# CORS (Cross-Origin Resource Sharing) 설정
# =============================================================================
# 프론트엔드(localhost:3000)에서 백엔드(localhost:8000)로의 
# 교차 출처 요청을 허용하기 위한 미들웨어 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React 개발 서버 주소
    allow_credentials=True,                    # 쿠키/인증 헤더 허용
    allow_methods=["*"],                       # 모든 HTTP 메서드 허용
    allow_headers=["*"],                       # 모든 헤더 허용
)


# =============================================================================
# 데이터베이스 스키마 마이그레이션 함수
# =============================================================================
def ensure_lecture_schema():
    """
    Lecture 테이블에 새로운 컬럼을 추가합니다.
    
    기존 테이블이 있을 때 새 컬럼이 필요한 경우,
    SQLAlchemy의 create_all()만으로는 추가되지 않아
    ALTER TABLE을 직접 실행합니다.
    
    Note:
        이미 존재하는 컬럼은 예외를 무시하고 건너뜁니다.
    """
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
                connection.execute(
                    text(f"ALTER TABLE lectures ADD COLUMN {column_name} {column_type}")
                )
                print(f"강의 테이블 컬럼 추가: {column_name}")
            except Exception as exc:
                # 이미 존재하는 컬럼이면 무시
                message = str(exc).lower()
                if 'duplicate' not in message and 'already exists' not in message:
                    raise


def ensure_user_schema():
    """
    User 테이블에 새로운 컬럼을 추가합니다.
    """
    columns = [
        ('email', 'VARCHAR(100)'),
        ('department', 'VARCHAR(100)'),
        ('grade', 'VARCHAR(20) DEFAULT "1학년"'),
    ]
    
    with engine.begin() as connection:
        for column_name, column_type in columns:
            try:
                connection.execute(
                    text(f"ALTER TABLE users ADD COLUMN {column_name} {column_type}")
                )
                print(f"사용자 테이블 컬럼 추가: {column_name}")
            except Exception as exc:
                message = str(exc).lower()
                if 'duplicate' not in message and 'already exists' not in message:
                    raise


# =============================================================================
# 데이터베이스 세션 의존성 주입
# =============================================================================
def get_db():
    """
    API 엔드포인트에서 사용할 DB 세션을 생성하고 제공합니다.
    
    FastAPI의 Depends()와 함께 사용되어 각 요청마다 
    새로운 세션을 생성하고, 요청 완료 후 자동으로 정리합니다.
    
    Yields:
        Session: SQLAlchemy 데이터베이스 세션
    
    Example:
        @app.get("/api/example")
        def example(db: Session = Depends(get_db)):
            return db.query(Model).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# =============================================================================
# Pydantic 스키마 정의 (요청/응답 데이터 검증)
# =============================================================================
class LoginRequest(BaseModel):
    """로그인 요청 데이터"""
    student_id: str  # 학번
    password: str    # 비밀번호 (평문)


class SignupRequest(BaseModel):
    """회원가입 요청 데이터"""
    email: str
    student_id: str
    department: str
    password: str


class SyncData(BaseModel):
    """사용자 데이터 동기화 요청"""
    timetable: list   # 시간표 데이터
    assignments: list # 과제 목록
    grades: dict      # 성적 정보


class AssignmentCreate(BaseModel):
    """과제 생성 요청"""
    title: str
    due: str
    urgency: str
    done: bool = False


class AssignmentUpdate(BaseModel):
    """과제 수정 요청 (선택적 필드)"""
    title: Optional[str] = None
    due: Optional[str] = None
    urgency: Optional[str] = None
    done: Optional[bool] = None


class EnrollmentCreate(BaseModel):
    """수강 신청 요청"""
    lecture_id: str  # 강의 ID 또는 "학수번호-분반"


class UserUpdate(BaseModel):
    """사용자 프로필 수정 요청"""
    grade: str  # 학년


# =============================================================================
# 헬퍼 함수
# =============================================================================
# 비밀번호 해싱 컨텍스트
pwd_context = PasswordHash.recommended()

# JSON 파일 경로
USERS_DATA_FILE = "users_data.json"


def load_users_data():
    """
    사용자 데이터 JSON 파일을 로드합니다.
    
    Returns:
        dict: 학번을 키로 하는 사용자 데이터 딕셔너리
    """
    if not os.path.exists(USERS_DATA_FILE):
        return {}
    with open(USERS_DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_users_data(data):
    """
    사용자 데이터를 JSON 파일에 저장합니다.
    
    Args:
        data: 저장할 데이터 딕셔너리
    """
    with open(USERS_DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def resolve_lecture(db: Session, lecture_identifier: str):
    """
    강의 식별자로 Lecture 객체를 조회합니다.
    
    두 가지 형식의 식별자를 지원합니다:
        1. 강의 ID (예: "CSE101-001")
        2. 학수번호-분반 조합 (예: "CSE101-001")
    
    Args:
        db: 데이터베이스 세션
        lecture_identifier: 강의 식별자 문자열
    
    Returns:
        Lecture: 조회된 강의 객체 또는 None
    """
    value = (lecture_identifier or '').strip()
    if not value:
        return None

    # 방법 1: ID로 직접 조회
    lecture = db.query(models.Lecture).filter(
        models.Lecture.id == value
    ).first()
    if lecture:
        return lecture

    # 방법 2: 학수번호-분반으로 조회
    if '-' in value:
        lecture_code, section_code = value.split('-', 1)
        return db.query(models.Lecture).filter(
            models.Lecture.lecture_code == lecture_code,
            models.Lecture.section_code == section_code
        ).first()

    return None


def meeting_start(meeting):
    """수업 시작 시간을 분 단위로 변환합니다."""
    return meeting.start_hour * 60 + (meeting.start_minute or 0)


def meeting_end(meeting):
    """수업 종료 시간을 분 단위로 변환합니다."""
    return meeting.end_hour * 60 + (meeting.end_minute or 0)


def find_time_conflict(user, new_lecture):
    """
    새 강의가 기존 수강 내역과 시간이 겹치는지 확인합니다.
    
    Args:
        user: 사용자 객체 (enrollments 관계 포함)
        new_lecture: 신청하려는 강의 객체
    
    Returns:
        Lecture: 충돌하는 강의 객체 또는 None
    
    Algorithm:
        두 시간 구간 [A_start, A_end)와 [B_start, B_end)가 겹치는 조건:
        A_start < B_end AND A_end > B_start
    """
    for enrollment in user.enrollments:
        current_lecture = enrollment.lecture
        if not current_lecture or current_lecture.id == new_lecture.id:
            continue

        # 각 수업 시간 쌍에 대해 충돌 검사
        for new_meeting in new_lecture.meetings:
            for current_meeting in current_lecture.meetings:
                # 요일이 다르면 충돌 없음
                if new_meeting.day != current_meeting.day:
                    continue
                    
                # 시간 구간 겹침 검사
                if (meeting_start(new_meeting) < meeting_end(current_meeting) and 
                    meeting_end(new_meeting) > meeting_start(current_meeting)):
                    return current_lecture

    return None


# =============================================================================
# API 엔드포인트: 인증
# =============================================================================
@app.post("/api/signup")
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    """
    회원가입 API
    
    Request Body:
        - email: 이메일 주소
        - student_id: 학번 (7자리)
        - department: 학과
        - password: 비밀번호
    
    Returns:
        - message: 성공 메시지
    
    Raises:
        - 400: 학번 형식 오류, 이메일 형식 오류, 중복 학번
    """
    # 입력 검증
    if len(req.student_id) != 7:
        raise HTTPException(status_code=400, detail="학번은 7자리여야 합니다.")
    if "@" not in req.email:
        raise HTTPException(status_code=400, detail="유효한 이메일을 입력해주세요.")
    
    # 중복 학번 확인
    user = db.query(models.User).filter(
        models.User.student_id == req.student_id
    ).first()
    if user:
        raise HTTPException(status_code=400, detail="이미 존재하는 학번입니다.")
    
    # 비밀번호 해싱 후 사용자 생성
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
    
    # JSON 파일에도 초기 데이터 구조 생성
    data = load_users_data()
    data[req.student_id] = {
        "timetable": [],
        "assignments": [],
        "grades": {}
    }
    save_users_data(data)
    
    return {"message": "회원가입이 완료되었습니다."}


@app.post("/api/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """
    로그인 API
    
    Request Body:
        - student_id: 학번
        - password: 비밀번호
    
    Returns:
        - id: 학번
        - name: 이름
        - email: 이메일
        - dept: 학과
        - grade: 학년
    
    Raises:
        - 400: 존재하지 않는 학번, 비밀번호 불일치
    """
    # 사용자 조회
    user = db.query(models.User).filter(
        models.User.student_id == req.student_id
    ).first()
    if not user:
        raise HTTPException(status_code=400, detail="존재하지 않는 학번입니다.")
    
    # 비밀번호 검증 (해시값 비교)
    if not pwd_context.verify(req.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="비밀번호가 일치하지 않습니다.")
    
    # 사용자 정보 반환 (비밀번호 제외)
    return {
        "id": user.student_id,
        "name": user.name,
        "email": user.email,
        "dept": user.department,
        "grade": user.grade or "1학년"
    }


# =============================================================================
# API 엔드포인트: 사용자 데이터
# =============================================================================
@app.post("/api/users/{student_id}/sync")
def sync_user_data(student_id: str, payload: SyncData, db: Session = Depends(get_db)):
    """
    사용자 데이터 동기화 API
    
    프론트엔드에서 변경된 시간표, 과제, 성적 데이터를 서버에 저장합니다.
    
    Path Parameters:
        - student_id: 학번
    
    Request Body:
        - timetable: 시간표 데이터
        - assignments: 과제 목록
        - grades: 성적 정보
    """
    # 사용자 존재 확인
    user = db.query(models.User).filter(
        models.User.student_id == student_id
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # JSON 파일에 데이터 저장
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
    """
    사용자 데이터 조회 API
    
    저장된 시간표, 과제, 성적 데이터를 반환합니다.
    
    Returns:
        - timetable: 시간표 데이터
        - assignments: 과제 목록
        - grades: 성적 정보
    """
    data = load_users_data()
    user_data = data.get(student_id, {
        "timetable": [],
        "assignments": [],
        "grades": {}
    })
    return user_data


@app.put("/api/users/{student_id}/profile")
def update_user_profile(student_id: str, profile: UserUpdate, db: Session = Depends(get_db)):
    """
    사용자 프로필 수정 API
    
    현재는 학년 변경만 지원합니다.
    """
    user = db.query(models.User).filter(
        models.User.student_id == student_id
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.grade = profile.grade
    db.commit()
    
    return {"message": "Profile updated", "grade": user.grade}


# =============================================================================
# API 엔드포인트: 강의
# =============================================================================
@app.get("/api/lectures")
def get_all_lectures(db: Session = Depends(get_db)):
    """
    전체 강의 목록 조회 API
    
    시간표 페이지 초기 로딩 시 호출되어 모든 개설 강의를 반환합니다.
    
    Returns:
        list: 강의 정보 딕셔너리 리스트 (meetings 포함)
    """
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
            # 수업 시간 목록
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


# =============================================================================
# API 엔드포인트: 시간표 및 수강 신청
# =============================================================================
@app.get("/api/users/{student_id}/timetable")
def get_user_timetable(student_id: str, db: Session = Depends(get_db)):
    """
    사용자 시간표 조회 API
    
    수강 신청된 강의들의 시간 정보를 시간표 형식으로 반환합니다.
    하나의 강의가 여러 요일에 진행되면 각각 별도 항목으로 반환됩니다.
    """
    user = db.query(models.User).filter(
        models.User.student_id == student_id
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="해당 학번의 학생을 찾을 수 없습니다.")

    timetable_entries = []
    for enrollment in user.enrollments:
        lecture = enrollment.lecture
        
        # 각 수업 시간을 별도 항목으로 변환
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
    """
    수강 신청 API
    
    시간 충돌 검사 후 수강 신청을 처리합니다.
    
    Raises:
        - 404: 학생/강의 없음
        - 409: 이미 수강 중, 시간 충돌
    """
    # 사용자 조회
    user = db.query(models.User).filter(
        models.User.student_id == student_id
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="학생을 찾을 수 없습니다.")

    # 강의 조회
    lecture = resolve_lecture(db, enrollment_data.lecture_id)
    if not lecture:
        raise HTTPException(status_code=404, detail="해당 강의를 찾을 수 없습니다.")

    # 중복 수강 확인
    existing = db.query(models.Enrollment).filter(
        models.Enrollment.user_id == user.id,
        models.Enrollment.lecture_id == lecture.id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="이미 수강신청한 강의입니다.")

    # 시간 충돌 검사
    conflicting_lecture = find_time_conflict(user, lecture)
    if conflicting_lecture:
        raise HTTPException(
            status_code=409, 
            detail=f"{conflicting_lecture.name} 강의와 시간이 겹칩니다."
        )

    # 수강 신청 처리
    new_enrollment = models.Enrollment(user_id=user.id, lecture_id=lecture.id)
    db.add(new_enrollment)
    db.commit()
    
    return {"detail": "수강신청 완료", "lectureId": lecture.id}


@app.delete("/api/users/{student_id}/enrollments/{lecture_id}")
def drop_lecture(student_id: str, lecture_id: str, db: Session = Depends(get_db)):
    """
    수강 취소 API
    """
    user = db.query(models.User).filter(
        models.User.student_id == student_id
    ).first()
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


# =============================================================================
# API 엔드포인트: 과제 CRUD
# =============================================================================
@app.get("/api/users/{student_id}/assignments")
def get_user_assignments(student_id: str, db: Session = Depends(get_db)):
    """
    사용자 과제 목록 조회 API
    """
    user = db.query(models.User).filter(
        models.User.student_id == student_id
    ).first()
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
    """
    과제 생성 API
    """
    user = db.query(models.User).filter(
        models.User.student_id == student_id
    ).first()
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
    db.refresh(new_assignment)  # DB에서 생성된 ID 포함하여 새로고침
    
    return new_assignment


@app.put("/api/assignments/{assignment_id}")
def update_assignment(assignment_id: int, assignment_data: AssignmentUpdate, db: Session = Depends(get_db)):
    """
    과제 수정 API
    
    전달된 필드만 선택적으로 업데이트합니다.
    """
    db_assignment = db.query(models.Assignment).filter(
        models.Assignment.id == assignment_id
    ).first()
    if not db_assignment:
        raise HTTPException(status_code=404, detail="해당 과제를 찾을 수 없습니다.")
    
    # exclude_unset=True: 명시적으로 전달된 필드만 포함
    update_data = assignment_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_assignment, key, value)
    
    db.commit()
    db.refresh(db_assignment)
    
    return db_assignment


@app.delete("/api/assignments/{assignment_id}")
def delete_assignment(assignment_id: int, db: Session = Depends(get_db)):
    """
    과제 삭제 API
    """
    db_assignment = db.query(models.Assignment).filter(
        models.Assignment.id == assignment_id
    ).first()
    if not db_assignment:
        raise HTTPException(status_code=404, detail="해당 과제를 찾을 수 없습니다.")
    
    db.delete(db_assignment)
    db.commit()
    
    return {"detail": "과제가 삭제되었습니다."}
