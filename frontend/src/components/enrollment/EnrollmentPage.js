/*import React, { useState } from 'react'
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
}*/

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './EnrollmentPage.css';

const API_BASE_URL = 'http://localhost:8000';

/**
 * 수강신청 메인 컴포넌트
 * @param {boolean} isLoggedIn - 부모 컴포넌트로부터 전달받은 로그인 상태
 * @param {object} user - 현재 로그인한 사용자 정보
 * @param {function} onRefreshData - 상위 컴포넌트의 데이터를 갱신하기 위한 함수
 */
const EnrollmentPage = ({ isLoggedIn, user, onRefreshData }) => {
    // --------------------------------------------------------
    // [상태 관리] 
    // --------------------------------------------------------
    const [wishlist, setWishlist] = useState([]);
    const [enrolled, setEnrolled] = useState([]);
    const [securityCode, setSecurityCode] = useState('');
    const [userInputCode, setUserInputCode] = useState('');
    const [directId1, setDirectId1] = useState('');
    const [directId2, setDirectId2] = useState('');

    const generateCode = () => {
        const code = Math.floor(Math.random() * 90 + 10).toString();
        setSecurityCode(code);
        setUserInputCode('');
    };

    // 초기 데이터 로딩
    useEffect(() => {
        generateCode();
        if (isLoggedIn && user) {
            fetchData();
        }
    }, [isLoggedIn, user]);

    const fetchData = async () => {
        try {
            // 1. 전체 강의 목록 가져오기
            const lecturesRes = await axios.get(`${API_BASE_URL}/api/lectures`);
            const allLectures = lecturesRes.data.map(l => ({
                id: l.id,
                name: l.name,
                credit: l.credit,
                type: l.category,
                time: l.meetings.map(m => `${m.day}${m.startHour}:${String(m.startMinute).padStart(2, '0')}~${m.endHour}:${String(m.endMinute).padStart(2, '0')}`).join(' '),
                dayNight: '주간'
            }));

            // 2. 현재 사용자의 수강 신청 내역 가져오기
            const enrolledRes = await axios.get(`${API_BASE_URL}/api/users/${user.id}/timetable`);
            const enrolledIds = new Set(enrolledRes.data.map(e => e.lectureId));

            // 3. 신청 완료된 것은 enrolled로, 나머지는 wishlist로 (연습용 UI 유지)
            const currentEnrolled = allLectures.filter(l => enrolledIds.has(l.id));
            const currentWishlist = allLectures.filter(l => !enrolledIds.has(l.id));

            setEnrolled(currentEnrolled);
            setWishlist(currentWishlist);
        } catch (err) {
            console.error('데이터 로딩 실패:', err);
        }
    };

    const handleAction = async (action, course) => {
        if (userInputCode !== securityCode) {
            alert("보안코드를 정확히 입력해 주십시오.");
            return;
        }

        try {
            if (action === 'enroll') {
                await axios.post(`${API_BASE_URL}/api/users/${user.id}/enrollments`, { lecture_id: course.id });
                alert(`${course.name} 신청이 완료되었습니다.`);
            }
            else if (action === 'cancel') {
                await axios.delete(`${API_BASE_URL}/api/users/${user.id}/enrollments/${course.id}`);
                alert("삭제되었습니다.");
            }
            else if (action === 'direct') {
                const fullId = `${directId1}-${directId2}`; // 실제로는 DB에 존재하는 ID여야 함
                if (!directId1 || !directId2) {
                    alert("과목코드를 입력해 주세요.");
                    return;
                }
                // 직접 추가 기능도 백엔드 연결 가능 (여기서는 간소화)
                await axios.post(`${API_BASE_URL}/api/users/${user.id}/enrollments`, { lecture_id: fullId });
                alert("추가되었습니다.");
                setDirectId1(''); setDirectId2('');
            }

            // 성공 후 데이터 다시 불러오기 및 상위 컴포넌트 알림
            fetchData();
            if (onRefreshData) onRefreshData();
        } catch (err) {
            console.error('작업 실패:', err);
            alert('요청을 처리하는 중 오류가 발생했습니다. (과목 코드를 확인하세요)');
        }

        generateCode();
    };

    return (
        <div className={'kmu-enroll-container' + (!isLoggedIn ? ' blurred-section' : '')}>
            
            {!isLoggedIn && (
                <div className="section-blur-overlay">
                    <span className="blur-label">'로그인이 필요합니다'</span>
                </div>
            )}

            <h3 className="enroll-title">❚ 수강꾸러미 신청과목</h3>
            <p className="enroll-info-msg">수강 꾸러미 신청과목 중 수강신청이 완료된 과목은 보이지 않습니다.</p>

            <table className="enroll-table">
                <thead>
                    <tr>
                        <th>재수강</th><th>강좌번호</th><th>교과목명</th><th>학점</th><th>이수구분</th><th>강의시간(강의실)</th><th>주/야</th><th>캠퍼스</th><th>신청</th>
                    </tr>
                </thead>
                <tbody>
                    {wishlist.map(c => (
                        <tr key={c.id}>
                            <td></td><td>{c.id}</td><td className="text-left">{c.name}</td><td>{c.credit}</td><td>{c.type}</td><td>{c.time}</td><td>{c.dayNight}</td><td>본교</td>
                            <td><button className="btn-small" onClick={() => handleAction('enroll', c)}>신청</button></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="enroll-security-wrap">
                <div className="security-box">
                    <span className="code-digit bg-green">{securityCode[0]}</span>
                    <span className="code-digit bg-gray">{securityCode[1]}</span>
                </div>
                <input
                    type="text"
                    className="security-field"
                    value={userInputCode}
                    onChange={(e) => setUserInputCode(e.target.value)}
                    maxLength="2"
                />
                <span className="security-text">신청이나 추가, 삭제 시 왼쪽의 숫자를 반드시 입력해 주십시오.</span>
            </div>

            <h3 className="enroll-title">❚ 수강신청 과목</h3>
            <div className="direct-add-row">
                <div className="direct-inputs">
                    <input type="text" className="input-5" value={directId1} onChange={(e) => setDirectId1(e.target.value)} maxLength="5" />
                    <span className="sep">-</span>
                    <input type="text" className="input-2" value={directId2} onChange={(e) => setDirectId2(e.target.value)} maxLength="2" />
                    <span className="direct-msg">신청할 과목코드(5자리-2자리)를 입력한 후 '추가'버튼을 누르십시오.</span>
                </div>
                <button className="btn-add-submit" onClick={() => handleAction('direct')}>+ 추가</button>
            </div>

            <table className="enroll-table enrolled-list">
                <thead>
                    <tr>
                        <th>재수강</th><th>강좌번호</th><th>교과목명</th><th>학점</th><th>이수구분</th><th>강의시간(강의실)</th><th>주/야</th><th>캠퍼스</th><th>신청</th>
                    </tr>
                </thead>
                <tbody>
                    {enrolled.map(c => (
                        <tr key={c.id}>
                            <td></td><td>{c.id}</td><td className="text-left">{c.name}</td><td>{c.credit}</td><td>{c.type}</td><td>{c.time}</td><td>{c.dayNight}</td><td>본교</td>
                            <td><button className="btn-small btn-del" onClick={() => handleAction('cancel', c)}>삭제</button></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default EnrollmentPage;