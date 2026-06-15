import React, { useState } from 'react'
import axios from 'axios'
import './SignupModal.css'

const API_BASE_URL = 'http://localhost:8000'

export default function SignupModal({ isOpen, onClose }) {
  const [email, setEmail] = useState('')
  const [studentId, setStudentId] = useState('')
  const [department, setDepartment] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  if (!isOpen) return null

  const hasInput = email.trim() !== '' || studentId.trim() !== '' || department.trim() !== '' || password.trim() !== '' || confirmPassword.trim() !== ''

  const handleOverlayClick = () => {
    if (hasInput) {
      if (window.confirm('입력한 정보가 사라집니다. 정말 닫으시겠습니까?')) {
        setEmail('')
        setStudentId('')
        setDepartment('')
        setPassword('')
        setConfirmPassword('')
        setErrorMsg('')
        onClose()
      }
    } else {
      onClose()
    }
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    
    if (studentId.length !== 7) {
      setErrorMsg('학번은 7자리여야 합니다.')
      return
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setErrorMsg('유효한 이메일 형식이 아닙니다.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMsg('비밀번호가 일치하지 않습니다.')
      return
    }

    try {
      await axios.post(`${API_BASE_URL}/api/signup`, {
        email,
        student_id: studentId,
        department,
        password
      })
      alert('회원가입이 완료되었습니다.')
      onClose()
    } catch (err) {
      if (err.response && err.response.data && err.response.data.detail) {
        setErrorMsg(err.response.data.detail)
      } else {
        setErrorMsg('회원가입에 실패했습니다.')
      }
    }
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="signup-modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>회원가입</h2>
        <form onSubmit={handleSignup}>
          <div className="form-group">
            <label>이메일</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일을 입력하세요"
              required 
            />
          </div>
          <div className="form-group">
            <label>학번 (7자리)</label>
            <input 
              type="text" 
              value={studentId} 
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="학번을 입력하세요 (예: 1234567)"
              maxLength={7}
              required 
            />
          </div>
          <div className="form-group">
            <label>학과</label>
            <input 
              type="text" 
              value={department} 
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="학과를 입력하세요"
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
          <div className="form-group">
            <label>비밀번호 확인</label>
            <input 
              type="password" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="비밀번호를 다시 입력하세요"
              required 
            />
          </div>
          {errorMsg && <p className="error-msg">{errorMsg}</p>}
          <div className="signup-actions">
            <button type="submit" className="btn-primary">가입하기</button>
            <button type="button" className="btn-secondary" onClick={onClose}>취소</button>
          </div>
        </form>
      </div>
    </div>
  )
}
