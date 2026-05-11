from database import SessionLocal
import models
from pwdlib import PasswordHash

# 비밀번호 암호화 도구 세팅
pwd_context = PasswordHash.recommended()

def seed_db():
    db = SessionLocal()
    try:
        # 1. 중복 실행 방지
        if db.query(models.User).first():
            print("🌱 이미 데이터가 존재합니다. 시딩을 건너뜁니다.")
            return

        print("🚀 비밀번호가 적용된 테스트 유저 시딩을 시작합니다...")

        # 2. 비밀번호 암호화 (실제로는 프론트에서 받은 문자를 암호화함)
        hashed_pw = pwd_context.hash("1234") 

        # 3. 테스트 유저(현) 생성 - 암호화된 비밀번호 탑재!
        test_user = models.User(student_id="20220001", name="현", hashed_password=hashed_pw)
        db.add(test_user)
        db.flush()  # DB에 밀어넣어 test_user.id 값을 미리 발급받음

        # 4. 테스트용 과제(Assignment) 데이터 생성
        assignments = [
            models.Assignment(user_id=test_user.id, title="JWT 보안 레포트 제출", due="오늘 23:59 까지", urgency="today", done=False),
            models.Assignment(user_id=test_user.id, title="데이터베이스 암호화 복습", due="D-3", urgency="soon", done=False)
        ]
        db.add_all(assignments)

        # 5. 최종 저장 (Commit)
        db.commit()
        print("🎉 모든 데이터가 성공적으로 DB에 저장되었습니다! (테스트 계정 - 학번: 20220001 / 비밀번호: 1234)")

    except Exception as e:
        db.rollback()
        print(f"❌ 데이터 시딩 중 에러가 발생했습니다: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()