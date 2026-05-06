import React, { useEffect, useState } from 'react'
import './App.css'
import Navbar from './components/bar/Navbar'
import Sidebar from './components/bar/Sidebar'
import Timetable from './components/timetable/Timetable'
import GradeCalculator from './components/grade/GradeCalculator'
import AssignmentPage from './components/assignment/AssignmentPage'
import EnrollmentPage from './components/enrollment/EnrollmentPage'
import MyPage from './components/mypage/MyPage'
import { createTimetableEntries, lectureCatalog, assignmentsData } from './data'

const TEST_USER = {
  name: 'UsrName',
  email: 'user@university.ac.kr',
  id: '20210001',
  dept: '컴퓨터공학과',
  grade: 3,
}

const PAGES = ['main', 'grade', 'assignment', 'enroll', 'mypage']

const RECOMMENDED_PLAN_IDS = ['KMU-CSE3102-01', 'KMU-CSE1402-01', 'KMU-CSE2019-01', 'KMU-CSE1302-01']
const SECOND_PLAN_IDS      = ['KMU-CSE3127-01', 'KMU-CSE2019-01', 'KMU-GEN3104-03']

const ASSIGNMENT_STORAGE_KEY = 'assignment-dashboard-data'

function AcademicSection() {
  return (
    <div className="academic-section">
      <h2 className="academic-title">학술 자료</h2>
      <p className="academic-desc">학술 논문 및 관련 자료 검색</p>
    </div>
  )
}

// 날짜를 YYYY-MM-DD 형태로 변환
function formatDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

// 기존 data.js의 과제 더미 데이터를 실제 과제 관리 기능에서 쓰는 형태로 변환
function normalizeAssignment(item, index) {
  const today = new Date()
  const fallbackDate = new Date(today)
  fallbackDate.setDate(today.getDate() + index * 2)

  let dueDate = item.dueDate
  let dueTime = item.dueTime || '23:59'

  // 기존 더미 데이터가 due: "오늘 23:59 까지", due: "D-3" 같은 형태일 경우 변환
  if (!dueDate) {
    if (item.due && item.due.includes('오늘')) {
      dueDate = formatDateKey(today)
    } else if (item.due && item.due.startsWith('D-')) {
      const days = Number(item.due.replace('D-', '').trim())
      const date = new Date(today)
      date.setDate(today.getDate() + days)
      dueDate = formatDateKey(date)
    } else {
      dueDate = formatDateKey(fallbackDate)
    }
  }

  if (item.due && item.due.includes(':')) {
    const match = item.due.match(/(\d{1,2}:\d{2})/)
    if (match) {
      dueTime = match[1]
    }
  }

  return {
    id: item.id ?? Date.now() + index,
    title: item.title ?? '',
    subject: item.subject ?? '미지정 과목',
    dueDate,
    dueTime,
    priority:
      item.priority ??
      (item.urgency === 'today'
        ? '긴급'
        : item.urgency === 'soon'
          ? '높음'
          : '보통'),
    progress: Number(item.progress ?? 0),
    isCompleted: item.isCompleted ?? item.done ?? false,
    memo: item.memo ?? '',
    mistakeNote: item.mistakeNote ?? '',
    checklist:
      item.checklist ?? [
        { id: 1, text: '제출 파일 업로드 확인', checked: false },
        { id: 2, text: '파일명 형식 확인', checked: false },
        { id: 3, text: '제출 형식 확인', checked: false },
        { id: 4, text: '마감 시간 확인', checked: false },
        { id: 5, text: '과제 요구사항 재확인', checked: false },
        { id: 6, text: '이름/학번 기재 확인', checked: false },
        { id: 7, text: '제출 후 최종 확인', checked: false },
      ],
  }
}

function normalizeAssignments(list) {
  return list.map((item, index) => normalizeAssignment(item, index))
}

export default function App() {
  const [page, setPage]         = useState('main')
  const [prevPage, setPrevPage] = useState(null)
  const [direction, setDir]     = useState(1)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser]         = useState(null)
  const [animating, setAnimating] = useState(false)

  // ── 과제 상태를 App 레벨로 끌어올려 Sidebar와 AssignmentPage가 공유 ──
  const [assignments, setAssignments] = useState(() => {
    const saved = localStorage.getItem(ASSIGNMENT_STORAGE_KEY)

    if (saved) {
      try {
        return normalizeAssignments(JSON.parse(saved))
      } catch (error) {
        console.error('과제 데이터 불러오기 실패:', error)
      }
    }

    return normalizeAssignments(assignmentsData)
  })

  // Sidebar에서 과제를 클릭했을 때 AssignmentPage의 해당 날짜 상세 화면으로 이동시키기 위한 상태
  const [openAssignmentDate, setOpenAssignmentDate] = useState(null)

  // 과제 데이터가 바뀔 때마다 localStorage에 저장
  useEffect(() => {
    localStorage.setItem(ASSIGNMENT_STORAGE_KEY, JSON.stringify(assignments))
  }, [assignments])

  // ── 시간표 저장 상태를 App 레벨로 끌어올려 GradeCalculator와 공유 ──
  const [savedPlans, setSavedPlans] = useState({
    plan1: createTimetableEntries(lectureCatalog.filter(l => RECOMMENDED_PLAN_IDS.includes(l.id))),
    plan2: createTimetableEntries(lectureCatalog.filter(l => SECOND_PLAN_IDS.includes(l.id))),
  })
  const [activePlan, setActivePlan] = useState('plan1')

  // 현재 활성 시간표에서 고유 강의 목록 추출
  const savedLectures = (() => {
    const entries = savedPlans[activePlan]
    const seen = new Set()
    return entries
      .map(entry => lectureCatalog.find(l => l.id === entry.lectureId))
      .filter(l => l && !seen.has(l.id) && seen.add(l.id))
  })()

  function navigateTo(next) {
    if (next === page || animating) return
    const dir = PAGES.indexOf(next) > PAGES.indexOf(page) ? 1 : -1
    setDir(dir)
    setAnimating(true)
    setPrevPage(page)
    setPage(next)
    setTimeout(() => { setPrevPage(null); setAnimating(false) }, 380)
  }

  function login()  { setIsLoggedIn(true);  setUser(TEST_USER) }
  function logout() { setIsLoggedIn(false); setUser(null) }

  // 과제 추가
  function addAssignment(newAssignment) {
    setAssignments(prev => [...prev, newAssignment])
  }

  // 과제 수정
  function updateAssignment(updatedAssignment) {
    setAssignments(prev =>
      prev.map(assignment =>
        assignment.id === updatedAssignment.id ? updatedAssignment : assignment
      )
    )
  }

  // 과제 삭제
  function deleteAssignment(assignmentId) {
    setAssignments(prev =>
      prev.filter(assignment => assignment.id !== assignmentId)
    )
  }

  // 과제 제출 완료 / 완료 취소
  function toggleAssignmentComplete(assignmentId) {
    setAssignments(prev =>
      prev.map(assignment =>
        assignment.id === assignmentId
          ? { ...assignment, isCompleted: !assignment.isCompleted }
          : assignment
      )
    )
  }

  // Sidebar의 과제 요약에서 과제를 클릭하면 과제 페이지의 해당 날짜 상세 화면으로 이동
  function openAssignmentFromSidebar(assignment) {
    setOpenAssignmentDate(assignment.dueDate)
    navigateTo('assignment')
  }

  function clearOpenAssignmentDate() {
    setOpenAssignmentDate(null)
  }

  function renderContent(p) {
    switch (p) {
      case 'main':
        return (
          <>
            <Timetable
              isLoggedIn={isLoggedIn}
              savedPlans={savedPlans}
              setSavedPlans={setSavedPlans}
              activePlan={activePlan}
              setActivePlan={setActivePlan}
            />
            <AcademicSection />
          </>
        )

      case 'grade':
        return (
          <GradeCalculator
            isLoggedIn={isLoggedIn}
            savedLectures={savedLectures}
          />
        )

      case 'assignment':
        return (
          <AssignmentPage
            isLoggedIn={isLoggedIn}
            assignments={assignments}
            openDate={openAssignmentDate}
            onClearOpenDate={clearOpenAssignmentDate}
            onAddAssignment={addAssignment}
            onUpdateAssignment={updateAssignment}
            onDeleteAssignment={deleteAssignment}
            onToggleComplete={toggleAssignmentComplete}
          />
        )

      case 'enroll':
        return <EnrollmentPage isLoggedIn={isLoggedIn} />

      case 'mypage':
        return (
          <MyPage
            isLoggedIn={isLoggedIn}
            user={user}
            onLogin={login}
            onLogout={logout}
          />
        )

      default:
        return null
    }
  }

  return (
    <div className="app">

      {/* ① 네비바 — 항상 고정 */}
      <Navbar activePage={page} onNavigate={navigateTo} />

      {/* ② 사이드바 + 콘텐츠 뷰포트 — 항상 유지 */}
      <div className="layout">

        {/* 사이드바 — 어느 탭이든 고정 */}
        <Sidebar
          isLoggedIn={isLoggedIn}
          user={user}
          onLogin={login}
          onLogout={logout}
          assignments={assignments}
          onToggleAssignmentComplete={toggleAssignmentComplete}
          onOpenAssignment={openAssignmentFromSidebar}
        />

        {/* ③ 콘텐츠 뷰포트 — 이 안에서만 교체 */}
        <div className="content-viewport">

          {/* 나가는 콘텐츠 */}
          {prevPage && (
            <div className={'content-panel panel-exit ' + (direction > 0 ? 'exit-left' : 'exit-right')}>
              {renderContent(prevPage)}
            </div>
          )}

          {/* 들어오는 콘텐츠 */}
          <div className={'content-panel ' + (prevPage
            ? (direction > 0 ? 'panel-enter enter-right' : 'panel-enter enter-left')
            : 'panel-active'
          )}>
            {renderContent(page)}
          </div>

        </div>
      </div>
    </div>
  )
}