"""
bulk_insert.py - 강의 데이터 일괄 동기화 모듈

lectures.json 파일에서 강의 데이터를 읽어 데이터베이스와 동기화합니다.
서버 시작 시 main.py의 lifespan에서 호출되어 최신 강의 목록을 유지합니다.

주요 기능:
    - JSON 파일의 강의 데이터를 DB에 삽입/업데이트
    - JSON에 없는 오래된 강의 데이터 자동 삭제
    - 강의 시간(Meeting) 정보 동기화
"""

import json
from database import SessionLocal
import models


# =============================================================================
# 강의 필드 매핑 함수
# =============================================================================
def apply_lecture_fields(lecture, item):
    """
    JSON 데이터의 필드를 Lecture 모델 객체에 매핑합니다.
    
    Args:
        lecture: models.Lecture 인스턴스 (신규 생성 또는 기존 조회)
        item: lectures.json에서 읽어온 딕셔너리 데이터
    
    Note:
        - 필수 필드(lectureCode, sectionCode, name, credit, category)는 직접 할당
        - 선택 필드는 .get()으로 기본값과 함께 안전하게 처리
    """
    # 필수 필드 - 강의 식별 정보
    lecture.lecture_code = item['lectureCode']
    lecture.section_code = item['sectionCode']
    lecture.name = item['name']
    lecture.credit = item['credit']
    lecture.category = item['category']
    
    # 선택 필드 - 기본값으로 안전하게 처리
    lecture.professor = item.get('professor', '')
    lecture.room = item.get('room', '')
    
    # 개설 학과/단과대 정보
    lecture.college = item.get('college', '')
    lecture.college_code = item.get('collegeCode', '')
    lecture.division_code = item.get('divisionCode', '')
    lecture.division_name = item.get('divisionName', '')
    lecture.major_code = item.get('majorCode', '')
    lecture.major_name = item.get('majorName', '')
    lecture.department = item.get('department', '')
    
    # 교양 관련 정보
    lecture.liberal_type = item.get('liberalType', '')
    lecture.liberal_area = item.get('liberalArea', '')
    
    # 수강 대상 정보
    lecture.course_type = item.get('courseType', '')
    lecture.target_grade = item.get('targetGrade', 0)
    lecture.target_audience = item.get('targetAudience', '')
    lecture.note = item.get('note', '')
    
    # 수강 신청 관련 정보
    lecture.capacity = item.get('capacity', 40)      # 기본 정원 40명
    lecture.enrolled = item.get('enrolled', 0)       # 현재 수강 인원
    lecture.success_rate = item.get('successRate', 0)  # 성공률 (시뮬레이션용)
    
    # UI 표시용
    lecture.color = item.get('color', '#FFFFFF')


# =============================================================================
# 강의 시간(Meeting) 동기화 함수
# =============================================================================
def replace_meetings(db, lecture_id, meetings):
    """
    특정 강의의 수업 시간 데이터를 갱신합니다.
    
    기존 Meeting 데이터를 모두 삭제하고 새로운 데이터로 교체하는 방식을 사용합니다.
    이렇게 하면 Meeting 개수가 변경되어도 안전하게 동기화됩니다.
    
    Args:
        db: SQLAlchemy 세션 객체
        lecture_id: 강의 ID
        meetings: 새로운 수업 시간 리스트 (JSON에서 읽어온 데이터)
    
    Example:
        meetings = [
            {"day": "월", "startHour": 10, "endHour": 12},
            {"day": "수", "startHour": 10, "endHour": 12}
        ]
    """
    # 1단계: 기존 Meeting 데이터 전체 삭제
    db.query(models.LectureMeeting).filter(
        models.LectureMeeting.lecture_id == lecture_id
    ).delete()

    # 2단계: 새로운 Meeting 데이터 삽입
    for meeting in meetings:
        db.add(models.LectureMeeting(
            lecture_id=lecture_id,
            day=meeting['day'],
            start_hour=meeting['startHour'],
            start_minute=meeting.get('startMinute', 0),  # 분은 선택적
            end_hour=meeting['endHour'],
            end_minute=meeting.get('endMinute', 0),
        ))


# =============================================================================
# 오래된 강의 데이터 정리 함수
# =============================================================================
def remove_stale_lectures(db, valid_ids):
    """
    JSON 파일에 더 이상 존재하지 않는 강의를 DB에서 삭제합니다.
    
    강의가 삭제될 때 관련된 수강 내역(Enrollment)과 수업 시간(Meeting)도 함께 삭제하여
    데이터 정합성을 유지합니다.
    
    Args:
        db: SQLAlchemy 세션 객체
        valid_ids: JSON 파일에 존재하는 유효한 강의 ID 집합(set)
    
    Returns:
        int: 삭제된 강의 수
    
    Note:
        CASCADE 삭제를 수동으로 처리하여 외래키 제약 조건 위반을 방지합니다.
    """
    # JSON에 없는 강의 조회 (~models.Lecture.id.in_: NOT IN 조건)
    stale_lectures = db.query(models.Lecture).filter(
        ~models.Lecture.id.in_(valid_ids)
    ).all()

    # 각 강의에 대해 연관 데이터 먼저 삭제 (외래키 제약 조건 준수)
    for lecture in stale_lectures:
        # 해당 강의의 수강 내역 삭제
        db.query(models.Enrollment).filter(
            models.Enrollment.lecture_id == lecture.id
        ).delete()
        
        # 해당 강의의 수업 시간 삭제
        db.query(models.LectureMeeting).filter(
            models.LectureMeeting.lecture_id == lecture.id
        ).delete()
        
        # 강의 본체 삭제
        db.delete(lecture)

    return len(stale_lectures)


# =============================================================================
# 메인 동기화 함수 (진입점)
# =============================================================================
def insert_lectures():
    """
    lectures.json 파일을 읽어 데이터베이스와 동기화합니다.
    
    동기화 로직:
        1. JSON 파일에서 강의 데이터 로드
        2. DB에만 존재하는 오래된 강의 삭제
        3. 각 강의에 대해 INSERT 또는 UPDATE 수행
        4. 강의 시간(Meeting) 데이터 갱신
        5. 트랜잭션 커밋
    
    실행 시점:
        - 서버 시작 시 main.py lifespan에서 자동 호출
        - 직접 실행: python bulk_insert.py
    
    Raises:
        Exception: JSON 파일 읽기 실패 또는 DB 작업 실패 시 롤백 후 에러 출력
    """
    db = SessionLocal()
    try:
        # 1단계: JSON 파일 로드
        with open('lectures.json', 'r', encoding='utf-8') as f:
            data = json.load(f)

        print(f"Read {len(data)} lecture records. Syncing database...")

        # 2단계: 유효한 강의 ID 집합 생성 및 오래된 데이터 정리
        valid_ids = {item['id'] for item in data}
        removed_count = remove_stale_lectures(db, valid_ids)

        # 3단계: 각 강의 데이터 동기화 (UPSERT 패턴)
        inserted_count = 0
        updated_count = 0
        
        for item in data:
            # 기존 강의 조회 시도
            lecture = db.query(models.Lecture).filter(
                models.Lecture.id == item['id']
            ).first()
            
            if lecture:
                # 기존 강의 존재 → UPDATE
                updated_count += 1
            else:
                # 신규 강의 → INSERT
                lecture = models.Lecture(id=item['id'])
                db.add(lecture)
                inserted_count += 1

            # 필드 값 매핑 (INSERT/UPDATE 공통)
            apply_lecture_fields(lecture, item)
            
            # 수업 시간 데이터 갱신
            replace_meetings(db, lecture.id, item.get('meetings', []))

        # 4단계: 트랜잭션 커밋
        db.commit()
        print(f"Lecture sync complete: inserted {inserted_count}, updated {updated_count}, removed {removed_count}")

    except Exception as e:
        # 에러 발생 시 롤백하여 데이터 정합성 유지
        db.rollback()
        print(f"Lecture sync failed: {e}")
    finally:
        # 세션 종료 (커넥션 풀에 반환)
        db.close()


# =============================================================================
# 직접 실행 시 동기화 수행
# =============================================================================
if __name__ == "__main__":
    insert_lectures()
