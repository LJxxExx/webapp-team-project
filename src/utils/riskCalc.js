/**
 * 수업별 학점 위험도 계산 유틸리티
 *
 * [성적 체계]
 * A+ 4.5 / A 4.0 / B+ 3.5 / B 3.0 / C+ 2.5 / C 2.0 / D+ 1.5 / D 1.0 / F 재수강
 */

export const GRADE_TABLE = [
  { grade: 'A+', gpa: 4.5, minScore: 95 },
  { grade: 'A',  gpa: 4.0, minScore: 90 },
  { grade: 'B+', gpa: 3.5, minScore: 85 },
  { grade: 'B',  gpa: 3.0, minScore: 80 },
  { grade: 'C+', gpa: 2.5, minScore: 75 },
  { grade: 'C',  gpa: 2.0, minScore: 70 },
  { grade: 'D+', gpa: 1.5, minScore: 65 },
  { grade: 'D',  gpa: 1.0, minScore: 60 },
  { grade: 'F',  gpa: 0.0, minScore: 0  },
]

export function scoreToGrade(score) {
  for (const row of GRADE_TABLE) {
    if (score >= row.minScore) return row
  }
  return GRADE_TABLE[GRADE_TABLE.length - 1]
}

export function calcRisk(course) {
  const { totalClass, absent, hwTotal, hwMiss, exam } = course

  const attRate   = Math.round(((totalClass - absent) / totalClass) * 100)
  const hwRate    = hwTotal === 0 ? 100 : Math.round(((hwTotal - hwMiss) / hwTotal) * 100)
  const examScore = exam !== null && exam !== '' ? Number(exam) : null

  let risk = 0
  if (attRate < 75)      risk += 40
  else if (attRate < 85) risk += 20
  else                   risk += 5
  if (hwRate < 60)       risk += 30
  else if (hwRate < 80)  risk += 15
  if (examScore !== null) {
    if (examScore < 50)      risk += 30
    else if (examScore < 65) risk += 15
  } else {
    risk += 10
  }
  risk = Math.min(risk, 100)

  const level = risk >= 50 ? 'danger' : risk >= 25 ? 'warn' : 'safe'

  const approxScore = Math.round(
    attRate * 0.3 + hwRate * 0.3 + (examScore !== null ? examScore : 60) * 0.4
  )
  const gradeInfo = scoreToGrade(approxScore)

  const alerts = []
  const absenceLimit = Math.floor(totalClass / 4)
  const absenceWarn  = Math.floor(totalClass / 6)

  if (absent >= absenceLimit) {
    alerts.push({ type: 'danger', msg: `결석 ${absent}회 — 추가 결석 시 F 처리 위험 (한도: ${absenceLimit}회)` })
  } else if (absent >= absenceWarn) {
    alerts.push({ type: 'warn', msg: `결석 ${absent}회 — 주의 (경고 기준 ${absenceWarn}회 도달)` })
  }
  if (hwMiss >= 2) {
    alerts.push({ type: 'danger', msg: `과제 미제출 ${hwMiss}개 누적 — 성적 하락 위험` })
  } else if (hwMiss === 1) {
    alerts.push({ type: 'warn', msg: '과제 미제출 1개 있습니다' })
  }
  if (examScore !== null && examScore < 60) {
    alerts.push({ type: 'danger', msg: `시험 점수 ${examScore}점 — D 이하 위험` })
  }
  if (gradeInfo.grade === 'F') {
    alerts.push({ type: 'danger', msg: '현재 예상 성적 F — 재수강 필요 수준입니다' })
  }
  if (alerts.length === 0) {
    alerts.push({ type: 'info', msg: '현재 안정적으로 관리되고 있습니다' })
  }

  return { attRate, hwRate, risk, level, grade: gradeInfo.grade, gpa: gradeInfo.gpa, approxScore, alerts }
}

export const LEVEL_LABEL = { safe: '안정', warn: '주의', danger: '위험' }
export const LEVEL_COLOR = {
  safe:   { bg: '#EAF3DE', text: '#3B6D11', bar: '#639922' },
  warn:   { bg: '#FAEEDA', text: '#854F0B', bar: '#EF9F27' },
  danger: { bg: '#FCEBEB', text: '#A32D2D', bar: '#E24B4A' },
}
