import React, { useState } from 'react'
import axios from 'axios'
import SignupModal from './SignupModal'
import './LoginModal.css'

const API_BASE_URL = 'http://localhost:8000'

export default function LoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [studentId, setStudentId] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [isSignupOpen, setSignupOpen] = useState(false)

  if (!isOpen) return null

  const handleLogin = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    try {
      const res = await axios.post(`${API_BASE_URL}/api/login`, {
        student_id: studentId,
        password: password
      })
      onLoginSuccess(res.data)
      onClose()
    } catch (err) {
      if (err.response && err.response.data && err.response.data.detail) {
        setErrorMsg(err.response.data.detail)
      } else {
        setErrorMsg('로그인에 실패했습니다.')
      }
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="login-modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>로그인</h2>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>학번</label>
            <input 
              type="text" 
              value={studentId} 
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="학번을 입력하세요"
              required 
            />
          </div>
          <div className="form-group">
            <label>비밀번호</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              required 
            />
          </div>
          {errorMsg && <p className="error-msg">{errorMsg}</p>}
          <div className="login-actions">
            <button type="submit" className="btn-primary">로그인</button>
            <button type="button" className="btn-secondary" onClick={() => setSignupOpen(true)}>회원가입</button>
            <button type="button" className="btn-secondary" onClick={onClose}>취소</button>
          </div>
        </form>
      </div>
      <SignupModal isOpen={isSignupOpen} onClose={() => setSignupOpen(false)} />
    </div>
  )
}
