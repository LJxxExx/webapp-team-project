import json
from database import SessionLocal
import models


def apply_lecture_fields(lecture, item):
    lecture.lecture_code = item['lectureCode']
    lecture.section_code = item['sectionCode']
    lecture.name = item['name']
    lecture.professor = item.get('professor', '')
    lecture.room = item.get('room', '')
    lecture.credit = item['credit']
    lecture.category = item['category']
    lecture.college = item.get('college', '')
    lecture.college_code = item.get('collegeCode', '')
    lecture.division_code = item.get('divisionCode', '')
    lecture.division_name = item.get('divisionName', '')
    lecture.major_code = item.get('majorCode', '')
    lecture.major_name = item.get('majorName', '')
    lecture.department = item.get('department', '')
    lecture.liberal_type = item.get('liberalType', '')
    lecture.liberal_area = item.get('liberalArea', '')
    lecture.course_type = item.get('courseType', '')
    lecture.target_grade = item.get('targetGrade', 0)
    lecture.target_audience = item.get('targetAudience', '')
    lecture.note = item.get('note', '')
    lecture.capacity = item.get('capacity', 40)
    lecture.enrolled = item.get('enrolled', 0)
    lecture.success_rate = item.get('successRate', 0)
    lecture.color = item.get('color', '#FFFFFF')


def replace_meetings(db, lecture_id, meetings):
    db.query(models.LectureMeeting).filter(models.LectureMeeting.lecture_id == lecture_id).delete()

    for meeting in meetings:
        db.add(models.LectureMeeting(
            lecture_id=lecture_id,
            day=meeting['day'],
            start_hour=meeting['startHour'],
            start_minute=meeting.get('startMinute', 0),
            end_hour=meeting['endHour'],
            end_minute=meeting.get('endMinute', 0),
        ))


def remove_stale_lectures(db, valid_ids):
    stale_lectures = db.query(models.Lecture).filter(~models.Lecture.id.in_(valid_ids)).all()

    for lecture in stale_lectures:
        db.query(models.Enrollment).filter(models.Enrollment.lecture_id == lecture.id).delete()
        db.query(models.LectureMeeting).filter(models.LectureMeeting.lecture_id == lecture.id).delete()
        db.delete(lecture)

    return len(stale_lectures)


def insert_lectures():
    db = SessionLocal()
    try:
        with open('lectures.json', 'r', encoding='utf-8') as f:
            data = json.load(f)

        print(f"Read {len(data)} lecture records. Syncing database...")

        valid_ids = {item['id'] for item in data}
        removed_count = remove_stale_lectures(db, valid_ids)

        inserted_count = 0
        updated_count = 0
        for item in data:
            lecture = db.query(models.Lecture).filter(models.Lecture.id == item['id']).first()
            if lecture:
                updated_count += 1
            else:
                lecture = models.Lecture(id=item['id'])
                db.add(lecture)
                inserted_count += 1

            apply_lecture_fields(lecture, item)
            replace_meetings(db, lecture.id, item.get('meetings', []))

        db.commit()
        print(f"Lecture sync complete: inserted {inserted_count}, updated {updated_count}, removed {removed_count}")

    except Exception as e:
        db.rollback()
        print(f"Lecture sync failed: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    insert_lectures()
