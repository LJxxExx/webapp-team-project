import React from 'react'
import './Navbar.css'

const TABS = [
  { id: 'main',       label: '메인' },
  { id: 'grade',      label: '학점 계산기' },
  { id: 'assignment', label: '과제' },
  { id: 'enroll',     label: '수강신청 연습' },
  { id: 'mypage',     label: '마이페이지' },
]

export default function Navbar({ activePage, onNavigate }) {
  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={'nav-tab' + (activePage === tab.id ? ' nav-tab--active' : '')}
            onClick={() => onNavigate(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
