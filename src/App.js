import { useState } from 'react'
import Dashboard from './components/Dashboard'
import './App.css'

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div>
            <h1 className="app-title">학점 위험도 대시보드</h1>
            <p className="app-sub">팀 1 · 올인원 학업 지원 시스템</p>
          </div>
          <span className="semester-tag">2026년 1학기</span>
        </div>
      </header>
      <main className="app-main">
        <Dashboard />
      </main>
    </div>
  )
}

export default App
