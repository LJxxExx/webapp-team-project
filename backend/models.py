"""
models.py - SQLAlchemy ORM 모델 정의 모듈

데이터베이스 테이블 구조를 Python 클래스로 정의합니다.
각 클래스는 하나의 테이블에 매핑되며, relationship()을 통해 테이블 간 관계를 설정합니다.

테이블 관계도:
    User (1) ──┬── (N) Enrollment (N) ──── (1) Lecture
               │                                  │
               └── (N) Assignment           (1) ──┴── (N) LectureMeeting
"""

from sqlalchemy import Column, Integer, String, ForeignKey, Float, Boolean
from sqlalchemy.orm import relationship
from database import Base


# =============================================================================
# 1. 사용자(User) 모델 - 학생 정보 테이블
# =============================================================================
class User(Base):
    """
    학생 정보를 저장하는 테이블
    
    Attributes:
        id: 내부 관리용 자동 증가 기본키
        student_id: 학번 (7자리, 로그인 시 사용하는 고유 식별자)
        name: 학생 이름
        email: 이메일 주소 (회원가입 시 입력)
        department: 소속 학과
        grade: 학년 (기본값: "1학년")
        hashed_password: 암호화된 비밀번호 (pwdlib으로 해싱)
    
    Relationships:
        enrollments: 이 학생의 수강 내역 목록 (1:N)
        assignments: 이 학생의 과제 목록 (1:N)
    """
    __tablename__ = "users"

    # 기본키 - 내부적으로 사용하는 자동 증가 ID
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # 학번 - 외부 노출용 고유 식별자 (로그인 ID로 사용)
    student_id = Column(String(20), unique=True, index=True)
    
    # 사용자 기본 정보
    name = Column(String(50))
    email = Column(String(100), unique=True)
    department = Column(String(100))
    grade = Column(String(20), default="1학년")
    
    # 보안 - 해싱된 비밀번호 저장 (평문 저장 금지)
    hashed_password = Column(String(255))

    # ORM 관계 설정 - User가 삭제되면 연관된 데이터도 함께 처리 가능
    # back_populates: 양방향 관계 설정 (Enrollment.user, Assignment.user에서 역참조)
    enrollments = relationship("Enrollment", back_populates="user")
    assignments = relationship("Assignment", back_populates="user")


# =============================================================================
# 2. 과제(Assignment) 모델 - 학생별 과제 정보 테이블
# =============================================================================
class Assignment(Base):
    """
    과제 정보를 저장하는 테이블
    
    Attributes:
        id: 과제 고유 ID (자동 증가)
        user_id: 과제 소유자의 User.id (외래키)
        title: 과제 제목
        due: 마감일 문자열 (예: "오늘 23:59 까지", "D-3")
        urgency: 긴급도 ("today", "soon", "normal")
        done: 완료 여부
    
    Relationships:
        user: 이 과제의 소유자 (N:1)
    """
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # 외래키 - 어떤 학생의 과제인지 연결
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # 과제 정보
    title = Column(String(200), nullable=False)  # 필수 입력
    due = Column(String(50))       # 마감일 (추후 DateTime으로 고도화 가능)
    urgency = Column(String(20))   # 긴급도 레벨
    done = Column(Boolean, default=False)  # 기본값: 미완료

    # 역참조 관계 - assignment.user로 소유자 정보 접근 가능
    user = relationship("User", back_populates="assignments")


# =============================================================================
# 3. 수강 내역(Enrollment) 모델 - User와 Lecture를 연결하는 다대다 관계 테이블
# =============================================================================
class Enrollment(Base):
    """
    수강 신청 내역을 저장하는 중간 테이블 (다대다 관계 해소)
    
    User(학생)와 Lecture(강의) 사이의 다대다(N:M) 관계를 
    두 개의 일대다(1:N) 관계로 분리하여 관리합니다.
    
    Attributes:
        id: 수강 내역 고유 ID
        user_id: 수강생의 User.id (외래키)
        lecture_id: 수강 강의의 Lecture.id (외래키)
        total_class: 총 수업 횟수 (학점 계산용, 기본값: 15)
        hw_total: 총 과제 수 (학점 계산용)
    
    Relationships:
        user: 수강생 정보 (N:1)
        lecture: 강의 정보 (N:1)
    """
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # 복합 외래키 - 누가(user_id) 어떤 강의(lecture_id)를 수강하는지
    user_id = Column(Integer, ForeignKey("users.id"))
    lecture_id = Column(String(50), ForeignKey("lectures.id"))
    
    # 성적 계산을 위한 추가 정보 (GradeCalculator에서 활용)
    total_class = Column(Integer, default=15)  # 한 학기 총 수업 횟수
    hw_total = Column(Integer, default=0)      # 해당 과목 총 과제 수

    # 양방향 관계 설정
    user = relationship("User", back_populates="enrollments")
    lecture = relationship("Lecture")  # Lecture 측에서는 역참조 불필요


# =============================================================================
# 4. 강의(Lecture) 모델 - 개설 강의 정보 테이블
# =============================================================================
class Lecture(Base):
    """
    개설 강의 정보를 저장하는 테이블
    
    lectures.json에서 데이터를 읽어와 bulk_insert.py를 통해 동기화됩니다.
    
    Attributes:
        id: 강의 고유 ID (학수번호-분반 조합)
        lecture_code: 학수번호 (예: "CSE101")
        section_code: 분반 코드 (예: "001")
        name: 강의명
        professor: 담당 교수
        room: 강의실
        credit: 학점 수
        category: 이수 구분 (전공필수, 전공선택, 교양 등)
        college/department: 개설 단과대학/학과
        liberal_type/liberal_area: 교양 구분 및 영역
        capacity/enrolled: 정원/현재 수강 인원
        success_rate: 수강 신청 성공률 (시뮬레이션용)
        color: 시간표 표시 색상
    
    Relationships:
        meetings: 이 강의의 수업 시간 목록 (1:N)
    """
    __tablename__ = "lectures"
    
    # 기본키 - 학수번호와 분반의 조합으로 생성된 고유 ID
    id = Column(String(50), primary_key=True, index=True)
    
    # 강의 식별 정보
    lecture_code = Column(String(20), nullable=False)  # 학수번호
    section_code = Column(String(10), nullable=False)  # 분반
    name = Column(String(100), nullable=False)         # 강의명
    
    # 강의 기본 정보
    professor = Column(String(50))    # 담당 교수
    room = Column(String(100))        # 강의실
    credit = Column(Integer)          # 학점
    category = Column(String(50))     # 이수 구분
    
    # 개설 학과/단과대 정보
    college = Column(String(50))          # 단과대학명
    college_code = Column(String(20))     # 단과대학 코드
    division_code = Column(String(20))    # 학부 코드
    division_name = Column(String(100))   # 학부명
    major_code = Column(String(20))       # 전공 코드
    major_name = Column(String(100))      # 전공명
    department = Column(String(50))       # 학과명
    
    # 교양 관련 정보
    liberal_type = Column(String(50))     # 교양 유형 (기초교양, 핵심교양 등)
    liberal_area = Column(String(100))    # 교양 영역 (인문, 사회, 자연 등)
    
    # 수강 대상 정보
    course_type = Column(String(50))      # 과목 유형
    target_grade = Column(Integer)        # 대상 학년
    target_audience = Column(String(100)) # 수강 대상 설명
    note = Column(String(100))            # 비고
    
    # 수강 신청 관련 정보
    capacity = Column(Integer)     # 정원
    enrolled = Column(Integer)     # 현재 수강 인원
    success_rate = Column(Integer) # 수강 신청 성공률 (%)
    
    # UI 표시용
    color = Column(String(7))      # 시간표 색상 (HEX: #RRGGBB)

    # 1:N 관계 - 하나의 강의는 여러 수업 시간을 가질 수 있음
    meetings = relationship("LectureMeeting", back_populates="lecture")


# =============================================================================
# 5. 강의 시간(LectureMeeting) 모델 - 강의별 수업 시간 테이블
# =============================================================================
class LectureMeeting(Base):
    """
    강의의 수업 시간 정보를 저장하는 테이블
    
    하나의 강의가 여러 요일/시간에 진행될 수 있으므로 별도 테이블로 분리합니다.
    예: "웹프로그래밍" 강의 → 월 10:00-12:00, 수 10:00-12:00 (2개의 Meeting)
    
    Attributes:
        id: 수업 시간 고유 ID
        lecture_id: 연결된 강의의 ID (외래키)
        day: 요일 (월, 화, 수, 목, 금)
        start_hour/start_minute: 시작 시간
        end_hour/end_minute: 종료 시간
    
    Relationships:
        lecture: 이 수업 시간이 속한 강의 (N:1)
    """
    __tablename__ = "lecture_meetings"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # 외래키 - 어떤 강의의 수업 시간인지
    lecture_id = Column(String(50), ForeignKey("lectures.id"))
    
    # 수업 시간 정보
    day = Column(String(2))           # 요일 (월, 화, 수, 목, 금)
    start_hour = Column(Integer)      # 시작 시 (0-23)
    start_minute = Column(Integer)    # 시작 분 (0-59)
    end_hour = Column(Integer)        # 종료 시
    end_minute = Column(Integer)      # 종료 분

    # 역참조 관계
    lecture = relationship("Lecture", back_populates="meetings")
