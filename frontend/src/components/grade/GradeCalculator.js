import React, { useState, useMemo, useEffect, useCallback } from 'react'
import LoginRequiredSection from '../common/LoginRequiredSection'
import './GradeCalculator.css'

// ─────────────────────────────────────────────
// 상수 정의
// ─────────────────────────────────────────────

const DEFAULT_TOTAL_CLASS = 15
const DEFAULT_EXAM_SCORE  = 60

/** 위험도 레벨 임계값 */
const RISK_THRESHOLD = { DANGER: 50, WARN: 25 }

/** 출석률 위험 임계값 (75% 미만 → 강제 F 위험) */
const ATT_THRESHOLD = { CRITICAL: 75, WARN: 85 }

/** 과제 제출률 위험 임계값 */
const HW_THRESHOLD = { CRITICAL: 60, WARN: 80 }

/** 시험 점수 위험 임계값 */
const EXAM_THRESHOLD = { CRITICAL: 50, WARN: 65 }

/**
 * 과목별 기본 가중치 (%)
 * 사용자가 상세 패널에서 과목마다 직접 수정 가능.
 * 출석 + 과제 + 시험(중간+기말) 합계 = 100
 */
const DEFAULT_WEIGHT = { att: 30, hw: 30, mid: 20, final: 20 }

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



// ─────────────────────────────────────────────
// 순수 함수
// ─────────────────────────────────────────────

function scoreToGrade(score) {
  for (const row of GRADE_TABLE) {
    if (score >= row.minScore) return row
  }
  return GRADE_TABLE[GRADE_TABLE.length - 1]
}

/**
 * 과목별 위험도 및 예상 학점 계산
 * @param {object} course  - 과목 데이터 (absent, hwRate, midExam, finalExam, weight)
 *
 * weight: { att, hw, mid, final } (각각 %, 합계 100)
 * 시험 점수는 중간(mid) + 기말(final)로 분리되어 각각 가중 적용.
 */
function calcRisk(course) {
  const {
    totalClass  = DEFAULT_TOTAL_CLASS,
    absent      = 0,
    hwRate: hwRateOverride = null,
    midExam     = null,   // 중간고사 점수 (0~100 | null)
    finalExam   = null,   // 기말고사 점수 (0~100 | null)
    weight      = DEFAULT_WEIGHT,
  } = course

  // 각 가중치를 0~1 비율로 변환 (합계 100 보정)
  const total = (weight.att + weight.hw + weight.mid + weight.final) || 100
  const w = {
    att:   weight.att   / total,
    hw:    weight.hw    / total,
    mid:   weight.mid   / total,
    final: weight.final / total,
  }

  const attRate   = Math.round(((totalClass - absent) / totalClass) * 100)
  const hwRate    = hwRateOverride !== null ? hwRateOverride : 100
  const midScore  = midExam   !== null && midExam   !== '' ? Number(midExam)   : null
  const finScore  = finalExam !== null && finalExam !== '' ? Number(finalExam) : null

  // 시험 가중 평균 (입력된 시험만 사용, 미입력은 DEFAULT_EXAM_SCORE 가정)
  // 중간·기말 둘 다 미입력이면 단순 DEFAULT 사용
  const examWeightedScore = (() => {
    const midW  = w.mid   / (w.mid + w.final)   // 시험 안에서 중간 비율
    const finW  = w.final / (w.mid + w.final)   // 시험 안에서 기말 비율
    const m = midScore !== null ? midScore : DEFAULT_EXAM_SCORE
    const f = finScore !== null ? finScore : DEFAULT_EXAM_SCORE
    return m * midW + f * finW
  })()

  // ── 위험 점수 산출 ──
  let risk = 0

  // 출석: 75% 미만 강제 F 위험 → +40 / 85% 미만 → +20 / 이상 → +5
  if      (attRate < ATT_THRESHOLD.CRITICAL) risk += 40
  else if (attRate < ATT_THRESHOLD.WARN)     risk += 20
  else                                        risk += 5

  // 과제: 60% 미만 → +30 / 80% 미만 → +15
  if      (hwRate < HW_THRESHOLD.CRITICAL) risk += 30
  else if (hwRate < HW_THRESHOLD.WARN)     risk += 15

  // 시험(중간): 미입력 → +5 / 50점 미만 → +15 / 65점 미만 → +8
  if (midScore !== null) {
    if      (midScore < EXAM_THRESHOLD.CRITICAL) risk += 15
    else if (midScore < EXAM_THRESHOLD.WARN)     risk += 8
  } else { risk += 5 }

  // 시험(기말): 미입력 → +5 / 50점 미만 → +15 / 65점 미만 → +8
  if (finScore !== null) {
    if      (finScore < EXAM_THRESHOLD.CRITICAL) risk += 15
    else if (finScore < EXAM_THRESHOLD.WARN)     risk += 8
  } else { risk += 5 }

  risk = Math.min(risk, 100)

  const level = risk >= RISK_THRESHOLD.DANGER ? 'danger'
              : risk >= RISK_THRESHOLD.WARN   ? 'warn'
              : 'safe'

  // 예상 점수: 가중치 반영
  const approxScore = Math.round(
    attRate           * w.att +
    hwRate            * w.hw  +
    examWeightedScore * (w.mid + w.final)
  )

  const gradeInfo = scoreToGrade(approxScore)
  return {
    attRate, hwRate, midScore, finScore,
    examWeightedScore: Math.round(examWeightedScore),
    risk, level,
    grade: gradeInfo.grade, gpa: gradeInfo.gpa, approxScore,
  }
}

function lectureToGradeCourse(lecture) {
  return {
    id:         `timetable-${lecture.id}`,
    name:       lecture.name,
    credit:     lecture.credit ?? 3,
    professor:  lecture.professor,
    totalClass: DEFAULT_TOTAL_CLASS,
  }
}

// 가중치 합계가 100인지 확인
function weightSum(w) {
  return (Number(w.att) || 0) + (Number(w.hw) || 0) + (Number(w.mid) || 0) + (Number(w.final) || 0)
}

export default function GradeCalculator({ isLoggedIn, savedLectures, assignments = [], grades, setGrades }) {

  const baseCourses = useMemo(() => {
    if (savedLectures && savedLectures.length > 0) {
      return savedLectures.map(lectureToGradeCourse)
    }
    return []
  }, [savedLectures])

  const hwRateByCourseName = useMemo(() => {
    const map = {}
    baseCourses.forEach(course => {
      const related = assignments.filter(
        a => a.subject && a.subject.trim() === course.name.trim()
      )
      if (related.length === 0) {
        map[course.id] = null
      } else {
        const done = related.filter(a => a.isCompleted).length
        map[course.id] = Math.round((done / related.length) * 100)
      }
    })
    return map
  }, [baseCourses, assignments])

  // stats: 과목 id → { absent, midExam, finalExam, weight }
  const stats = grades || {}
  const setStats = setGrades

  const [selectedId, setSelectedId] = useState(() => baseCourses[0]?.id)

  useEffect(() => {
    setSelectedId(baseCourses[0]?.id)
  }, [baseCourses])

  const [inputError, setInputError]   = useState({})
  const [weightError, setWeightError] = useState(false)

  const effectiveSelectedId = baseCourses.find(c => c.id === selectedId)
    ? selectedId : baseCourses[0]?.id

  const courses = useMemo(() => baseCourses.map(c => ({
    ...c,
    absent:     stats[c.id]?.absent    ?? 0,
    midExam:    stats[c.id]?.midExam   ?? null,
    finalExam:  stats[c.id]?.finalExam ?? null,
    weight:     stats[c.id]?.weight    ?? { ...DEFAULT_WEIGHT },
    hwRate:     hwRateByCourseName[c.id],
  })), [baseCourses, stats, hwRateByCourseName])

  const courseRisks = useMemo(() => {
    const map = {}
    courses.forEach(c => { map[c.id] = calcRisk(c) })
    return map
  }, [courses])

  const { dangerCount, avgRisk, totalCredits } = useMemo(() => ({
    dangerCount:  courses.filter(c => courseRisks[c.id]?.level === 'danger').length,
    avgRisk:      Math.round(courses.reduce((s, c) => s + (courseRisks[c.id]?.risk ?? 0), 0) / (courses.length || 1)),
    totalCredits: courses.reduce((s, c) => s + c.credit, 0),
  }), [courses, courseRisks])

  const selected = courses.find(c => c.id === effectiveSelectedId) ?? courses[0]

  // 숫자 입력 핸들러 (결석·시험)
  const handleInput = useCallback((key, rawVal, max) => {
    if (rawVal === '') {
      setStats(prev => ({
        ...prev,
        [effectiveSelectedId]: { ...(prev[effectiveSelectedId] ?? {}), [key]: null },
      }))
      setInputError(prev => ({ ...prev, [key]: null }))
      return
    }
    const num = Number(rawVal)
    if (num < 0 || num > max) {
      setInputError(prev => ({ ...prev, [key]: `0 ~ ${max} 사이 값을 입력하세요` }))
      return
    }
    setInputError(prev => ({ ...prev, [key]: null }))
    setStats(prev => ({
      ...prev,
      [effectiveSelectedId]: { ...(prev[effectiveSelectedId] ?? {}), [key]: num },
    }))
  }, [effectiveSelectedId])

  // 가중치 입력 핸들러
  const handleWeight = useCallback((key, rawVal) => {
    const num = rawVal === '' ? 0 : Math.max(0, Math.min(100, Number(rawVal)))
    setStats(prev => {
      const cur = prev[effectiveSelectedId] ?? {}
      const newWeight = { ...(cur.weight ?? DEFAULT_WEIGHT), [key]: num }
      setWeightError(weightSum(newWeight) !== 100)
      return { ...prev, [effectiveSelectedId]: { ...cur, weight: newWeight } }
    })
  }, [effectiveSelectedId])

  if (!selected) {
    return (
      <LoginRequiredSection isLoggedIn={isLoggedIn} className="grade-calc">
        <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
          <p>시간표에 저장된 강의가 없습니다.</p>
          <p>메인 페이지 시간표에서 강의를 추가하면 이곳에 표시됩니다.</p>
        </div>
      </LoginRequiredSection>
    )
  }

  const { attRate, hwRate, risk, level, grade, gpa, approxScore, examWeightedScore } =
    courseRisks[selected.id] ?? calcRisk(selected)

  const selectedStats  = stats[effectiveSelectedId] ?? {}
  const selectedWeight = selectedStats.weight ?? { ...DEFAULT_WEIGHT }
  const wSum           = weightSum(selectedWeight)

  return (
    <LoginRequiredSection isLoggedIn={isLoggedIn} className="grade-calc">

      {/* ── 요약 카드 ── */}
      <div className="gc-summary">
        {[
          { label: '수강 과목',  val: courses.length, unit: '과목' },
          { label: '총 학점',    val: totalCredits,   unit: '학점' },
          { label: '위험 과목',  val: dangerCount,    unit: '과목', danger: dangerCount > 0 },
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

        {/* ── 강의 목록 ── */}
        <div className="gc-list-col">
          <p className="gc-col-label">강의 목록 ({courses.length}개)</p>
          {courses.map(c => {
            const r   = courseRisks[c.id]
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

        {/* ── 상세 패널 ── */}
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

          {/* 학점 테이블 */}
          <div className="gcd-grade-table">
            {GRADE_TABLE.map(row => (
              <div key={row.grade} className={'gcd-grade-cell' + (row.grade === grade ? ' active' : '')}>
                <span>{row.grade}</span>
                <span className="gcd-grade-gpa-small">{row.gpa.toFixed(1)}</span>
              </div>
            ))}
          </div>

          {/* 통계 카드 */}
          <div className="gcd-stats">
            {[
              ['출석률',      `${attRate}%`],
              ['과제 제출률',  `${hwRate}%`],
              ['시험 평균',    `${examWeightedScore}점`],
              ['예상 점수',    `${approxScore}점`],
            ].map(([l, v]) => (
              <div key={l} className="gcd-stat">
                <span className="gcd-stat-label">{l}</span>
                <span className="gcd-stat-val">{v}</span>
              </div>
            ))}
          </div>

          {/* 위험도 게이지 */}
          <p className="gcd-section-label">위험도 게이지</p>
          <div className="gcd-risk-gauge">
            <div className="gcd-risk-gauge-track">
              <div
                className="gcd-risk-gauge-fill"
                style={{
                  width: `${risk}%`,
                  background: risk >= RISK_THRESHOLD.DANGER ? LEVEL_COLOR.danger.bar
                            : risk >= RISK_THRESHOLD.WARN   ? LEVEL_COLOR.warn.bar
                            : LEVEL_COLOR.safe.bar,
                }}
              />
            </div>
            <span
              className="gcd-risk-gauge-label"
              style={{
                color: risk >= RISK_THRESHOLD.DANGER ? LEVEL_COLOR.danger.text
                     : risk >= RISK_THRESHOLD.WARN   ? LEVEL_COLOR.warn.text
                     : LEVEL_COLOR.safe.text,
              }}
            >
              {LEVEL_LABEL[level]} {risk}점
            </span>
          </div>

          {/* ── 성적 반영 비율 (가중치) ── */}
          <p className="gcd-section-label">
            성적 반영 비율
            <span className={`gcd-weight-sum ${weightError ? 'error' : 'ok'}`}>
              합계 {wSum}% {weightError ? '← 합계가 100이 되어야 합니다' : '✓'}
            </span>
          </p>
          <div className="gcd-weight-grid">
            {[
              { key: 'att',   label: '출석' },
              { key: 'hw',    label: '과제' },
              { key: 'mid',   label: '중간고사' },
              { key: 'final', label: '기말고사' },
            ].map(({ key, label }) => (
              <div key={key} className="gcd-weight-row">
                <label className="gcd-weight-label">{label}</label>
                <div className="gcd-weight-input-wrap">
                  <input
                    type="number" min={0} max={100}
                    className={'gcd-weight-input' + (weightError ? ' error' : '')}
                    value={selectedWeight[key] ?? DEFAULT_WEIGHT[key]}
                    onChange={e => handleWeight(key, e.target.value)}
                  />
                  <span className="gcd-weight-pct">%</span>
                </div>
                {/* 비율 시각화 바 */}
                <div className="gcd-weight-bar-track">
                  <div
                    className="gcd-weight-bar-fill"
                    style={{ width: `${selectedWeight[key] ?? DEFAULT_WEIGHT[key]}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* ── 실적 입력 ── */}
          <p className="gcd-section-label">실적 입력</p>
          <div className="gcd-inputs">

            {/* 결석 횟수 */}
            <div className="gcd-input-row">
              <label className="gcd-input-label">결석 횟수 (총 {selected.totalClass}회)</label>
              <div className="gcd-input-field-wrap">
                <input
                  type="number" min={0} max={selected.totalClass}
                  className={'gcd-input-field' + (inputError.absent ? ' error' : '')}
                  value={selectedStats.absent ?? 0}
                  placeholder="미입력"
                  onChange={e => handleInput('absent', e.target.value, selected.totalClass)}
                />
                {inputError.absent && <span className="gcd-input-error">{inputError.absent}</span>}
              </div>
            </div>

            {/* 중간고사 점수 */}
            <div className="gcd-input-row">
              <label className="gcd-input-label">중간고사 점수 (0~100)</label>
              <div className="gcd-input-field-wrap">
                <input
                  type="number" min={0} max={100}
                  className={'gcd-input-field' + (inputError.midExam ? ' error' : '')}
                  value={selectedStats.midExam ?? ''}
                  placeholder="미입력"
                  onChange={e => handleInput('midExam', e.target.value, 100)}
                />
                {inputError.midExam && <span className="gcd-input-error">{inputError.midExam}</span>}
              </div>
            </div>

            {/* 기말고사 점수 */}
            <div className="gcd-input-row">
              <label className="gcd-input-label">기말고사 점수 (0~100)</label>
              <div className="gcd-input-field-wrap">
                <input
                  type="number" min={0} max={100}
                  className={'gcd-input-field' + (inputError.finalExam ? ' error' : '')}
                  value={selectedStats.finalExam ?? ''}
                  placeholder="미입력"
                  onChange={e => handleInput('finalExam', e.target.value, 100)}
                />
                {inputError.finalExam && <span className="gcd-input-error">{inputError.finalExam}</span>}
              </div>
            </div>

            {/* 과제 제출률 (자동 연동) */}
            <div className="gcd-input-row">
              <label className="gcd-input-label">과제 제출률</label>
              <div className="gcd-hw-rate-display">
                {hwRateByCourseName[effectiveSelectedId] === null ? (
                  <span className="gcd-hw-rate-none">등록된 과제 없음</span>
                ) : (
                  <>
                    <div className="gcd-hw-rate-bar-track">
                      <div
                        className="gcd-hw-rate-bar-fill"
                        style={{
                          width: `${hwRate}%`,
                          background: hwRate >= HW_THRESHOLD.WARN     ? LEVEL_COLOR.safe.bar
                                    : hwRate >= HW_THRESHOLD.CRITICAL ? LEVEL_COLOR.warn.bar
                                    : LEVEL_COLOR.danger.bar,
                        }}
                      />
                    </div>
                    <span className="gcd-hw-rate-pct">{hwRate}%</span>
                  </>
                )}
                <span className="gcd-hw-rate-hint">과제 페이지 체크리스트에서 자동 반영됩니다</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </LoginRequiredSection>
  )
}