import React from 'react'
import './LoginRequiredSection.css'

// 로그인 블러 처리 및 안내 문구
export default function LoginRequiredSection({
  isLoggedIn,
  className = '',
  children,
  message = "'로그인이 필요합니다'",
}) {
  const locked = !isLoggedIn
  const classes = [
    className,
    'login-required-section',
    locked ? 'login-required-section-locked' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={classes}>
      {children}
      {locked && (
        <div className="login-required-overlay" aria-hidden="true">
          <span className="login-required-label">{message}</span>
        </div>
      )}
    </div>
  )
}
