import { useAppStore } from '../store/useAppStore'
import { calcRisk, GRADE_TABLE } from '../utils/riskCalc'

const ALERT_STYLE = {
  danger: { background: '#FCEBEB', color: '#A32D2D', borderColor: '#E24B4A' },
  warn:   { background: '#FAEEDA', color: '#854F0B', borderColor: '#EF9F27' },
  info:   { background: '#E6F1FB', color: '#185FA5', borderColor: '#378ADD' },
}

export default function DetailPanel({ course }) {
  const { updateStat } = useAppStore()
  const { attRate, hwRate, risk, grade, gpa, approxScore, alerts } = calcRisk(course)

  function set(key, raw) {
    const val = raw === '' ? null : Number(raw)
    updateStat(course.id, key, val ?? 0)
  }
  function setExam(raw) {
    updateStat(course.id, 'exam', raw === '' ? null : Number(raw))
  }

  return (
    <div className="detail-panel">
      <div className="dp-header">
        <div>
          <h2 className="dp-title">{course.name}</h2>
          <p className="dp-sub">{course.credit}학점 · {course.professor ?? ''} · {course.room ?? ''}</p>
        </div>
        <div className="dp-gpa-badge">
          <span className="dp-grade">{grade}</span>
          <span className="dp-gpa-val">{gpa.toFixed(1)}</span>
        </div>
      </div>

      <div className="grade-table-wrap">
        {GRADE_TABLE.map(row => (
          <div
            key={row.grade}
            className={`grade-cell ${row.grade === grade ? 'grade-cell--active' : ''}`}
          >
            <span className="gc-label">{row.grade}</span>
            <span className="gc-gpa">{row.gpa.toFixed(1)}</span>
          </div>
        ))}
      </div>

      <div className="dp-grid">
        <div className="dp-stat">
          <span className="dp-stat-label">출석률</span>
          <span className="dp-stat-val">{attRate}%</span>
        </div>
        <div className="dp-stat">
          <span className="dp-stat-label">과제 제출률</span>
          <span className="dp-stat-val">{hwRate}%</span>
        </div>
        <div className="dp-stat">
          <span className="dp-stat-label">예상 점수</span>
          <span className="dp-stat-val">{approxScore}점</span>
        </div>
        <div className="dp-stat">
          <span className="dp-stat-label">위험도</span>
          <span className="dp-stat-val">{risk}점</span>
        </div>
      </div>

      <p className="dp-section-label">실적 입력</p>
      <div className="input-grid">
        <InputRow
          label={`결석 횟수 (총 ${course.totalClass}회)`}
          type="number" min={0} max={course.totalClass}
          value={course.absent}
          onChange={e => set('absent', e.target.value)}
        />
        <InputRow
          label={`과제 미제출 (총 ${course.hwTotal}개)`}
          type="number" min={0} max={course.hwTotal}
          value={course.hwMiss}
          onChange={e => set('hwMiss', e.target.value)}
        />
        <InputRow
          label="시험 점수 (0~100, 없으면 빈칸)"
          type="number" min={0} max={100}
          value={course.exam ?? ''}
          placeholder="미입력"
          onChange={e => setExam(e.target.value)}
        />
      </div>

      <p className="dp-section-label" style={{ marginTop: '1rem' }}>알림</p>
      <div className="alert-list">
        {alerts.map((a, i) => (
          <div
            key={i}
            className="alert-item"
            style={{
              background: ALERT_STYLE[a.type].background,
              color: ALERT_STYLE[a.type].color,
              borderLeft: `3px solid ${ALERT_STYLE[a.type].borderColor}`,
            }}
          >
            {a.msg}
          </div>
        ))}
      </div>
    </div>
  )
}

function InputRow({ label, ...props }) {
  return (
    <div className="input-row">
      <label className="input-label">{label}</label>
      <input className="input-field" {...props} />
    </div>
  )
}
