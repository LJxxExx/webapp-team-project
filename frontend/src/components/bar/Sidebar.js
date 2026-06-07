import React from 'react'
import './Sidebar.css'

function getDaysLeft(dueDate) {
  const today = new Date()
  const due = new Date(dueDate)

  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)

  const diff = due - today
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function getDdayText(dueDate) {
  const daysLeft = getDaysLeft(dueDate)

  if (daysLeft === 0) return 'D-Day'
  if (daysLeft > 0) return `D-${daysLeft}`

  return `D+${Math.abs(daysLeft)}`
}

function isOverdue(assignment) {
  const due = new Date(`${assignment.dueDate}T${assignment.dueTime || '23:59'}`)
  return due < new Date()
}

function getDueClass(assignment) {
  const daysLeft = getDaysLeft(assignment.dueDate)

  if (daysLeft <= 1) return 'today'
  if (daysLeft <= 3) return 'soon'
  return 'normal'
}

function groupAssignments(assignments) {
  return [
    {
      title: '긴급 과제',
      className: 'urgent',
      items: assignments.filter(assignment => getDaysLeft(assignment.dueDate) <= 1),
    },
    {
      title: '주의 과제',
      className: 'soon',
      items: assignments.filter(assignment => getDaysLeft(assignment.dueDate) > 1 && getDaysLeft(assignment.dueDate) <= 3),
    },
    {
      title: '여유 과제',
      className: 'normal',
      items: assignments.filter(assignment => getDaysLeft(assignment.dueDate) > 3),
    },
  ].filter(group => group.items.length > 0)
}

export default function Sidebar({
  isLoggedIn,
  user,
  onLogin,
  onLogout,
  onSave,
  assignments = [],
  onToggleAssignmentComplete,
  onOpenAssignment,
}) {
  const visibleAssignments = assignments
    .filter(assignment => !assignment.isCompleted)
    .filter(assignment => !isOverdue(assignment))
    .sort((a, b) => {
      const dateA = new Date(`${a.dueDate}T${a.dueTime || '23:59'}`)
      const dateB = new Date(`${b.dueDate}T${b.dueTime || '23:59'}`)
      return dateA - dateB
    })

  const assignmentGroups = groupAssignments(visibleAssignments)

  return (
    <aside className="sidebar">
      {/* 로그인 카드 */}
      <div className="sidebar-card login-card">
        {isLoggedIn ? (
          <div className="login-info-auth">
            <div className="user-details">
              <span className="user-text">학번: {user.id}</span>
              <span className="user-text">학과: {user.dept}</span>
              <span className="user-text">학년: {user.grade}</span>
            </div>
            <button className="btn-logout" onClick={onLogout}>로그아웃</button>
          </div>
        ) : (
          <div className="login-info">
            <button className="btn-login" onClick={onLogin}>로그인</button>
          </div>
        )}
      </div>

      {/* 과제 요약 카드 */}
      <div className="sidebar-card">
        <h3 className="sidebar-title">과제 요약</h3>

        <div className={'assignment-list' + (!isLoggedIn ? ' blurred' : '')}>
          {visibleAssignments.length === 0 && (
            <p className="assignment-empty">남은 과제가 없습니다.</p>
          )}

          {assignmentGroups.map(group => (
            <div key={group.title} className="assignment-group">
              <div className={'assignment-group-title assignment-group-' + group.className}>
                {group.title}
              </div>

              {group.items.map(assignment => (
                <div
                  key={assignment.id}
                  className="assignment-item"
                  onClick={() => {
                    if (isLoggedIn) {
                      onOpenAssignment(assignment)
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    checked={assignment.isCompleted}
                    disabled={!isLoggedIn}
                    onClick={e => e.stopPropagation()}
                    onChange={() => onToggleAssignmentComplete(assignment.id)}
                  />

                  <div className="assignment-text">
                    <span className="assignment-title">{assignment.title}</span>
                    <span className="assignment-subject">{assignment.subject}</span>
                    <span className={'assignment-due due-' + getDueClass(assignment)}>
                      {getDdayText(assignment.dueDate)} · {assignment.dueTime}까지
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {!isLoggedIn && (
          <p className="blur-msg">'로그인이 필요합니다'</p>
        )}
      </div>
    </aside>
  )
}
