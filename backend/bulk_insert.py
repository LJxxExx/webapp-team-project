import json
from database import SessionLocal
import models

def run_bulk_insert():
    db = SessionLocal()
    try:
        # 1. JSON 파일 읽어오기
        with open('lectures.json', 'r', encoding='utf-8') as f:
            data = json.load(f)

        print(f"🚀 총 {len(data)}개의 강의 데이터를 읽었습니다. DB 저장을 시작합니다...")

        inserted_count = 0
        for item in data:
            # 2. 중복 방지: 이미 DB에 있는 과목은 건너뜀
            existing = db.query(models.Lecture).filter(models.Lecture.id == item['id']).first()
            if existing:
                continue

            # 3. 강의(Lecture) 뼈대 만들기
            new_lecture = models.Lecture(
                id=item['id'],
                lecture_code=item['lectureCode'],
                section_code=item['sectionCode'],
                name=item['name'],
                professor=item.get('professor', ''),
                room=item.get('room', ''),
                credit=item['credit'],
                category=item['category'],
                college=item.get('college', ''),
                department=item.get('department', ''),
                capacity=item.get('capacity', 40),
                enrolled=item.get('enrolled', 0),
                success_rate=item.get('successRate', 0),
                color=item.get('color', '#FFFFFF')
            )
            db.add(new_lecture)

            # 4. 해당 강의의 수업 시간(Meetings) 1:N 연결
            for meeting in item.get('meetings', []):
                new_meeting = models.LectureMeeting(
                    lecture_id=new_lecture.id,
                    day=meeting['day'],
                    start_hour=meeting['startHour'],
                    start_minute=meeting.get('startMinute', 0),
                    end_hour=meeting['endHour'],
                    end_minute=meeting.get('endMinute', 0)
                )
                db.add(new_meeting)

            inserted_count += 1

        # 5. DB에 최종 반영(Commit)
        db.commit()
        print(f"🎉 대성공! {inserted_count}개의 새로운 강의가 DB에 안전하게 보관되었습니다!")

    except Exception as e:
        db.rollback()
        print(f"❌ 에러 발생: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_bulk_insert()