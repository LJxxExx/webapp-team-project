import json
import os
from database import SessionLocal
import models
from pwdlib import PasswordHash

# 비밀번호 암호화 도구 세팅
pwd_context = PasswordHash.recommended()

USERS_DATA_FILE = "users_data.json"

def seed_db():
    db = SessionLocal()
    try:
        # JSON 데이터 초기화 헬퍼
        def ensure_json_data(student_id):
            if not os.path.exists(USERS_DATA_FILE):
                data = {}
            else:
                with open(USERS_DATA_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
            
            if student_id not in data:
                data[student_id] = {
                    "timetable": [],
                    "assignments": [],
                    "grades": {}
                }
                with open(USERS_DATA_FILE, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)

        # admin 계정 확인
        admin_user = db.query(models.User).filter(models.User.student_id == "1234567").first()
        if not admin_user:
            print("관리자 계정을 시딩합니다...")
            hashed_admin_pw = pwd_context.hash("admin")
            admin_user = models.User(
                student_id="1234567",
                name="관리자",
                email="admin@univ.ac.kr",
                department="컴퓨터공학과",
                hashed_password=hashed_admin_pw
            )
            db.add(admin_user)
            db.commit()
            print("관리자 계정 시딩 완료")
        
        ensure_json_data("1234567")

        # 1. 중복 실행 방지
        if db.query(models.User).filter(models.User.student_id == "20220001").first():
            print("이미 데이터가 존재합니다. 시딩을 건너뜁니다.")
            ensure_json_data("20220001")
            return

        print("비밀번호가 적용된 테스트 유저 시딩을 시작합니다...")

        # 2. 비밀번호 암호화 (실제로는 프론트에서 받은 문자를 암호화함)
        hashed_pw = pwd_context.hash("1234") 

        # 3. 테스트 유저(현) 생성 - 암호화된 비밀번호 탑재!
        test_user = models.User(
            student_id="20220001",
            name="현",
            email="20220001@university.ac.kr",
            department="컴퓨터공학과",
            hashed_password=hashed_pw
        )
        db.add(test_user)
        db.flush()  # DB에 밀어넣어 test_user.id 값을 미리 발급받음
        
        ensure_json_data("20220001")

        # 4. 테스트용 과제(Assignment) 데이터 생성
        assignments = [
            models.Assignment(user_id=test_user.id, title="JWT 보안 레포트 제출", due="오늘 23:59 까지", urgency="today", done=False),
            models.Assignment(user_id=test_user.id, title="데이터베이스 암호화 복습", due="D-3", urgency="soon", done=False)
        ]
        db.add_all(assignments)

        # 5. 최종 저장 (Commit)
        db.commit()
        
        # JSON에도 초기 과제 시딩
        with open(USERS_DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        data["20220001"]["assignments"] = [
            { "id": 1, "title": "JWT 보안 레포트 제출", "dueDate": "2026-06-01", "dueTime": "23:59", "priority": "긴급", "isCompleted": False },
            { "id": 2, "title": "데이터베이스 암호화 복습", "dueDate": "2026-06-04", "dueTime": "23:59", "priority": "높음", "isCompleted": False }
        ]
        with open(USERS_DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        print("모든 데이터가 성공적으로 DB에 저장되었습니다! (테스트 계정 - 학번: 20220001 / 비밀번호: 1234)")

    except Exception as e:
        db.rollback()
        print(f"데이터 시딩 중 에러가 발생했습니다: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()