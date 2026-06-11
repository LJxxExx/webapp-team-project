"""
seed.py - 초기 테스트 데이터 시딩 모듈

개발 및 테스트 환경을 위한 초기 데이터를 데이터베이스에 삽입합니다.
서버 시작 시 main.py의 lifespan에서 호출됩니다.

생성되는 데이터:
    - 관리자 계정 (학번: 1234567, 비밀번호: admin)
    - 테스트 사용자 계정 (학번: 20220001, 비밀번호: 1234)
    - 테스트 과제 데이터 2개
"""

import json
import os
from database import SessionLocal
import models
from pwdlib import PasswordHash

# =============================================================================
# 비밀번호 해싱 설정
# =============================================================================
# pwdlib의 추천 알고리즘 사용 (현재 argon2id 또는 bcrypt)
# 평문 비밀번호를 절대 저장하지 않고, 해시값만 DB에 저장
pwd_context = PasswordHash.recommended()

# JSON 파일 경로 - 사용자별 시간표, 과제, 성적 데이터 저장
USERS_DATA_FILE = "users_data.json"


# =============================================================================
# 메인 시딩 함수
# =============================================================================
def seed_db():
    """
    데이터베이스에 초기 테스트 데이터를 삽입합니다.
    
    시딩 순서:
        1. 관리자 계정 생성 (없는 경우에만)
        2. 테스트 사용자 계정 생성 (없는 경우에만)
        3. 테스트 과제 데이터 생성
        4. JSON 파일에 초기 데이터 구조 생성
    
    중복 실행 방지:
        이미 데이터가 존재하면 시딩을 건너뛰어 데이터 중복을 방지합니다.
    
    Raises:
        Exception: DB 작업 실패 시 롤백 후 에러 메시지 출력
    """
    db = SessionLocal()
    try:
        # =====================================================================
        # 헬퍼 함수: JSON 파일에 사용자 초기 데이터 구조 생성
        # =====================================================================
        def ensure_json_data(student_id):
            """
            사용자의 JSON 데이터 구조가 없으면 생성합니다.
            
            Args:
                student_id: 학번
            
            JSON 구조:
                {
                    "student_id": {
                        "timetable": [],    # 시간표 데이터
                        "assignments": [],  # 과제 목록
                        "grades": {}        # 성적 정보
                    }
                }
            """
            # 파일이 없으면 빈 딕셔너리로 시작
            if not os.path.exists(USERS_DATA_FILE):
                data = {}
            else:
                with open(USERS_DATA_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
            
            # 해당 학번의 데이터가 없으면 초기 구조 생성
            if student_id not in data:
                data[student_id] = {
                    "timetable": [],
                    "assignments": [],
                    "grades": {}
                }
                with open(USERS_DATA_FILE, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)

        # =====================================================================
        # 1단계: 관리자 계정 시딩
        # =====================================================================
        admin_user = db.query(models.User).filter(
            models.User.student_id == "1234567"
        ).first()
        
        if not admin_user:
            print("관리자 계정을 시딩합니다...")
            
            # 비밀번호 해싱 (평문 "admin" → 해시값)
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
        
        # 관리자 JSON 데이터 구조 보장
        ensure_json_data("1234567")

        # =====================================================================
        # 2단계: 테스트 사용자 중복 확인
        # =====================================================================
        if db.query(models.User).filter(
            models.User.student_id == "20220001"
        ).first():
            print("이미 데이터가 존재합니다. 시딩을 건너뜁니다.")
            ensure_json_data("20220001")
            return

        print("비밀번호가 적용된 테스트 유저 시딩을 시작합니다...")

        # =====================================================================
        # 3단계: 테스트 사용자 생성
        # =====================================================================
        # 비밀번호 해싱 (평문 "1234" → 해시값)
        # 실제 운영에서는 프론트엔드에서 받은 비밀번호를 해싱
        hashed_pw = pwd_context.hash("1234") 

        test_user = models.User(
            student_id="20220001",
            name="현",
            email="20220001@university.ac.kr",
            department="컴퓨터공학과",
            hashed_password=hashed_pw
        )
        db.add(test_user)
        
        # flush(): commit 전에 DB에 밀어넣어 test_user.id 값을 미리 발급받음
        # 이후 Assignment 생성 시 user_id로 사용하기 위해 필요
        db.flush()
        
        # JSON 데이터 구조 생성
        ensure_json_data("20220001")

        # =====================================================================
        # 4단계: 테스트 과제 데이터 생성
        # =====================================================================
        assignments = [
            models.Assignment(
                user_id=test_user.id,
                title="JWT 보안 레포트 제출",
                due="오늘 23:59 까지",
                urgency="today",    # 긴급
                done=False
            ),
            models.Assignment(
                user_id=test_user.id,
                title="데이터베이스 암호화 복습",
                due="D-3",
                urgency="soon",     # 곧 마감
                done=False
            )
        ]
        db.add_all(assignments)

        # =====================================================================
        # 5단계: 트랜잭션 커밋
        # =====================================================================
        db.commit()
        
        # JSON 파일에도 초기 과제 데이터 시딩
        with open(USERS_DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        # 프론트엔드 AssignmentPage에서 사용하는 형식에 맞춰 데이터 구성
        data["20220001"]["assignments"] = [
            {
                "id": 1,
                "title": "JWT 보안 레포트 제출",
                "dueDate": "2026-06-01",
                "dueTime": "23:59",
                "priority": "긴급",
                "isCompleted": False
            },
            {
                "id": 2,
                "title": "데이터베이스 암호화 복습",
                "dueDate": "2026-06-04",
                "dueTime": "23:59",
                "priority": "높음",
                "isCompleted": False
            }
        ]
        
        with open(USERS_DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        print("모든 데이터가 성공적으로 DB에 저장되었습니다!")
        print("테스트 계정 - 학번: 20220001 / 비밀번호: 1234")

    except Exception as e:
        # 에러 발생 시 롤백하여 데이터 정합성 유지
        db.rollback()
        print(f"데이터 시딩 중 에러가 발생했습니다: {e}")
    finally:
        # 세션 종료 (커넥션 풀에 반환)
        db.close()


# =============================================================================
# 직접 실행 시 시딩 수행
# =============================================================================
if __name__ == "__main__":
    seed_db()
