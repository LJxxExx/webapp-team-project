import React, { useState } from 'react'
import './AssignmentPage.css'
import { assignmentsData } from '../../data'

export default function AssignmentPage({ isLoggedIn }) {
  const [assignments, setAssignments] = useState(assignmentsData)

  function toggle(id) {
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, done: !a.done } : a))
  }

  return (
    <div className={'assign-page' + (!isLoggedIn ? ' blurred-section' : '')}>
      {!isLoggedIn && (
        <div className="section-blur-overlay"><span className="blur-label">'로그인이 필요합니다'</span></div>
      )}
      <h2 className="section-title">과제 목록</h2>
      <div className="assign-list">
        {assignments.map(a => (
          <div key={a.id} className={'assign-item' + (a.done ? ' done' : '')}>
            <input
              type="checkbox"
              checked={a.done}
              onChange={() => toggle(a.id)}
              disabled={!isLoggedIn}
            />
            <div className="assign-info">
              <span className="assign-title">{a.title}</span>
              <span className={'assign-due due-' + a.urgency}>{a.due}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
