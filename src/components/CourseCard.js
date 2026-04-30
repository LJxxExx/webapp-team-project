import { calcRisk, LEVEL_LABEL, LEVEL_COLOR } from '../utils/riskCalc'

export default function CourseCard({ course, isSelected, onClick }) {
  const { attRate, hwRate, level, grade, gpa } = calcRisk(course)
  const color = LEVEL_COLOR[level]

  return (
    <div
      className={`course-card ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <div className="cc-top">
        <div>
          <p className="cc-name">{course.name}</p>
          <p className="cc-credit">{course.credit}학점 · {course.professor ?? ''}</p>
        </div>
        <div className="cc-right">
          <div className="cc-grade">
            <span className="cc-grade-letter">{grade}</span>
            <span className="cc-grade-gpa">{gpa.toFixed(1)}</span>
          </div>
          <span className="badge" style={{ background: color.bg, color: color.text }}>
            {LEVEL_LABEL[level]}
          </span>
        </div>
      </div>

      <div className="bars">
        <BarRow label="출석률" value={attRate} color={color.bar} />
        <BarRow label="과제" value={hwRate} color={color.bar} />
      </div>
    </div>
  )
}

function BarRow({ label, value, color }) {
  return (
    <div className="bar-row">
      <span className="bar-label">{label}</span>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="bar-pct">{value}%</span>
    </div>
  )
}
