from database import SessionLocal
from models import User, Lecture, LectureMeeting, Enrollment, Assignment

def seed_db():
    db = SessionLocal()
    try:
        # 1. 중복 실행 방지: 이미 유저가 있으면 시딩하지 않음
        if db.query(User).first():
            print("🌱 이미 데이터가 존재합니다. 시딩을 건너뜁니다.")
            return

        print("🚀 데이터 시딩을 시작합니다...")

        # 2. 테스트 유저(학생) 생성
        test_user = User(student_id="20220001", name="현")
        db.add(test_user)
        db.flush()  # DB에 밀어넣어 test_user.id 값을 미리 발급받음

        # 3. 강의 데이터 생성 (data.js의 lectureCatalog 바탕)
        lectures_data = [
            {
                "id": "KMU-CSE3102-01", "lecture_code": "20923", "section_code": "01",
                "name": "데이타베이스", "professor": "김요한", "room": "공학1호관 1302",
                "credit": 3, "category": "전공", "college": "공과대학", "department": "컴퓨터공학과",
                "capacity": 45, "enrolled": 38, "success_rate": 84, "color": "#ECF9C8",
                "meetings": [
                    {"day": "월", "start_hour": 9, "start_minute": 0, "end_hour": 10, "end_minute": 15},
                    {"day": "수", "start_hour": 15, "start_minute": 0, "end_hour": 16, "end_minute": 15}
                ]
            },
            {
                "id": "KMU-CSE1402-01", "lecture_code": "21598", "section_code": "02",
                "name": "운영체제", "professor": "김요한", "room": "공학1호관 1402",
                "credit": 3, "category": "전공", "college": "공과대학", "department": "컴퓨터공학과",
                "capacity": 40, "enrolled": 36, "success_rate": 78, "color": "#D9F1E8",
                "meetings": [
                    {"day": "월", "start_hour": 15, "start_minute": 0, "end_hour": 16, "end_minute": 15},
                    {"day": "목", "start_hour": 9, "start_minute": 0, "end_hour": 10, "end_minute": 15}
                ]
            },
            {
                "id": "KMU-CSE2019-01", "lecture_code": "17735", "section_code": "02",
                "name": "컴퓨터네트워크", "professor": "사공상욱", "room": "공학1호관 2019",
                "credit": 3, "category": "전공", "college": "공과대학", "department": "컴퓨터공학과",
                "capacity": 40, "enrolled": 33, "success_rate": 72, "color": "#FDE3E3",
                "meetings": [
                    {"day": "월", "start_hour": 12, "start_minute": 0, "end_hour": 13, "end_minute": 15},
                    {"day": "수", "start_hour": 16, "start_minute": 30, "end_hour": 17, "end_minute": 45}
                ]
            }
        ]

        # 파이썬 반복문을 돌며 Lecture와 Meeting을 DB에 쌓음
        for l_data in lectures_data:
            new_lecture = Lecture(
                id=l_data["id"], lecture_code=l_data["lecture_code"], section_code=l_data["section_code"],
                name=l_data["name"], professor=l_data["professor"], room=l_data["room"],
                credit=l_data["credit"], category=l_data["category"], college=l_data["college"],
                department=l_data["department"], capacity=l_data["capacity"], enrolled=l_data["enrolled"],
                success_rate=l_data["success_rate"], color=l_data["color"]
            )
            db.add(new_lecture)
            
            # 강의 시간표(Meetings) 1:N 추가
            for m_data in l_data["meetings"]:
                meeting = LectureMeeting(
                    lecture_id=new_lecture.id, day=m_data["day"],
                    start_hour=m_data["start_hour"], start_minute=m_data["start_minute"],
                    end_hour=m_data["end_hour"], end_minute=m_data["end_minute"]
                )
                db.add(meeting)

            # 4. 수강내역(Enrollment) 추가 - 위 3과목을 모두 수강 중이라고 가정
            enrollment = Enrollment(user_id=test_user.id, lecture_id=new_lecture.id)
            db.add(enrollment)

        # 5. 과제(Assignment) 데이터 생성
        assignments = [
            Assignment(user_id=test_user.id, title="컴퓨터구조 레포트 제출", due="오늘 23:59 까지", urgency="today", done=False),
            Assignment(user_id=test_user.id, title="운영체제 프로세스 스케줄링 구현", due="D-3", urgency="soon", done=False),
            Assignment(user_id=test_user.id, title="데이터구조 알고리즘 문제 풀이", due="D-5", urgency="normal", done=False)
        ]
        db.add_all(assignments)

        # 6. 최종 저장 (Commit)
        db.commit()
        print("🎉 모든 데이터가 성공적으로 DB에 저장되었습니다!")

    except Exception as e:
        db.rollback()
        print(f"❌ 데이터 시딩 중 에러가 발생했습니다: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()