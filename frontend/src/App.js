import React, { useEffect, useState } from 'react'
import axios from 'axios'
import './App.css'
import Navbar from './components/bar/Navbar'
import Sidebar from './components/bar/Sidebar'
import Timetable from './components/timetable/Timetable'
import GradeCalculator from './components/grade/GradeCalculator'
import AssignmentPage from './components/assignment/AssignmentPage'
import EnrollmentPage from './components/enrollment/EnrollmentPage'
import MyPage from './components/mypage/MyPage'
import AcademicSection from './components/academic/AcademicSection'


const API_BASE_URL = 'http://localhost:8000'

const TEST_USER = {
  name: 'UsrName',
  email: 'user@university.ac.kr',
  id: '20220001',
  dept: '컴퓨터공학과',
  grade: 3,
}

const PAGES = ['main', 'grade', 'assignment', 'enroll', 'mypage']

const ASSIGNMENT_STORAGE_KEY = 'assignment-dashboard-data'


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

  if (item.due && !dueDate) {
    if (item.due.includes('오늘')) {
      dueDate = formatDateKey(today)
    } else if (item.due.startsWith('D-')) {
      const days = Number(item.due.replace('D-', '').trim())
      const date = new Date(today)
      date.setDate(today.getDate() + days)
      dueDate = formatDateKey(date)
    } else if (item.due.match(/^\d{4}-\d{2}-\d{2}/)) {
      dueDate = item.due
    } else {
      dueDate = formatDateKey(fallbackDate)
    }
  }

  if (!dueDate) dueDate = formatDateKey(fallbackDate)

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
  
  // 전역 데이터 상태
  const [lectureCatalog, setLectureCatalog] = useState([])
  const [assignments, setAssignments] = useState([])
  const [savedPlans, setSavedPlans] = useState({
    plan1: [],
    plan2: [],
  })
  const [activePlan, setActivePlan] = useState('plan1')

  // 초기 로딩 및 로그인 시 데이터 페칭
  useEffect(() => {
    // 1. 전체 강의 목록 로드
    axios.get(`${API_BASE_URL}/api/lectures`)
      .then(res => setLectureCatalog(res.data))
      .catch(err => console.error('강의 목록 로딩 실패:', err))

    if (isLoggedIn && user) {
      fetchUserData(user.id)
    }
  }, [isLoggedIn, user])

  function fetchUserData(studentId) {
    // 2. 시간표 조회
    axios.get(`${API_BASE_URL}/api/users/${studentId}/timetable`)
      .then(res => {
        setSavedPlans(prev => ({
          ...prev,
          plan1: res.data
        }))
      })
      .catch(err => console.error('시간표 로딩 실패:', err))

    // 3. 과제 조회
    axios.get(`${API_BASE_URL}/api/users/${studentId}/assignments`)
      .then(res => {
        setAssignments(normalizeAssignments(res.data))
      })
      .catch(err => console.error('과제 로딩 실패:', err))
  }

  // Sidebar에서 과제를 클릭했을 때 AssignmentPage의 해당 날짜 상세 화면으로 이동시키기 위한 상태
  const [openAssignmentDate, setOpenAssignmentDate] = useState(null)

  // 현재 활성 시간표에서 고유 강의 목록 추출 (학점 계산기용)
  const savedLectures = (() => {
    const entries = savedPlans[activePlan] || []
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
    if (!isLoggedIn || !user) return
    const postData = {
      title: newAssignment.title,
      due: newAssignment.dueDate,
      urgency: newAssignment.priority === '긴급' ? 'today' : (newAssignment.priority === '높음' ? 'soon' : 'normal'),
      done: false
    }
    axios.post(`${API_BASE_URL}/api/users/${user.id}/assignments`, postData)
      .then(res => {
        setAssignments(prev => [...prev, normalizeAssignment(res.data, prev.length)])
      })
      .catch(err => console.error('과제 추가 실패:', err))
  }

  // 과제 수정
  function updateAssignment(updatedAssignment) {
    if (!isLoggedIn) return
    const putData = {
      title: updatedAssignment.title,
      due: updatedAssignment.dueDate,
      urgency: updatedAssignment.priority === '긴급' ? 'today' : (updatedAssignment.priority === '높음' ? 'soon' : 'normal'),
      done: updatedAssignment.isCompleted
    }
    axios.put(`${API_BASE_URL}/api/assignments/${updatedAssignment.id}`, putData)
      .then(res => {
        setAssignments(prev =>
          prev.map(assignment =>
            assignment.id === updatedAssignment.id ? normalizeAssignment(res.data, 0) : assignment
          )
        )
      })
      .catch(err => console.error('과제 수정 실패:', err))
  }

  // 과제 삭제
  function deleteAssignment(assignmentId) {
    if (!isLoggedIn) return
    axios.delete(`${API_BASE_URL}/api/assignments/${assignmentId}`)
      .then(() => {
        setAssignments(prev =>
          prev.filter(assignment => assignment.id !== assignmentId)
        )
      })
      .catch(err => console.error('과제 삭제 실패:', err))
  }

  // 과제 제출 완료 / 완료 취소
  function toggleAssignmentComplete(assignmentId) {
    if (!isLoggedIn) return
    const target = assignments.find(a => a.id === assignmentId)
    if (!target) return
    axios.put(`${API_BASE_URL}/api/assignments/${assignmentId}`, { done: !target.isCompleted })
      .then(res => {
        setAssignments(prev =>
          prev.map(assignment =>
            assignment.id === assignmentId
              ? { ...assignment, isCompleted: res.data.done }
              : assignment
          )
        )
      })
      .catch(err => console.error('과제 상태 변경 실패:', err))
  }

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
              user={user}
              savedPlans={savedPlans}
              setSavedPlans={setSavedPlans}
              activePlan={activePlan}
              setActivePlan={setActivePlan}
            />
            <AcademicSection enrolledCourses={savedLectures}/>
          </>
        )
      case 'grade':
        return <GradeCalculator isLoggedIn={isLoggedIn} savedLectures={savedLectures} assignments={assignments} />
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
        return <EnrollmentPage isLoggedIn={isLoggedIn} user={user} onRefreshData={() => fetchUserData(user.id)} />
      case 'mypage':
        return <MyPage isLoggedIn={isLoggedIn} user={user} onLogin={login} onLogout={logout} />
      default:
        return null
    }
  }

  return (
    <div className="app">
      <Navbar activePage={page} onNavigate={navigateTo} />
      <div className="layout">
        <Sidebar
          isLoggedIn={isLoggedIn}
          user={user}
          onLogin={login}
          onLogout={logout}
          assignments={assignments}
          onToggleAssignmentComplete={toggleAssignmentComplete}
          onOpenAssignment={openAssignmentFromSidebar}
        />
        <div className="content-viewport">
          {prevPage && (
            <div className={'content-panel panel-exit ' + (direction > 0 ? 'exit-left' : 'exit-right')}>
              {renderContent(prevPage)}
            </div>
          )}
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