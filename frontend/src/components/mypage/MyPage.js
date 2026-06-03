import React from 'react'
import './MyPage.css'

export default function MyPage({ isLoggedIn, user, onLogin, onLogout, onUpdateUser }) {
  if (!isLoggedIn) {
    return (
      <div className="mypage-login">
        <p className="mypage-login-msg">마이페이지를 보려면 로그인이 필요합니다.</p>
        <button className="btn-login" onClick={onLogin}>로그인</button>
      </div>
    )
  }

  const handleGradeChange = (e) => {
    if (onUpdateUser) {
      onUpdateUser({ grade: e.target.value })
    }
  }

  // 학년 옵션 설정
  const gradeOptions = ['1학년', '2학년', '3학년', '4학년']
  if (user.dept === '건축공학과') {
    gradeOptions.push('5학년')
  }
  gradeOptions.push('대학원')

  const currentGrade = user.grade || '1학년'

  return (
    <div className="mypage">
      <div className="mypage-card">
        <div className="mypage-avatar">{user.name[0]}</div>
        <div>
          <h2 className="mypage-name">{user.name}</h2>
          <p className="mypage-email">{user.email}</p>
        </div>
        <button className="btn-logout" onClick={onLogout}>로그아웃</button>
      </div>
      <div className="mypage-info-grid">
        <div className="mypage-info-item">
          <span className="mpi-label">학번</span>
          <span className="mpi-val">{user.id}</span>
        </div>
        <div className="mypage-info-item">
          <span className="mpi-label">학과</span>
          <span className="mpi-val">{user.dept}</span>
        </div>
        <div className="mypage-info-item">
          <span className="mpi-label">학년</span>
          <select className="mpi-select" value={currentGrade} onChange={handleGradeChange}>
            {gradeOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        <div className="mypage-info-item">
          <span className="mpi-label">학기</span>
          <span className="mpi-val">2026년 1학기</span>
        </div>
      </div>
    </div>
  )
}
