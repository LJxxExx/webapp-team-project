import React from 'react'
import './Sidebar.css'
import { assignmentsData } from '../data'

export default function Sidebar({ isLoggedIn, user, onLogin, onLogout }) {
  return (
    <aside className="sidebar">
      {/* 로그인 카드 */}
      <div className="sidebar-card login-card">
        {isLoggedIn ? (
          <div className="login-info">
            <button className="btn-logout" onClick={onLogout}>로그아웃</button>
            <span className="login-username">{user.name}</span>
            <span className="login-detail">내 정보</span>
          </div>
        ) : (
          <div className="login-info">
            <button className="btn-login" onClick={onLogin}>테스트용 로그인</button>
            <span className="login-detail">내정보</span>
          </div>
        )}
      </div>

      {/* 과제 요약 카드 */}
      <div className="sidebar-card">
        <h3 className="sidebar-title">과제 요약</h3>
        <div className={'assignment-list' + (!isLoggedIn ? ' blurred' : '')}>
          {assignmentsData.map(a => (
            <label key={a.id} className="assignment-item">
              <input type="checkbox" defaultChecked={a.done} disabled={!isLoggedIn} />
              <div className="assignment-text">
                <span className="assignment-title">{a.title}</span>
                <span className={'assignment-due due-' + a.urgency}>{a.due}</span>
              </div>
            </label>
          ))}
        </div>
        {!isLoggedIn && (
          <p className="blur-msg">'로그인이 필요합니다'</p>
        )}
      </div>
    </aside>
  )
}
