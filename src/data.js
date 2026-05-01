// ── 시간표 데이터 ──
export const timetableData = [
  { id: 1, name: '운영체제',    day: '화', startHour: 9,  endHour: 11, color: '#BFDBFE' },
  { id: 2, name: '운영체제',    day: '목', startHour: 9,  endHour: 11, color: '#BFDBFE' },
  { id: 3, name: '컴퓨터구조',  day: '월', startHour: 11, endHour: 13, color: '#BBF7D0' },
  { id: 4, name: '컴퓨터구조',  day: '수', startHour: 11, endHour: 13, color: '#BBF7D0' },
  { id: 5, name: '데이터구조',  day: '화', startHour: 14, endHour: 16, color: '#FDE68A' },
  { id: 6, name: '데이터구조',  day: '목', startHour: 14, endHour: 16, color: '#FDE68A' },
  { id: 7, name: '알고리즘특강', day: '금', startHour: 16, endHour: 18, color: '#FECACA' },
]

// ── 과제 데이터 ──
export const assignmentsData = [
  { id: 1, title: '컴퓨터구조 레포트 제출',        due: '오늘 23:59 까지', urgency: 'today',  done: false },
  { id: 2, title: '운영체제 프로세스 스케줄링 구현', due: 'D-3',            urgency: 'soon',   done: false },
  { id: 3, title: '데이터구조 알고리즘 문제 풀이',   due: 'D-5',            urgency: 'normal', done: false },
]

// ── 학점 계산기용 과목 ──
export const gradeCoursesData = [
  { id: 'crs-001', name: '웹어플리케이션구축', credit: 3, professor: '김교수', totalClass: 15, hwTotal: 5 },
  { id: 'crs-002', name: '데이터구조',         credit: 3, professor: '이교수', totalClass: 14, hwTotal: 4 },
  { id: 'crs-003', name: '영어회화',           credit: 2, professor: '박교수', totalClass: 12, hwTotal: 3 },
  { id: 'crs-004', name: '선형대수학',         credit: 3, professor: '최교수', totalClass: 13, hwTotal: 6 },
  { id: 'crs-005', name: '운영체제',           credit: 3, professor: '정교수', totalClass: 15, hwTotal: 4 },
]

// ── 수강신청 과목 풀 ──
export const coursePool = [
  { id: 'p001', name: '인공지능개론',   credit: 3, professor: '강교수', quota: 40, enrolled: 38, time: '월/수 10:00~11:30' },
  { id: 'p002', name: '소프트웨어공학', credit: 3, professor: '윤교수', quota: 35, enrolled: 20, time: '화/목 09:00~10:30' },
  { id: 'p003', name: '컴퓨터네트워크', credit: 3, professor: '임교수', quota: 30, enrolled: 30, time: '월/수 14:00~15:30' },
  { id: 'p004', name: '모바일프로그래밍', credit: 3, professor: '신교수', quota: 25, enrolled: 10, time: '화/목 13:00~14:30' },
  { id: 'p005', name: '데이터베이스',    credit: 3, professor: '조교수', quota: 40, enrolled: 35, time: '금 09:00~12:00' },
]
