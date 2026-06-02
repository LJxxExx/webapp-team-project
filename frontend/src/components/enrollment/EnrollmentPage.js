import React, { useEffect, useMemo, useState } from 'react';
import LoginRequiredSection from '../common/LoginRequiredSection';
import './EnrollmentPage.css';

function formatClock(hour, minute = 0) {
    return `${Number(hour)}:${String(Number(minute || 0)).padStart(2, '0')}`;
}

function formatRoom(room) {
    if (!room) return '';

    return room
        .replace(/^공학\d호관\s*/, '공')
        .replace(/^의양관\s*/, '의')
        .replace(/^영암관\s*/, '영')
        .replace(/^백은관\s*/, '백')
        .replace(/^쉐턱관\s*/, '쉐')
        .replace(/^오산관\s*/, '오')
        .replace(/^덕래관\s*/, '덕')
        .replace(/^스미스관\s*/, '스')
        .replace(/^동천관\s*/, '동')
        .replace(/^대명비사관\s*/, '대')
        .replace(/^바우어관\s*/, '바')
        .replace(/^교양관\s*/, '교')
        .replace(/^사범관\s*/, '사')
        .replace(/^체육관\s*/, '체')
        .replace(/^약학관\s*/, '약')
        .replace(/^아담스채플\s*/, '채')
        .replace(/^Tabula Rasa관\s*/, 'TR')
        .replace(/^K-Cloud관\s*/, 'KC');
}

function getLectureCode(lecture) {
    return `${lecture.lectureCode}-${lecture.sectionCode}`;
}

function formatMeetingsFromLecture(lecture) {
    const meetings = lecture.meetings || [];
    if (meetings.length === 0) return formatRoom(lecture.room);

    return meetings
        .map(meeting => `${meeting.day}${formatClock(meeting.startHour, meeting.startMinute)}~${formatClock(meeting.endHour, meeting.endMinute)}`)
        .join(' / ') + ` ${formatRoom(lecture.room)}`;
}

function formatMeetingsFromEntries(entries) {
    if (entries.length === 0) return '';

    return entries
        .map(entry => `${entry.day}${formatClock(entry.startHour, entry.startMinute)}~${formatClock(entry.endHour, entry.endMinute)}`)
        .join(' / ') + ` ${formatRoom(entries[0].room)}`;
}

function uniqueLectureIds(entries) {
    const seen = new Set();
    return entries
        .map(entry => entry.lectureId)
        .filter(id => id && !seen.has(id) && seen.add(id));
}

function buildPracticeCourse(lectureId, planEntries, lectureCatalog) {
    const lecture = lectureCatalog.find(item => item.id === lectureId);
    const entries = planEntries.filter(entry => entry.lectureId === lectureId);
    const firstEntry = entries[0];

    if (lecture) {
        return {
            id: lecture.id,
            displayCode: getLectureCode(lecture),
            name: lecture.name,
            credit: lecture.credit,
            type: lecture.category,
            time: formatMeetingsFromLecture(lecture),
            dayNight: '주간',
        };
    }

    return {
        id: lectureId,
        displayCode: firstEntry ? `${firstEntry.lectureCode}-${firstEntry.sectionCode}` : lectureId,
        name: firstEntry?.name || '미확인 과목',
        credit: firstEntry?.credit || '',
        type: '시간표 과목',
        time: formatMeetingsFromEntries(entries),
        dayNight: '주간',
    };
}

const EnrollmentPage = ({ isLoggedIn, lectureCatalog = [], savedPlans }) => {
    // 1. 수강신청 연습 및 서버시간 관련 로컬 상태 선언
    const [localActivePlan, setLocalActivePlan] = useState('plan1');
    const [practiceEnrolledIds, setPracticeEnrolledIds] = useState([]);
    const [securityCode, setSecurityCode] = useState('');
    const [userInputCode, setUserInputCode] = useState('');
    const [directId1, setDirectId1] = useState('');
    const [directId2, setDirectId2] = useState('');

    const [serverTime, setServerTime] = useState(new Date());
    const [isPracticing, setIsPracticing] = useState(false);
    const [startTime, setStartTime] = useState(null);
    const [showResult, setShowResult] = useState(false);
    const [finalTime, setFinalTime] = useState('');

    // 2. 선택한 로컬 탭(1안/2안)에 따른 시간표 데이터 연동
    const planEntries = useMemo(() => savedPlans?.[localActivePlan] || [], [savedPlans, localActivePlan]);
    
    const practiceCourses = useMemo(() => (
        uniqueLectureIds(planEntries).map(lectureId => buildPracticeCourse(lectureId, planEntries, lectureCatalog))
    ), [planEntries, lectureCatalog]);

    const practiceCourseKey = practiceCourses.map(course => course.id).join('|');

    // 3. 실시간 서버 시간 타이머 시계
    useEffect(() => {
        const timer = setInterval(() => {
            setServerTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const generateCode = () => {
        const code = Math.floor(Math.random() * 90 + 10).toString();
        setSecurityCode(code);
        setUserInputCode('');
    };

    // 4. 로컬 탭(1안/2안)이 바뀔 때 연습 상태 깔끔하게 리셋
    useEffect(() => {
        setPracticeEnrolledIds([]);
        setDirectId1('');
        setDirectId2('');
        setIsPracticing(false);
        setStartTime(null);
        setShowResult(false);
        generateCode();
    }, [localActivePlan]);

    const availableCourses = practiceCourses.filter(course => !practiceEnrolledIds.includes(course.id));
    const enrolledCourses = practiceCourses.filter(course => practiceEnrolledIds.includes(course.id));

    // 5. 기능 핸들러 함수들
    const handleStartPractice = () => {
        if (practiceCourses.length === 0) {
            alert("시간표에 등록된 강의가 없습니다. 먼저 과목을 추가해 주세요!");
            return;
        }
        setPracticeEnrolledIds([]);
        setIsPracticing(true);
        setStartTime(Date.now());
        setShowResult(false);
        generateCode();
    };

    const handleStopPractice = () => {
        setIsPracticing(false);
        setStartTime(null);
        alert("연습이 중단되었습니다.");
    };

    const handleReset = () => {
        setPracticeEnrolledIds([]);
        setIsPracticing(false);
        setStartTime(null);
        setShowResult(false);
        generateCode();
        alert("모든 목록이 초기화되었습니다.");
    };

    const enrollCourse = (course) => {
        const isAlreadyEnrolled = practiceEnrolledIds.includes(course.id);
        if (isAlreadyEnrolled) return;

        const nextEnrolledIds = [...practiceEnrolledIds, course.id];
        setPracticeEnrolledIds(nextEnrolledIds);
        alert(`${course.name} 신청이 완료되었습니다.`);

        // 모든 과목 다 신청했는지 확인 후 모달창 띄우기
        const remainingCount = practiceCourses.filter(c => !nextEnrolledIds.includes(c.id)).length;
        if (isPracticing && remainingCount === 0) {
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            setFinalTime(duration);
            setIsPracticing(false);
            setShowResult(true);
        }
    };

    const cancelCourse = (course) => {
        setPracticeEnrolledIds(prev => prev.filter(id => id !== course.id));
        alert("삭제되었습니다.");
    };

    const handleAction = (action, course) => {
        if (!isLoggedIn) return;

        if (userInputCode !== securityCode) {
            alert('보안코드를 정확히 입력해 주십시오.');
            return;
        }

        if (action === 'enroll' && course) {
            enrollCourse(course);
        } else if (action === 'cancel' && course) {
            cancelCourse(course);
        } else if (action === 'direct') {
            if (!directId1 || !directId2) {
                alert('과목코드를 입력해 주세요.');
                return;
            }

            if (!/^\d{5}$/.test(directId1) || !/^\d{2}$/.test(directId2)) {
                alert('요청을 처리하는 중 오류가 발생했습니다. (과목 코드를 확인하세요)');
                return;
            }

            const targetCode = `${directId1}-${directId2}`;
            const targetCourse = practiceCourses.find(item => item.displayCode === targetCode);

            if (!targetCourse) {
                alert('요청을 처리하는 중 오류가 발생했습니다. (과목 코드를 확인하세요)');
                return;
            }

            if (practiceEnrolledIds.includes(targetCourse.id)) {
                alert('요청을 처리하는 중 오류가 발생했습니다. (과목 코드를 확인하세요)');
                return;
            }

            enrollCourse(targetCourse);
            setDirectId1('');
            setDirectId2('');
        }

        generateCode();
    };

    return (
        <LoginRequiredSection isLoggedIn={isLoggedIn}>
            {/* 🚨 다른 페이지 침범을 원천 봉쇄하는 마법의 단일 최상위 울타리 클래스 */}
            <div className="kmu-enroll-container">
                
                {/* 6. 연습 종료시 뜨는 결과창 모달 */}
                {showResult && (
                    <div className="result-modal-overlay">
                        <div className="result-modal">
                            <h2>연습 종료</h2>
                            <p>모든 과목을 신청하는 데<br /><strong>{finalTime}초</strong> 걸렸습니다.</p>
                            <button onClick={() => setShowResult(false)}>확인</button>
                        </div>
                    </div>
                )}

                {/* 7. 상단 서버 시간 및 연습 버튼 바 */}
                <div className="practice-header">
                    <div className="server-time-box">
                        <span className="time-label">현재 서버시간:</span>
                        <span className="time-value">{serverTime.toLocaleTimeString()}</span>
                    </div>
                    <div className="practice-btns">
                        {!isPracticing ? (
                            <button className="btn-start" onClick={handleStartPractice}>연습 시작</button>
                        ) : (
                            <button className="btn-stop" onClick={handleStopPractice}>연습 중단</button>
                        )}
                    </div>
                </div>

                {/* 8. 1안 / 2안 / 초기화 선택 메뉴 바 */}
                <div className="plan-selection-bar">
                    <button 
                        className={`btn-plan ${localActivePlan === 'plan1' ? 'active' : ''}`} 
                        onClick={() => setLocalActivePlan('plan1')}
                    >
                        1안 보기
                    </button>
                    <button 
                        className={`btn-plan btn-plan-gray ${localActivePlan === 'plan2' ? 'active' : ''}`} 
                        onClick={() => setLocalActivePlan('plan2')}
                    >
                        2안 보기
                    </button>
                    <button onClick={handleReset} className="btn-plan btn-plan-red">
                        연습 초기화
                    </button>
                </div>

                {/* 9. 수강꾸러미 목록 테이블 영역 */}
                <h3 className="enroll-title">❚ 수강꾸러미 신청과목</h3>
                <p className="enroll-info-msg">
                    {isPracticing ? "현재 연습이 진행 중입니다. 빠르게 신청하세요!" : "수강 꾸러미 신청과목 중 수강신청이 완료된 과목은 보이지 않습니다."}
                </p>

                <table className="enroll-table">
                    <thead>
                        <tr>
                            <th>재수강</th><th>강좌번호</th><th>교과목명</th><th>학점</th><th>이수구분</th><th>강의시간(강의실)</th><th>주/야</th><th>캠퍼스</th><th>신청</th>
                        </tr>
                    </thead>
                    <tbody>
                        {availableCourses.length === 0 ? (
                            <tr><td colSpan="9">신청 가능한 과목이 없습니다.</td></tr>
                        ) : availableCourses.map(course => (
                            <tr key={course.id}>
                                <td></td><td>{course.displayCode}</td><td className="text-left">{course.name}</td><td>{course.credit}</td><td>{course.type}</td><td>{course.time}</td><td>{course.dayNight}</td><td>본교</td>
                                <td><button className="btn-small" onClick={() => handleAction('enroll', course)}>신청</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* 10. 보안코드 입력 영역 */}
                <div className="enroll-security-wrap">
                    <div className="security-code-entry">
                        <div className="security-box">
                            <span className="code-digit bg-green">{securityCode[0]}</span>
                            <span className="code-digit bg-gray">{securityCode[1]}</span>
                        </div>
                        <input
                            type="text"
                            className="security-field"
                            value={userInputCode}
                            onChange={(event) => setUserInputCode(event.target.value.replace(/\D/g, ''))}
                            maxLength="2"
                        />
                    </div>
                    <span className="security-text">신청이나 추가, 삭제 시 왼쪽의 숫자를 반드시 입력해 주십시오.</span>
                </div>

                {/* 11. 직접 입력 및 수강신청 완료 목록 테이블 영역 */}
                <h3 className="enroll-title">❚ 수강신청 과목</h3>
                <div className="direct-add-row">
                    <div className="direct-inputs">
                        <input type="text" className="input-5" value={directId1} onChange={(event) => setDirectId1(event.target.value.replace(/\D/g, ''))} maxLength="5" />
                        <span className="sep">-</span>
                        <input type="text" className="input-2" value={directId2} onChange={(event) => setDirectId2(event.target.value.replace(/\D/g, ''))} maxLength="2" />
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
                        {enrolledCourses.length === 0 ? (
                            <tr><td colSpan="9">수강신청한 과목이 없습니다.</td></tr>
                        ) : enrolledCourses.map(course => (
                            <tr key={course.id}>
                                <td></td><td>{course.displayCode}</td><td className="text-left">{course.name}</td><td>{course.credit}</td><td>{course.type}</td><td>{course.time}</td><td>{course.dayNight}</td><td>본교</td>
                                <td><button className="btn-small btn-del" onClick={() => handleAction('cancel', course)}>삭제</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </LoginRequiredSection>
    );
};

export default EnrollmentPage;