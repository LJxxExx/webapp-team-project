import React, { useState } from 'react'
import './App.css'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import Timetable from './components/Timetable'
import GradeCalculator from './components/GradeCalculator'
import AssignmentPage from './components/AssignmentPage'
import EnrollmentPage from './components/EnrollmentPage'
import MyPage from './components/MyPage'
import { createTimetableEntries, lectureCatalog } from './data'

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

function AcademicSection() {
  return (
    <div className="academic-section">
      <h2 className="academic-title">학술 자료</h2>
      <p className="academic-desc">학술 논문 및 관련 자료 검색</p>
    </div>
  )
}

export default function App() {
  const [page, setPage]         = useState('main')
  const [prevPage, setPrevPage] = useState(null)
  const [direction, setDir]     = useState(1)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser]         = useState(null)
  const [animating, setAnimating] = useState(false)

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

  function renderContent(p) {
    switch (p) {
      case 'main':       return <><Timetable isLoggedIn={isLoggedIn} savedPlans={savedPlans} setSavedPlans={setSavedPlans} activePlan={activePlan} setActivePlan={setActivePlan} /><AcademicSection /></>
      case 'grade':      return <GradeCalculator isLoggedIn={isLoggedIn} savedLectures={savedLectures} />
      case 'assignment': return <AssignmentPage isLoggedIn={isLoggedIn} />
      case 'enroll':     return <EnrollmentPage isLoggedIn={isLoggedIn} />
      case 'mypage':     return <MyPage isLoggedIn={isLoggedIn} user={user} onLogin={login} onLogout={logout} />
      default:           return null
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
