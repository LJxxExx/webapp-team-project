import React, { useEffect, useState } from 'react'
import LoginRequiredSection from '../common/LoginRequiredSection'
import './AssignmentPage.css'

const checklistTemplates = {
  일반: [
    '제출 파일 업로드 확인',
    '파일명 형식 확인',
    '제출 형식 확인',
    '마감 시간 확인',
    '과제 요구사항 재확인',
    '이름/학번 기재 확인',
    '제출 후 최종 확인',
  ],
  보고서: [
    '과제 요구사항 재확인',
    '표지/이름/학번 기재 확인',
    '목차와 문단 흐름 확인',
    '참고문헌/출처 표기 확인',
    'PDF 변환 및 파일명 확인',
    '제출 후 업로드 상태 확인',
  ],
  코딩: [
    '실행 오류 없는지 확인',
    '필수 기능 작동 확인',
    '예외 상황 테스트',
    '코드 주석/가독성 확인',
    '캡처 자료 또는 실행 결과 준비',
    '압축 파일명과 제출 형식 확인',
  ],
  발표: [
    'PPT 전체 흐름 확인',
    '발표 대본 또는 키워드 정리',
    '시연 자료 준비',
    '팀원 역할 분담 확인',
    '발표 시간 확인',
    '최종 제출 파일 확인',
  ],
}

function createChecklist(type = '일반') {
  const template = checklistTemplates[type] || checklistTemplates.일반

  return template.map((text, index) => ({
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

function getAssignmentSummary(assignments) {
  const incomplete = assignments.filter(a => !a.isCompleted)

  return {
    today: incomplete.filter(a => !isOverdue(a) && getDaysLeft(a.dueDate) === 0).length,
    upcoming: incomplete.filter(a => !isOverdue(a) && getDaysLeft(a.dueDate) > 0 && getDaysLeft(a.dueDate) <= 3).length,
    overdue: incomplete.filter(a => isOverdue(a)).length,
  }
}

function getAssignmentStats(assignments) {
  const completed = assignments.filter(a => a.isCompleted).length
  const incomplete = assignments.length - completed
  const overdue = assignments.filter(a => !a.isCompleted && isOverdue(a)).length
  const urgent = assignments.filter(a => {
    const riskInfo = getRiskInfo(a)
    return !a.isCompleted && (riskInfo.label === '긴급' || riskInfo.label === '마감 지남')
  }).length

  const averageChecklistRate = assignments.length === 0
    ? 0
    : Math.round(
        assignments.reduce((sum, assignment) => sum + getChecklistRate(assignment.checklist), 0) / assignments.length
      )

  return { completed, incomplete, overdue, urgent, averageChecklistRate }
}

function getSubjectStats(assignments) {
  const grouped = new Map()

  assignments.forEach(assignment => {
    const subjectName = assignment.subject || '미지정 과목'
    const current = grouped.get(subjectName) || { subject: subjectName, total: 0, completed: 0 }
    current.total += 1
    if (assignment.isCompleted) current.completed += 1
    grouped.set(subjectName, current)
  })

  return Array.from(grouped.values())
}

function getMistakeHints(assignments) {
  const seen = new Set()

  return assignments
    .map(assignment => assignment.mistakeNote?.trim())
    .filter(Boolean)
    .filter(note => {
      if (seen.has(note)) return false
      seen.add(note)
      return true
    })
    .slice(0, 5)
}

function getOverdueAssignments(assignments) {
  return assignments
    .filter(assignment => !assignment.isCompleted && isOverdue(assignment))
    .sort((a, b) => new Date(`${a.dueDate}T${a.dueTime || '23:59'}`) - new Date(`${b.dueDate}T${b.dueTime || '23:59'}`))
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
  const [dueDate, setDueDate] = useState(formatDateKey(today))
  const [dueTime, setDueTime] = useState('23:59')
  const [progress, setProgress] = useState(0)
  const [priority, setPriority] = useState('보통')
  const [assignmentType, setAssignmentType] = useState('일반')
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
      setDueDate(editingAssignment.dueDate)
      setDueTime(editingAssignment.dueTime)
      setProgress(editingAssignment.progress)
      setPriority(editingAssignment.priority)
      setAssignmentType(editingAssignment.assignmentType || '일반')
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
    setDueDate(date)
    setDueTime('23:59')
    setProgress(0)
    setPriority('보통')
    setAssignmentType('일반')
    setMemo('')
    setMistakeNote('')
    setChecklist(createChecklist('일반'))
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

  function applyChecklistTemplate() {
    const ok = checklist.some(item => item.checked || item.text.trim() !== '')
      ? window.confirm('현재 체크리스트를 선택한 과제 유형 템플릿으로 교체할까요?')
      : true

    if (!ok) return
    setChecklist(createChecklist(assignmentType))
  }

  function addMistakeHint(note) {
    setMistakeNote(prev => {
      if (!prev.trim()) return note
      if (prev.includes(note)) return prev
      return `${prev}
${note}`
    })
  }

  function handleToggleCompleteWithChecklist(assignment) {
    const checklistRate = getChecklistRate(assignment.checklist)

    if (!assignment.isCompleted && checklistRate < 100) {
      const ok = window.confirm(`체크리스트가 아직 ${checklistRate}%만 완료되었습니다. 그래도 제출 완료 처리할까요?`)
      if (!ok) return
    }

    onToggleComplete(assignment.id)
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
      assignmentType,
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
  const assignmentSummary = getAssignmentSummary(assignments)
  const assignmentStats = getAssignmentStats(assignments)
  const subjectStats = getSubjectStats(assignments)
  const mistakeHints = getMistakeHints(assignments)
  const overdueAssignments = getOverdueAssignments(assignments)

  const totalCompletionRate = getTotalCompletionRate(assignments)
  const upcomingCompletionRate = getUpcomingCompletionRate(assignments)

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

          <div className="ap-summary-grid">
            <div className="ap-summary-card ap-summary-today">
              <span>오늘 마감</span>
              <strong>{assignmentSummary.today}</strong>
              <small>개</small>
            </div>

            <div className="ap-summary-card ap-summary-soon">
              <span>3일 이내</span>
              <strong>{assignmentSummary.upcoming}</strong>
              <small>개</small>
            </div>

            <div className="ap-summary-card ap-summary-overdue">
              <span>마감 지남</span>
              <strong>{assignmentSummary.overdue}</strong>
              <small>개</small>
            </div>
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

          <div className="ap-card ap-stats-card">
            <h3>과제 통계</h3>

            <div className="ap-stats-grid">
              <div>
                <span>완료</span>
                <strong>{assignmentStats.completed}</strong>
              </div>

              <div>
                <span>미완료</span>
                <strong>{assignmentStats.incomplete}</strong>
              </div>

              <div>
                <span>긴급/마감지남</span>
                <strong>{assignmentStats.urgent}</strong>
              </div>

              <div>
                <span>평균 체크리스트</span>
                <strong>{assignmentStats.averageChecklistRate}%</strong>
              </div>
            </div>

            {subjectStats.length > 0 && (
              <div className="ap-subject-stats">
                {subjectStats.map(item => (
                  <span key={item.subject}>
                    {item.subject}: {item.completed}/{item.total} 완료
                  </span>
                ))}
              </div>
            )}
          </div>

          {overdueAssignments.length > 0 && (
            <div className="ap-card ap-overdue-list-card">
              <h3>마감 지난 미완료 과제</h3>

              <div className="ap-overdue-list">
                {overdueAssignments.map(assignment => (
                  <button
                    key={assignment.id}
                    type="button"
                    className="ap-overdue-list-item"
                    onClick={() => selectDate(assignment.dueDate)}
                  >
                    <strong>{assignment.title}</strong>
                    <span>
                      {assignment.subject} · {getDdayText(assignment.dueDate)} · {assignment.dueTime}까지
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
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
                  list="ap-subject-options"
                  value={subject}
                  placeholder="시간표 과목을 선택하거나 직접 입력하세요."
                  onChange={e => setSubject(e.target.value)}
                />

                <datalist id="ap-subject-options">
                  {savedLectures.map(lecture => (
                    <option key={lecture.id} value={lecture.name} />
                  ))}
                </datalist>

                <small className="ap-form-help">
                  시간표 과목명을 그대로 선택하면 학점계산기의 과제 제출률과 정확하게 연동됩니다.
                </small>
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
                <label>과제 유형 / 체크리스트 템플릿</label>

                <div className="ap-template-row">
                  <select value={assignmentType} onChange={e => setAssignmentType(e.target.value)}>
                    {Object.keys(checklistTemplates).map(type => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>

                  <button type="button" onClick={applyChecklistTemplate}>
                    템플릿 적용
                  </button>
                </div>

                <small className="ap-form-help">
                  보고서, 코딩, 발표 유형에 맞는 실수 예방 체크리스트를 빠르게 불러올 수 있습니다.
                </small>
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

                {mistakeHints.length > 0 && (
                  <div className="ap-mistake-hints">
                    <span>이전 실수 불러오기</span>

                    <div>
                      {mistakeHints.map(note => (
                        <button key={note} type="button" onClick={() => addMistakeHint(note)}>
                          {note.length > 18 ? `${note.slice(0, 18)}...` : note}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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
                      <span>유형: {assignment.assignmentType || '일반'}</span>
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
                        onClick={() => handleToggleCompleteWithChecklist(assignment)}
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