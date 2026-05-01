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
import './EnrollmentPage.css';

/**
 * 수강신청 메인 컴포넌트
 * @param {boolean} isLoggedIn - 부모 컴포넌트로부터 전달받은 로그인 상태
 */
const EnrollmentPage = ({ isLoggedIn }) => {
    // --------------------------------------------------------
    // [상태 관리] 
    // --------------------------------------------------------
    const [wishlist, setWishlist] = useState([
        { id: '23001-11', name: '영화와만난커뮤니케이션', credit: 3, type: '균형교양', time: '화3:00~10:15 목15:00~16:15', dayNight: '주간' },
        { id: '23750-02', name: '웹어플리케이션', credit: 3, type: '전공선택', time: '화13:30~15:20 목10:30~12:20', dayNight: '주간' },
        { id: '23751-03', name: '컴퓨터네트워크', credit: 3, type: '전공선택', time: '월12:00~13:15 수16:30~17:45', dayNight: '주간' },
        { id: '23788-01', name: '운영체제', credit: 3, type: '전공선택', time: '월15:00~16:15 목9:00~10:15', dayNight: '주간' },
    ]);

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

    useEffect(() => {
        generateCode();
    }, []);

    const handleAction = (action, course) => {
        if (userInputCode !== securityCode) {
            alert("보안코드를 정확히 입력해 주십시오.");
            return;
        }

        if (action === 'enroll') {
            setEnrolled([...enrolled, course]);
            setWishlist(wishlist.filter(c => c.id !== course.id));
            alert(`${course.name} 신청이 완료되었습니다.`);
        }
        else if (action === 'cancel') {
            setWishlist([...wishlist, course]);
            setEnrolled(enrolled.filter(c => c.id !== course.id));
            alert("삭제되었습니다.");
        }
        else if (action === 'direct') {
            const fullId = `${directId1}-${directId2}`;
            if (!directId1 || !directId2) {
                alert("과목코드를 입력해 주세요.");
                return;
            }
            const newCourse = { id: fullId, name: '직접추가과목', credit: 3, type: '전공선택', time: '시간 미지정', dayNight: '주간' };
            setEnrolled([...enrolled, newCourse]);
            setDirectId1(''); setDirectId2('');
            alert("추가되었습니다.");
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