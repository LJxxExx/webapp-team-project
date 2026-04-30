/**
 * 시간표 팀원이 관리하는 강의 원본 데이터
 * 실제 연동 시 이 파일(또는 해당 Zustand store)을 import해서 사용합니다.
 *
 * ─ 팀원 작업 영역 ─
 * 강의명, 학점, 교수명, 요일/시간, 강의실 등 시간표 정보를 여기서 관리합니다.
 */

export const timetableCourses = [
  {
    id: 'crs-001',
    name: '웹어플리케이션구축',
    credit: 3,
    professor: '김교수',
    schedule: [{ day: '월', start: '09:00', end: '10:30' }, { day: '수', start: '09:00', end: '10:30' }],
    room: '공학관 301',
    totalClass: 15,   // 전체 수업 횟수 (주차 수)
    hwTotal: 5,       // 총 과제 수
  },
  {
    id: 'crs-002',
    name: '데이터구조',
    credit: 3,
    professor: '이교수',
    schedule: [{ day: '화', start: '13:00', end: '14:30' }, { day: '목', start: '13:00', end: '14:30' }],
    room: '공학관 201',
    totalClass: 14,
    hwTotal: 4,
  },
  {
    id: 'crs-003',
    name: '영어회화',
    credit: 2,
    professor: '박교수',
    schedule: [{ day: '수', start: '11:00', end: '12:00' }],
    room: '인문관 102',
    totalClass: 12,
    hwTotal: 3,
  },
  {
    id: 'crs-004',
    name: '선형대수학',
    credit: 3,
    professor: '최교수',
    schedule: [{ day: '월', start: '14:00', end: '15:30' }, { day: '금', start: '14:00', end: '15:30' }],
    room: '수리관 401',
    totalClass: 13,
    hwTotal: 6,
  },
  {
    id: 'crs-005',
    name: '운영체제',
    credit: 3,
    professor: '정교수',
    schedule: [{ day: '화', start: '09:00', end: '10:30' }],
    room: '공학관 402',
    totalClass: 15,
    hwTotal: 4,
  },
]
