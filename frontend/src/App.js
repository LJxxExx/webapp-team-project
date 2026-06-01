import React, { useEffect, useState, useRef } from 'react'
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
import LoginModal from './components/LoginModal'


const API_BASE_URL = 'http://localhost:8000'

const PAGES = ['main', 'grade', 'assignment', 'enroll', 'mypage']



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
  const [isLoginModalOpen, setLoginModalOpen] = useState(false)
  
  // 전역 데이터 상태
  const [lectureCatalog, setLectureCatalog] = useState([])
  const [assignments, setAssignments] = useState([])
  const [savedPlans, setSavedPlans] = useState({
    plan1: [],
    plan2: [],
  })
  const [activePlan, setActivePlan] = useState('plan1')
  const [grades, setGrades] = useState({})

  // 데이터 임시 저장을 위한 useRef
  const dataRef = useRef({
    timetable: [],
    assignments: [],
    grades: {}
  })

  // 상태가 변경될 때마다 ref 업데이트
  useEffect(() => {
    dataRef.current = {
      timetable: savedPlans[activePlan] || [],
      assignments: assignments,
      grades: grades
    }
  }, [savedPlans, activePlan, assignments, grades])

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

  async function fetchUserData(studentId) {
    if (!studentId) return

    try {
      const res = await axios.get(`${API_BASE_URL}/api/users/${studentId}/data`)
      const data = res.data
      setSavedPlans(prev => ({
        ...prev,
        plan1: data.timetable || []
      }))
      setAssignments(data.assignments ? normalizeAssignments(data.assignments) : [])
      setGrades(data.grades || {})
    } catch (err) {
      console.error('사용자 데이터 로딩 실패:', err)
    }
  }

  function refreshUserData() {
    if (!user) return Promise.resolve()
    return fetchUserData(user.id)
  }

  // 데이터 저장 함수
  function saveUserData(forceData = null) {
    if (!isLoggedIn || !user) {
      alert('로그인이 필요합니다.')
      return
    }
    const dataToSync = forceData || dataRef.current
    axios.post(`${API_BASE_URL}/api/users/${user.id}/sync`, dataToSync)
      .then(() => console.log('데이터가 성공적으로 저장되었습니다.'))
      .catch(err => console.error('데이터 저장 실패:', err))
  }

  // Sidebar에서 과제를 클릭했을 때 AssignmentPage의 해당 날짜 상세 화면으로 이동시키기 위한 상태
  const [openAssignmentDate, setOpenAssignmentDate] = useState(null)

  // 현재 활성 시간표에서 고유 강의 목록 추출 (학점 계산기용)
  const savedLectures = (() => {
    const entries = savedPlans[activePlan] || []
    const seen = new Set()

    return entries.reduce((lectures, entry) => {
      const lectureKey = entry.lectureId ?? `${entry.lectureCode}-${entry.sectionCode}`
      if (!lectureKey || seen.has(String(lectureKey))) return lectures

      const catalogLecture = lectureCatalog.find(lecture => String(lecture.id) === String(entry.lectureId))
      const lecture = catalogLecture || {
        id: lectureKey,
        name: entry.name,
        credit: entry.credit ?? 3,
        professor: entry.professor,
      }

      seen.add(String(lectureKey))
      lectures.push(lecture)
      return lectures
    }, [])
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

  function login()  { setLoginModalOpen(true) }
  function handleLoginSuccess(userData) {
    setIsLoggedIn(true)
    setUser(userData)
  }
  function logout() { setIsLoggedIn(false); setUser(null) }


  // 과제 삭제
  function deleteAssignment(assignmentId) {
    if (!isLoggedIn) return
    setAssignments(prev =>
      prev.filter(assignment => assignment.id !== assignmentId)
    )
  }

  // 과제 제출 완료 / 완료 취소
  function toggleAssignmentComplete(assignmentId) {
    if (!isLoggedIn) return
    setAssignments(prev => {
      const updated = prev.map(assignment =>
        assignment.id === assignmentId
          ? { ...assignment, isCompleted: !assignment.isCompleted }
          : assignment
      )
      // 변경 후 바로 저장
      saveUserData({ ...dataRef.current, assignments: updated })
      return updated
    })
  }

  // 사용자 정보 업데이트 (학년 등)
  function updateUserProfile(newProfile) {
    if (!isLoggedIn || !user) return
    axios.put(`${API_BASE_URL}/api/users/${user.id}/profile`, newProfile)
      .then(res => {
        setUser(prev => ({ ...prev, grade: res.data.grade }))
      })
      .catch(err => console.error('프로필 업데이트 실패:', err))
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
              lectureCatalog={lectureCatalog}
              savedPlans={savedPlans}
              setSavedPlans={setSavedPlans}
              activePlan={activePlan}
              setActivePlan={setActivePlan}
              onRefreshData={refreshUserData}
              onSaveData={() => saveUserData({ ...dataRef.current, timetable: savedPlans[activePlan] || [] })}
            />
            <AcademicSection enrolledCourses={savedLectures}/>
          </>
        )
      case 'grade':
        return <GradeCalculator isLoggedIn={isLoggedIn} savedLectures={savedLectures} assignments={assignments} grades={grades} setGrades={setGrades} />
      case 'assignment':
        return (
          <AssignmentPage
            isLoggedIn={isLoggedIn}
            assignments={assignments}
            openDate={openAssignmentDate}
            onClearOpenDate={clearOpenAssignmentDate}
            onAddAssignment={(newAssign) => {
              const newId = Date.now()
              const created = {
                id: newId,
                title: newAssign.title,
                dueDate: newAssign.dueDate,
                dueTime: newAssign.dueTime || '23:59',
                priority: newAssign.priority || '보통',
                isCompleted: false
              }
              const updated = [...assignments, normalizeAssignment(created, assignments.length)]
              setAssignments(updated)
              saveUserData({ ...dataRef.current, assignments: updated })
            }}
            onUpdateAssignment={(updatedAssign) => {
              const updated = assignments.map(a =>
                a.id === updatedAssign.id ? normalizeAssignment(updatedAssign, 0) : a
              )
              setAssignments(updated)
              saveUserData({ ...dataRef.current, assignments: updated })
            }}
            onDeleteAssignment={deleteAssignment}
            onToggleComplete={toggleAssignmentComplete}
            onSaveData={() => saveUserData()} // Explicit save button call if needed
          />
        )
      case 'enroll':
        return <EnrollmentPage isLoggedIn={isLoggedIn} lectureCatalog={lectureCatalog} savedPlans={savedPlans} activePlan={activePlan} />
      case 'mypage':
        return <MyPage isLoggedIn={isLoggedIn} user={user} onLogin={login} onLogout={logout} onUpdateUser={updateUserProfile} />
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
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setLoginModalOpen(false)} 
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  )
}