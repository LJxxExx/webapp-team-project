import React, { useState, useMemo } from 'react'
import './GradeCalculator.css'
import { gradeCoursesData } from '../data'

const GRADE_TABLE = [
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

const LEVEL_COLOR = {
  safe:   { bg: '#EAF3DE', text: '#3B6D11', bar: '#639922' },
  warn:   { bg: '#FAEEDA', text: '#854F0B', bar: '#EF9F27' },
  danger: { bg: '#FCEBEB', text: '#A32D2D', bar: '#E24B4A' },
}
const LEVEL_LABEL = { safe: '안정', warn: '주의', danger: '위험' }

function scoreToGrade(score) {
  for (const row of GRADE_TABLE) {
    if (score >= row.minScore) return row
  }
  return GRADE_TABLE[GRADE_TABLE.length - 1]
}

function calcRisk(course) {
  const { totalClass, absent = 0, hwTotal, hwMiss = 0, exam = null } = course
  const attRate = Math.round(((totalClass - absent) / totalClass) * 100)
  const hwRate  = hwTotal === 0 ? 100 : Math.round(((hwTotal - hwMiss) / hwTotal) * 100)
  const examScore = exam !== null && exam !== '' ? Number(exam) : null
  let risk = 0
  if (attRate < 75) risk += 40; else if (attRate < 85) risk += 20; else risk += 5
  if (hwRate < 60)  risk += 30; else if (hwRate < 80) risk += 15
  if (examScore !== null) {
    if (examScore < 50) risk += 30; else if (examScore < 65) risk += 15
  } else { risk += 10 }
  risk = Math.min(risk, 100)
  const level = risk >= 50 ? 'danger' : risk >= 25 ? 'warn' : 'safe'
  const approxScore = Math.round(attRate * 0.3 + hwRate * 0.3 + (examScore !== null ? examScore : 60) * 0.4)
  const gradeInfo = scoreToGrade(approxScore)
  return { attRate, hwRate, risk, level, grade: gradeInfo.grade, gpa: gradeInfo.gpa, approxScore }
}

// lectureCatalog 강의를 gradeCoursesData 포맷으로 변환
function lectureToGradeCourse(lecture, index) {
  return {
    id: `timetable-${lecture.id}`,
    name: lecture.name,
    credit: lecture.credit ?? 3,
    professor: lecture.professor,
    totalClass: 15,
    hwTotal: 4,
  }
}

export default function GradeCalculator({ isLoggedIn, savedLectures }) {
  // savedLectures가 있으면 시간표 기반 강의 목록 사용, 없으면 기본 데이터 사용
  const baseCourses = useMemo(() => {
    if (savedLectures && savedLectures.length > 0) {
      return savedLectures.map(lectureToGradeCourse)
    }
    return gradeCoursesData
  }, [savedLectures])

  const [stats, setStats] = useState({})
  const [selectedId, setSelectedId] = useState(baseCourses[0]?.id)

  // baseCourses가 바뀌면 selectedId도 첫 번째로 초기화
  const prevBaseCourses = React.useRef(baseCourses)
  if (prevBaseCourses.current !== baseCourses) {
    prevBaseCourses.current = baseCourses
  }

  const effectiveSelectedId = baseCourses.find(c => c.id === selectedId)
    ? selectedId
    : baseCourses[0]?.id

  const courses = baseCourses.map(c => ({
    ...c,
    ...(stats[c.id] ?? { absent: 0, hwMiss: 0, exam: null }),
  }))

  const selected = courses.find(c => c.id === effectiveSelectedId) ?? courses[0]
  const { attRate, hwRate, risk, level, grade, gpa, approxScore } = calcRisk(selected)

  function updateStat(key, val) {
    setStats(prev => ({ ...prev, [effectiveSelectedId]: { ...(prev[effectiveSelectedId] ?? { absent: 0, hwMiss: 0, exam: null }), [key]: val } }))
  }

  if (!selected) {
    return (
      <div className={'grade-calc' + (!isLoggedIn ? ' gc-blurred' : '')}>
        {!isLoggedIn && (
          <div className="gc-blur-overlay"><span className="blur-label">'로그인이 필요합니다'</span></div>
        )}
        <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
          <p>시간표에 저장된 강의가 없습니다.</p>
          <p>메인 페이지에서 시간표를 저장하면 강의 목록이 표시됩니다.</p>
        </div>
      </div>
    )
  }

  const dangerCount = courses.filter(c => calcRisk(c).level === 'danger').length
  const avgRisk = Math.round(courses.reduce((s, c) => s + calcRisk(c).risk, 0) / courses.length)
  const totalCredits = courses.reduce((s, c) => s + c.credit, 0)

  return (
    <div className={'grade-calc' + (!isLoggedIn ? ' gc-blurred' : '')}>
      {!isLoggedIn && (
        <div className="gc-blur-overlay"><span className="blur-label">'로그인이 필요합니다'</span></div>
      )}

      {/* 요약 */}
      <div className="gc-summary">
        {[
          { label: '수강 과목', val: courses.length, unit: '과목' },
          { label: '총 학점',   val: totalCredits,   unit: '학점' },
          { label: '위험 과목', val: dangerCount,     unit: '과목', danger: dangerCount > 0 },
          { label: '평균 위험도', val: avgRisk,        unit: '점' },
        ].map(s => (
          <div key={s.label} className="gc-sum-card">
            <span className="gc-sum-label">{s.label}</span>
            <span className={'gc-sum-val' + (s.danger ? ' danger' : '')}>
              {s.val}<small>{s.unit}</small>
            </span>
          </div>
        ))}
      </div>

      <div className="gc-content">
        {/* 강의 목록 */}
        <div className="gc-list-col">
          <p className="gc-col-label">강의 목록 ({courses.length}개)</p>
          {courses.map(c => {
            const r = calcRisk(c)
            const col = LEVEL_COLOR[r.level]
            return (
              <div
                key={c.id}
                className={'gc-course-card' + (c.id === effectiveSelectedId ? ' selected' : '')}
                onClick={() => setSelectedId(c.id)}
              >
                <div className="gcc-top">
                  <div>
                    <p className="gcc-name">{c.name}</p>
                    <p className="gcc-credit">{c.credit}학점 · {c.professor}</p>
                  </div>
                  <div className="gcc-right">
                    <div className="gcc-grade">
                      <span className="gcc-grade-letter">{r.grade}</span>
                      <span className="gcc-grade-gpa">{r.gpa.toFixed(1)}</span>
                    </div>
                    <span className="badge" style={{ background: col.bg, color: col.text }}>
                      {LEVEL_LABEL[r.level]}
                    </span>
                  </div>
                </div>
                <div className="gcc-bars">
                  {[['출석률', r.attRate], ['과제', r.hwRate]].map(([lbl, pct]) => (
                    <div key={lbl} className="gcc-bar-row">
                      <span className="gcc-bar-label">{lbl}</span>
                      <div className="gcc-bar-track">
                        <div className="gcc-bar-fill" style={{ width: `${pct}%`, background: col.bar }} />
                      </div>
                      <span className="gcc-bar-pct">{pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* 상세 패널 */}
        <div className="gc-detail">
          <div className="gcd-header">
            <div>
              <h3 className="gcd-title">{selected.name}</h3>
              <p className="gcd-sub">{selected.credit}학점 · {selected.professor}</p>
            </div>
            <div className="gcd-grade-badge">
              <span className="gcd-grade">{grade}</span>
              <span className="gcd-gpa">{gpa.toFixed(1)}</span>
            </div>
          </div>

          <div className="gcd-grade-table">
            {GRADE_TABLE.map(row => (
              <div key={row.grade} className={'gcd-grade-cell' + (row.grade === grade ? ' active' : '')}>
                <span>{row.grade}</span>
                <span className="gcd-grade-gpa-small">{row.gpa.toFixed(1)}</span>
              </div>
            ))}
          </div>

          <div className="gcd-stats">
            {[
              ['출석률', `${attRate}%`],
              ['과제 제출률', `${hwRate}%`],
              ['예상 점수', `${approxScore}점`],
              ['위험도', `${risk}점`],
            ].map(([l, v]) => (
              <div key={l} className="gcd-stat">
                <span className="gcd-stat-label">{l}</span>
                <span className="gcd-stat-val">{v}</span>
              </div>
            ))}
          </div>

          <p className="gcd-section-label">실적 입력</p>
          <div className="gcd-inputs">
            {[
              { label: `결석 횟수 (총 ${selected.totalClass}회)`, key: 'absent',  max: selected.totalClass, val: (stats[effectiveSelectedId] ?? { absent: 0 }).absent },
              { label: `과제 미제출 (총 ${selected.hwTotal}개)`,  key: 'hwMiss',  max: selected.hwTotal,    val: (stats[effectiveSelectedId] ?? { hwMiss: 0 }).hwMiss },
              { label: '시험 점수 (0~100)',                         key: 'exam',    max: 100,                 val: (stats[effectiveSelectedId] ?? { exam: null }).exam ?? '' },
            ].map(({ label, key, max, val }) => (
              <div key={key} className="gcd-input-row">
                <label className="gcd-input-label">{label}</label>
                <input
                  type="number" min={0} max={max}
                  className="gcd-input-field"
                  value={val}
                  placeholder="미입력"
                  onChange={e => updateStat(key, e.target.value === '' ? null : Number(e.target.value))}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
