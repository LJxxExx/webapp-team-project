import React, { useEffect, useState } from 'react'
import LoginRequiredSection from '../common/LoginRequiredSection'
import './AssignmentPage.css'

const defaultChecklist = [
  '제출 파일 업로드 확인',
  '파일명 형식 확인',
  '제출 형식 확인',
  '마감 시간 확인',
  '과제 요구사항 재확인',
  '이름/학번 기재 확인',
  '제출 후 최종 확인',
]

function createChecklist() {
  return defaultChecklist.map((text, index) => ({
    id: index + 1,
    text,
    checked: false,
  }))
}

function formatDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatKoreanDate(dateKey) {
  const [year, month, day] = dateKey.split('-')
  return `${year}년 ${Number(month)}월 ${Number(day)}일`
}

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

function getChecklistRate(checklist) {
  if (!checklist || checklist.length === 0) return 0

  const checkedCount = checklist.filter(item => item.checked).length
  return Math.round((checkedCount / checklist.length) * 100)
}

function getDateStatus(assignments) {
  if (assignments.length === 0) return ''

  const incompleteAssignments = assignments.filter(a => !a.isCompleted)
  const completedAssignments = assignments.filter(a => a.isCompleted)

  if (incompleteAssignments.length === 0 && completedAssignments.length > 0) {
    return 'completed'
  }

  if (incompleteAssignments.length === 0) return ''

  let status = 'safe'

  incompleteAssignments.forEach(assignment => {
    const daysLeft = getDaysLeft(assignment.dueDate)

    if (daysLeft <= 1) {
      status = 'danger'
    } else if (daysLeft <= 3 && status !== 'danger') {
      status = 'warning'
    }
  })

  return status
}

function getTotalCompletionRate(assignments) {
  if (assignments.length === 0) return 0

  const completedCount = assignments.filter(a => a.isCompleted).length
  return Math.round((completedCount / assignments.length) * 100)
}

function getUpcomingCompletionRate(assignments) {
  const upcomingAssignments = assignments.filter(a => !isOverdue(a))

  if (upcomingAssignments.length === 0) return 0

  const completedCount = upcomingAssignments.filter(a => a.isCompleted).length
  return Math.round((completedCount / upcomingAssignments.length) * 100)
}

function getRiskInfo(assignment) {
  if (assignment.isCompleted) {
    return { label: '완료', className: 'ap-risk-completed' }
  }

  if (isOverdue(assignment)) {
    return { label: '마감 지남', className: 'ap-risk-overdue' }
  }

  const daysLeft = getDaysLeft(assignment.dueDate)
  const checklistRate = getChecklistRate(assignment.checklist)

  if (daysLeft <= 1 || assignment.priority === '긴급') {
    return { label: '긴급', className: 'ap-risk-danger' }
  }

  if (daysLeft <= 3 || checklistRate < 50 || assignment.priority === '높음') {
    return { label: '주의', className: 'ap-risk-warning' }
  }

  return { label: '안전', className: 'ap-risk-safe' }
}

function ProgressCircle({ progress, title }) {
  const radius = 58
  const strokeWidth = 12
  const normalizedRadius = radius - strokeWidth / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="ap-progress-circle-wrap">
      <svg width={radius * 2} height={radius * 2} className="ap-progress-circle-svg">
        <circle
          stroke="#e9ecef"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />

        <circle
          stroke="#2ecc71"
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="ap-progress-circle-value"
        />
      </svg>

      <div className="ap-progress-circle-text">
        <strong>{progress}%</strong>
        <span>완료</span>
      </div>

      <p className="ap-progress-caption">{title}</p>
    </div>
  )
}

export default function AssignmentPage({
  isLoggedIn,
  assignments = [],
  savedLectures = [],
  openDate,
  onClearOpenDate,
  onAddAssignment,
  onUpdateAssignment,
  onDeleteAssignment,
  onToggleComplete,
}) {
  const today = new Date()

  const [pageMode, setPageMode] = useState('calendar')
  const [selectedDate, setSelectedDate] = useState(formatDateKey(today))
  const [currentDate, setCurrentDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  )

  const [editingAssignment, setEditingAssignment] = useState(null)

  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [subjectSearchText, setSubjectSearchText] = useState('')
  const [dueDate, setDueDate] = useState(formatDateKey(today))
  const [dueTime, setDueTime] = useState('23:59')
  const [progress, setProgress] = useState(0)
  const [priority, setPriority] = useState('보통')
  const [memo, setMemo] = useState('')
  const [mistakeNote, setMistakeNote] = useState('')
  const [checklist, setChecklist] = useState(createChecklist())
  const [customChecklistText, setCustomChecklistText] = useState('')

  useEffect(() => {
    if (openDate) {
      setSelectedDate(openDate)
      setDueDate(openDate)
      setPageMode('detail')
      onClearOpenDate()
    }
  }, [openDate, onClearOpenDate])

  useEffect(() => {
    if (editingAssignment) {
      setTitle(editingAssignment.title)
      setSubject(editingAssignment.subject)
      setSubjectSearchText(editingAssignment.subject)
      setDueDate(editingAssignment.dueDate)
      setDueTime(editingAssignment.dueTime)
      setProgress(editingAssignment.progress)
      setPriority(editingAssignment.priority)
      setMemo(editingAssignment.memo)
      setMistakeNote(editingAssignment.mistakeNote)
      setChecklist(editingAssignment.checklist || createChecklist())
    } else {
      resetForm(selectedDate)
    }
  }, [editingAssignment, selectedDate])

  function resetForm(date = selectedDate) {
    setTitle('')
    setSubject('')
    setSubjectSearchText('')
    setDueDate(date)
    setDueTime('23:59')
    setProgress(0)
    setPriority('보통')
    setMemo('')
    setMistakeNote('')
    setChecklist(createChecklist())
    setCustomChecklistText('')
  }

  function movePrevMonth() {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    setCurrentDate(new Date(year, month - 1, 1))
  }

  function moveNextMonth() {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    setCurrentDate(new Date(year, month + 1, 1))
  }

  function selectDate(dateKey) {
    setSelectedDate(dateKey)
    setDueDate(dateKey)
    setPageMode('detail')
  }

  function goBackToCalendar() {
    setEditingAssignment(null)
    setPageMode('calendar')
  }

  function addCustomChecklist() {
    if (customChecklistText.trim() === '') return

    const newItem = {
      id: Date.now(),
      text: customChecklistText,
      checked: false,
    }

    setChecklist(prev => [...prev, newItem])
    setCustomChecklistText('')
  }

  function removeChecklistItem(itemId) {
    setChecklist(prev => prev.filter(item => item.id !== itemId))
  }

  function toggleFormChecklist(itemId) {
    setChecklist(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      )
    )
  }

  function handleSubmit(e) {
    e.preventDefault()

    if (title.trim() === '') {
      alert('과제명을 입력하세요.')
      return
    }

    if (subject.trim() === '') {
      alert('과목명을 입력하세요.')
      return
    }

    const assignmentData = {
      id: editingAssignment ? editingAssignment.id : Date.now(),
      title,
      subject,
      dueDate,
      dueTime,
      progress: Number(progress),
      priority,
      isCompleted: editingAssignment
        ? editingAssignment.isCompleted ?? false
        : false,
      memo,
      mistakeNote,
      checklist,
    }

    if (editingAssignment) {
      onUpdateAssignment(assignmentData)
      setEditingAssignment(null)
    } else {
      onAddAssignment(assignmentData)
    }

    resetForm(dueDate)
  }

  function handleChecklistChange(assignmentId, itemId) {
    const target = assignments.find(a => a.id === assignmentId)
    if (!target) return

    const updatedChecklist = target.checklist.map(item =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    )

    onUpdateAssignment({
      ...target,
      checklist: updatedChecklist,
    })
  }

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDate = new Date(year, month + 1, 0).getDate()
  const firstDayIndex = firstDay.getDay()

  const calendarCells = []

  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(null)
  }

  for (let day = 1; day <= lastDate; day++) {
    calendarCells.push(new Date(year, month, day))
  }

  const selectedAssignments = assignments.filter(a => a.dueDate === selectedDate)

  const totalCompletionRate = getTotalCompletionRate(assignments)
  const upcomingCompletionRate = getUpcomingCompletionRate(assignments)

  const filteredSavedLectures = savedLectures.filter(lecture => {
    const keyword = subjectSearchText.trim().toLowerCase()

    if (!keyword) return true

    const target = [
      lecture.name,
      lecture.professor,
      lecture.lectureCode,
      lecture.sectionCode,
    ].join(' ').toLowerCase()

    return target.includes(keyword)
  })

  return (
    <LoginRequiredSection isLoggedIn={isLoggedIn} className="assign-page">
      {pageMode === 'calendar' && (
        <div className="ap-wrap">
          <div className="ap-header">
            <div>
              <h2 className="section-title">과제 캘린더</h2>
              <p className="ap-desc">
                날짜를 클릭하면 과제 등록, 수정, 체크리스트 관리 화면으로 이동합니다.
              </p>
            </div>

            <span className="ap-count-badge">총 {assignments.length}개 과제</span>
          </div>

          <div className="ap-card">
            <div className="ap-calendar-top">
              <button className="ap-nav-btn" onClick={movePrevMonth}>
                이전
              </button>

              <h3>
                {year}년 {month + 1}월
              </h3>

              <button className="ap-nav-btn" onClick={moveNextMonth}>
                다음
              </button>
            </div>

            <div className="ap-weekdays">
              <span>일</span>
              <span>월</span>
              <span>화</span>
              <span>수</span>
              <span>목</span>
              <span>금</span>
              <span>토</span>
            </div>

            <div className="ap-calendar-grid">
              {calendarCells.map((date, index) => {
                if (date === null) {
                  return (
                    <div
                      key={`empty-${index}`}
                      className="ap-calendar-cell ap-empty-cell"
                    />
                  )
                }

                const dateKey = formatDateKey(date)
                const dayAssignments = assignments.filter(a => a.dueDate === dateKey)

                const completedCount = dayAssignments.filter(a => a.isCompleted).length
                const incompleteCount = dayAssignments.length - completedCount
                const status = getDateStatus(dayAssignments)
                const isToday = dateKey === formatDateKey(today)

                return (
                  <button
                    key={dateKey}
                    className={`ap-calendar-cell ${status} ${isToday ? 'ap-today-cell' : ''}`}
                    onClick={() => selectDate(dateKey)}
                  >
                    <span className="ap-day-number">{date.getDate()}</span>

                    {dayAssignments.length > 0 && (
                      <div className="ap-calendar-info">
                        <span>전체 {dayAssignments.length}개</span>

                        {incompleteCount > 0 && (
                          <span className="ap-incomplete-count">
                            미완료 {incompleteCount}개
                          </span>
                        )}

                        {completedCount > 0 && (
                          <span className="ap-completed-count">
                            완료 {completedCount}개
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="ap-legend">
              <span><i className="ap-legend-dot ap-safe-dot" />여유</span>
              <span><i className="ap-legend-dot ap-warning-dot" />주의</span>
              <span><i className="ap-legend-dot ap-danger-dot" />긴급</span>
              <span><i className="ap-legend-dot ap-completed-dot" />완료</span>
            </div>
          </div>

          <div className="ap-card ap-progress-card">
            <ProgressCircle progress={totalCompletionRate} title="전체 과제 완료율" />
            <ProgressCircle progress={upcomingCompletionRate} title="남은 과제 완료율" />
          </div>
        </div>
      )}

      {pageMode === 'detail' && (
        <div className="ap-detail-wrap">
          <button className="ap-back-btn" onClick={goBackToCalendar}>
            ← 캘린더로 돌아가기
          </button>

          <div className="ap-detail-header">
            <div>
              <h2 className="section-title">
                {formatKoreanDate(selectedDate)} 과제 관리
              </h2>
              <p className="ap-desc">
                이 날짜의 과제와 제출 전 실수 예방 항목을 관리합니다.
              </p>
            </div>

            <span className="ap-date-badge">{selectedDate}</span>
          </div>

          <div className="ap-detail-layout">
            <form className="ap-form-card" onSubmit={handleSubmit}>
              <h3>{editingAssignment ? '과제 수정' : '과제 추가'}</h3>

              <div className="ap-form-group">
                <label>과제명</label>
                <input
                  type="text"
                  value={title}
                  placeholder="예: 운영체제 스케줄링 구현"
                  onChange={e => setTitle(e.target.value)}
                />
              </div>

              <div className="ap-form-group">
                <label>과목명</label>

                <input
                  type="text"
                  value={subjectSearchText}
                  placeholder="현재 시간표 과목 검색"
                  onChange={e => setSubjectSearchText(e.target.value)}
                />

                <select
                  value={subject}
                  onChange={e => {
                    setSubject(e.target.value)
                    setSubjectSearchText(e.target.value)
                  }}
                >
                  <option value="">과목을 선택하세요</option>

                  {savedLectures.length === 0 && (
                    <option value="" disabled>
                      시간표에 등록된 과목이 없습니다
                    </option>
                  )}

                  {filteredSavedLectures.map(lecture => (
                    <option key={lecture.id} value={lecture.name}>
                      {lecture.name}
                      {lecture.professor ? ` - ${lecture.professor}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ap-form-row">
                <div className="ap-form-group">
                  <label>마감일</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                  />
                </div>

                <div className="ap-form-group">
                  <label>마감 시간</label>
                  <input
                    type="time"
                    value={dueTime}
                    onChange={e => setDueTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="ap-form-row">
                <div className="ap-form-group">
                  <label>진행도: {progress}%</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={progress}
                    onChange={e => setProgress(e.target.value)}
                  />
                </div>

                <div className="ap-form-group">
                  <label>중요도</label>
                  <select value={priority} onChange={e => setPriority(e.target.value)}>
                    <option>낮음</option>
                    <option>보통</option>
                    <option>높음</option>
                    <option>긴급</option>
                  </select>
                </div>
              </div>

              <div className="ap-form-group">
                <label>메모</label>
                <textarea
                  value={memo}
                  placeholder="과제 요구사항, 제출 링크, 참고사항 등을 적어두세요."
                  onChange={e => setMemo(e.target.value)}
                />
              </div>

              <div className="ap-form-group">
                <label>실수 기록</label>
                <textarea
                  value={mistakeNote}
                  placeholder="예: 지난번에 파일명을 잘못 제출함, 마감 시간을 착각함"
                  onChange={e => setMistakeNote(e.target.value)}
                />
              </div>

              <div className="ap-form-group">
                <label>개인 맞춤 체크리스트 추가</label>
                <div className="ap-custom-checklist-row">
                  <input
                    type="text"
                    value={customChecklistText}
                    placeholder="예: 교수님 공지사항 다시 확인"
                    onChange={e => setCustomChecklistText(e.target.value)}
                  />

                  <button type="button" onClick={addCustomChecklist}>
                    추가
                  </button>
                </div>
              </div>

              <div className="ap-form-group">
                <label>현재 체크리스트 항목</label>

                <div className="ap-form-checklist-preview">
                  {checklist.map(item => (
                    <div key={item.id} className="ap-form-checklist-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => toggleFormChecklist(item.id)}
                        />
                        <span className={item.checked ? 'ap-checked-text' : ''}>
                          {item.text}
                        </span>
                      </label>

                      <button
                        type="button"
                        onClick={() => removeChecklistItem(item.id)}
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ap-form-actions">
                <button type="submit" className="ap-save-btn">
                  {editingAssignment ? '수정 저장' : '과제 저장'}
                </button>

                {editingAssignment && (
                  <button
                    type="button"
                    className="ap-cancel-btn"
                    onClick={() => {
                      setEditingAssignment(null)
                      resetForm(selectedDate)
                    }}
                  >
                    수정 취소
                  </button>
                )}
              </div>
            </form>

            <div className="ap-list-card">
              <h3>해당 날짜 과제 목록</h3>

              {selectedAssignments.length === 0 && (
                <p className="ap-empty-message">
                  아직 등록된 과제가 없습니다. 왼쪽 폼에서 과제를 추가하세요.
                </p>
              )}

              {selectedAssignments.map(assignment => {
                const riskInfo = getRiskInfo(assignment)
                const checklistRate = getChecklistRate(assignment.checklist)
                const daysLeft = getDaysLeft(assignment.dueDate)
                const overdue = isOverdue(assignment)

                const shouldShowCompletedBox = assignment.isCompleted
                const shouldShowOverdueBox = !assignment.isCompleted && overdue
                const shouldShowWarning =
                  !assignment.isCompleted &&
                  !overdue &&
                  daysLeft <= 3 &&
                  checklistRate < 70

                return (
                  <div
                    key={assignment.id}
                    className={`ap-assignment-card ${
                      assignment.isCompleted ? 'ap-assignment-card-completed' : ''
                    }`}
                  >
                    <div className="ap-assignment-top">
                      <div>
                        <h4 className={assignment.isCompleted ? 'ap-completed-title' : ''}>
                          {assignment.title}
                        </h4>
                        <p>{assignment.subject}</p>
                      </div>

                      <span className={`ap-risk-badge ${riskInfo.className}`}>
                        {riskInfo.label}
                      </span>
                    </div>

                    {shouldShowCompletedBox && (
                      <div className="ap-completed-box">
                        제출 완료 처리된 과제입니다.
                      </div>
                    )}

                    {shouldShowOverdueBox && (
                      <div className="ap-overdue-box">
                        마감이 지났습니다. 제출 여부를 확인하세요.
                      </div>
                    )}

                    {shouldShowWarning && (
                      <div className="ap-warning-box">
                        마감이 얼마 남지 않았습니다. 제출 파일과 형식을 다시 확인하세요.
                      </div>
                    )}

                    <div className="ap-assignment-meta">
                      <span>{getDdayText(assignment.dueDate)}</span>
                      <span>{assignment.dueTime}까지</span>
                      <span>중요도: {assignment.priority}</span>
                      <span>기존 진행도: {assignment.progress}%</span>
                      <span>체크리스트: {checklistRate}%</span>
                    </div>

                    {assignment.memo && (
                      <p className="ap-assignment-memo">
                        <strong>메모:</strong> {assignment.memo}
                      </p>
                    )}

                    {assignment.mistakeNote && (
                      <p className="ap-assignment-mistake-note">
                        <strong>실수 기록:</strong> {assignment.mistakeNote}
                      </p>
                    )}

                    <div className="ap-checklist-card">
                      <div className="ap-checklist-title-row">
                        <h5>실수 예방 체크리스트</h5>
                        <span>{checklistRate}% 완료</span>
                      </div>

                      <div className="ap-checklist-rate-bar">
                        <div
                          className="ap-checklist-rate-fill"
                          style={{ width: `${checklistRate}%` }}
                        />
                      </div>

                      <div className="ap-checklist-items">
                        {(assignment.checklist || []).map(item => (
                          <label key={item.id} className="ap-checklist-item">
                            <input
                              type="checkbox"
                              checked={item.checked}
                              onChange={() =>
                                handleChecklistChange(assignment.id, item.id)
                              }
                            />
                            <span className={item.checked ? 'ap-checked-text' : ''}>
                              {item.text}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="ap-actions">
                      <button
                        className={
                          assignment.isCompleted
                            ? 'ap-small-btn ap-complete-cancel-btn'
                            : 'ap-small-btn ap-complete-btn'
                        }
                        onClick={() => onToggleComplete(assignment.id)}
                      >
                        {assignment.isCompleted ? '완료 취소' : '제출 완료'}
                      </button>

                      <button
                        className="ap-small-btn ap-edit-btn"
                        onClick={() => setEditingAssignment(assignment)}
                      >
                        수정
                      </button>

                      <button
                        className="ap-small-btn ap-delete-btn"
                        onClick={() => onDeleteAssignment(assignment.id)}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </LoginRequiredSection>
  )
}