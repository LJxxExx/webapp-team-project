import React, { useState } from 'react'
import './EnrollmentPage.css'
import { coursePool } from '../data'

export default function EnrollmentPage({ isLoggedIn }) {
  const [enrolled, setEnrolled] = useState([])

  function toggle(id) {
    setEnrolled(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <div className={'enroll-page' + (!isLoggedIn ? ' blurred-section' : '')}>
      {!isLoggedIn && (
        <div className="section-blur-overlay"><span className="blur-label">'로그인이 필요합니다'</span></div>
      )}
      <h2 className="section-title">수강신청 연습</h2>
      <p className="enroll-sub">실제 수강신청 전 연습해보세요. 신청 내역은 저장되지 않습니다.</p>
      <div className="enroll-list">
        {coursePool.map(c => {
          const isFull = c.enrolled >= c.quota
          const isEnrolled = enrolled.includes(c.id)
          return (
            <div key={c.id} className={'enroll-card' + (isFull ? ' full' : '') + (isEnrolled ? ' enrolled' : '')}>
              <div className="enroll-info">
                <span className="enroll-name">{c.name}</span>
                <span className="enroll-meta">{c.credit}학점 · {c.professor} · {c.time}</span>
                <div className="enroll-quota-bar">
                  <div className="eq-track">
                    <div className="eq-fill" style={{ width: `${(c.enrolled / c.quota) * 100}%`, background: isFull ? '#ef4444' : '#3b82f6' }} />
                  </div>
                  <span className="eq-text">{c.enrolled}/{c.quota}</span>
                </div>
              </div>
              <button
                className={'enroll-btn' + (isEnrolled ? ' enroll-btn--cancel' : isFull ? ' enroll-btn--full' : '')}
                onClick={() => toggle(c.id)}
                disabled={isFull && !isEnrolled}
              >
                {isEnrolled ? '취소' : isFull ? '마감' : '신청'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
