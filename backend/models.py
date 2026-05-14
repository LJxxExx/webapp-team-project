from sqlalchemy import Column, Integer, String, ForeignKey, Float, Boolean
from sqlalchemy.orm import relationship
from database import Base

# --- 1. 학생 (User) ---
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(String(20), unique=True, index=True) # 학번
    name = Column(String(50))
    hashed_password = Column(String(255))

    # 학생이 가진 수강내역과 과제들 (1:N 관계)
    enrollments = relationship("Enrollment", back_populates="user")
    assignments = relationship("Assignment", back_populates="user")

# --- 2. 과제 (Assignment) ---
class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id")) # 누구의 과제인가?
    
    title = Column(String(200), nullable=False)
    due = Column(String(50))       # 예: "오늘 23:59 까지" (추후 DateTime으로 고도화 가능)
    urgency = Column(String(20))   # 예: "today", "soon", "normal"
    done = Column(Boolean, default=False)

    user = relationship("User", back_populates="assignments")

# --- 3. 수강 내역 (Enrollment - User와 Lecture를 잇는 다리) ---
class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    lecture_id = Column(String(50), ForeignKey("lectures.id"))
    
    # gradeCoursesData에 있던 성적 관련 추가 정보들
    total_class = Column(Integer, default=15)
    hw_total = Column(Integer, default=0)

    user = relationship("User", back_populates="enrollments")
    lecture = relationship("Lecture")

# --- 4. 강의 & 시간표 (이전에 작성한 부분) ---
class Lecture(Base):
    __tablename__ = "lectures"
    id = Column(String(50), primary_key=True, index=True)
    lecture_code = Column(String(20), nullable=False)
    section_code = Column(String(10), nullable=False)
    name = Column(String(100), nullable=False)
    professor = Column(String(50))
    room = Column(String(100))
    credit = Column(Integer)
    category = Column(String(50))
    college = Column(String(50))
    college_code = Column(String(20))
    division_code = Column(String(20))
    division_name = Column(String(100))
    major_code = Column(String(20))
    major_name = Column(String(100))
    department = Column(String(50))
    liberal_type = Column(String(50))
    liberal_area = Column(String(100))
    course_type = Column(String(50))
    target_grade = Column(Integer)
    target_audience = Column(String(100))
    note = Column(String(100))
    capacity = Column(Integer)
    enrolled = Column(Integer)
    success_rate = Column(Integer)
    color = Column(String(7))

    meetings = relationship("LectureMeeting", back_populates="lecture")

class LectureMeeting(Base):
    __tablename__ = "lecture_meetings"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    lecture_id = Column(String(50), ForeignKey("lectures.id"))
    day = Column(String(2))
    start_hour = Column(Integer)
    start_minute = Column(Integer)
    end_hour = Column(Integer)
    end_minute = Column(Integer)

    lecture = relationship("Lecture", back_populates="meetings")
