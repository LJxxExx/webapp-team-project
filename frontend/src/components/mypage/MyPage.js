import React from 'react'
import './MyPage.css'

export default function MyPage({ isLoggedIn, user, onLogin, onLogout }) {
  if (!isLoggedIn) {
    return (
      <div className="mypage-login">
        <p className="mypage-login-msg">마이페이지를 보려면 로그인이 필요합니다.</p>
        <button className="btn-login" onClick={onLogin}>테스트용 로그인</button>
      </div>
    )
  }
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
        {[
          ['학번', user.id],
          ['학과', user.dept],
          ['학년', user.grade + '학년'],
          ['학기', (() => {
              const now = new Date();
              const year = now.getFullYear();
              const month = now.getMonth() + 1;
              const sem = month <= 6 ? 1 : 2;
            return `${year}년 ${sem}학기`;
          })()],
        ].map(([label, val]) => (
          <div key={label} className="mypage-info-item">
            <span className="mpi-label">{label}</span>
            <span className="mpi-val">{val}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
