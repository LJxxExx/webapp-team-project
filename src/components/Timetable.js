import React from 'react'
import './Timetable.css'
import { timetableData } from '../data'

const DAYS = ['월', '화', '수', '목', '금']
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17]

export default function Timetable({ isLoggedIn }) {
  return (
    <div className="timetable-wrap">
      <div className="timetable-header-row">
        <h2 className="section-title">시간표</h2>
        <button className="btn-secondary" disabled={!isLoggedIn}>시간표 설정</button>
      </div>

      <div className={'timetable-container' + (!isLoggedIn ? ' timetable-blurred' : '')}>
        <table className="timetable">
          <thead>
            <tr>
              <th className="th-time">시간</th>
              {DAYS.map(d => <th key={d} className="th-day">{d}</th>)}
            </tr>
          </thead>
          <tbody>
            {HOURS.map(hour => (
              <tr key={hour}>
                <td className="td-time">{String(hour).padStart(2,'0')}:00</td>
                {DAYS.map(day => {
                  if (hour === 13) {
                    return day === '월'
                      ? <td key={day} className="td-lunch" colSpan={5}>점심 시간</td>
                      : null
                  }
                  const courses = timetableData.filter(
                    c => c.day === day && c.startHour <= hour && c.endHour > hour
                  )
                  const isStart = courses.some(c => c.startHour === hour)
                  if (!isStart && courses.length > 0) return null // rowspan handled by start row

                  return (
                    <td key={day} className="td-cell">
                      {courses.map(c => (
                        <div
                          key={c.id}
                          className="course-block"
                          style={{ background: c.color }}
                        >
                          {c.name}
                        </div>
                      ))}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!isLoggedIn && (
        <div className="timetable-blur-overlay">
          <span className="blur-label">'로그인이 필요합니다'</span>
        </div>
      )}
    </div>
  )
}
