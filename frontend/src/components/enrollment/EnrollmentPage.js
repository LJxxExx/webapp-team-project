/**
 * EnrollmentPage.js
 *
 * 수강신청 연습 페이지 컴포넌트
 *
 * 주요 기능:
 *  - 저장된 시간표(1안/2안)를 불러와 수강신청 화면으로 표시
 *  - 연습 시작/중단 버튼으로 실제 수강신청과 동일한 흐름 체험
 *  - 모든 과목 신청 완료 시 소요 시간을 측정하여 기록
 *  - 이전 기록보다 빠르면 "신기록" 배지 표시
 *  - 보안코드(2자리 숫자) 입력 후 신청/삭제 가능 (봇 방지 UI 모방)
 *  - 과목코드(5자리-2자리) 직접 입력으로도 신청 가능
 *
 * Props:
 *  - isLoggedIn   {boolean}   로그인 여부 (미로그인 시 LoginRequiredSection이 가로막음)
 *  - lectureCatalog {Array}   전체 강의 목록 (id, name, credit, category, meetings 등 포함)
 *  - savedPlans   {Object}    저장된 시간표 데이터 { plan1: [...], plan2: [...] }
 */

import React, { useEffect, useMemo, useState } from 'react';
import LoginRequiredSection from '../common/LoginRequiredSection';
import './EnrollmentPage.css';

// ─────────────────────────────────────────────
// 유틸 함수 (컴포넌트 외부에 정의 — 렌더마다 재생성 X)
// ─────────────────────────────────────────────

/**
 * 시(hour)와 분(minute)을 "H:MM" 형식 문자열로 변환
 * 예) (9, 0) → "9:00",  (14, 30) → "14:30"
 */
function formatClock(hour, minute = 0) {
    return `${Number(hour)}:${String(Number(minute || 0)).padStart(2, '0')}`;
}

/**
 * 강의실 이름을 짧은 약칭으로 변환
 * 테이블 셀 공간이 좁기 때문에 건물 이름을 1~2자로 축약
 * 예) "공학2호관 201" → "공 201",  "K-Cloud관 101" → "KC 101"
 */
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

/**
 * 강의 객체에서 "강좌번호-분반번호" 형태의 표시 코드를 생성
 * 예) { lectureCode: "12345", sectionCode: "01" } → "12345-01"
 */
function getLectureCode(lecture) {
    return `${lecture.lectureCode}-${lecture.sectionCode}`;
}

/**
 * lectureCatalog의 강의 객체로부터 "요일+시간~시간 강의실" 형식의 시간 문자열 생성
 * meetings 배열이 비어있으면 강의실 이름만 반환
 * 예) "월9:00~10:30 / 수9:00~10:30 공101"
 *
 * @param {Object} lecture - lectureCatalog 항목 (meetings, room 포함)
 */
function formatMeetingsFromLecture(lecture) {
    const meetings = lecture.meetings || [];
    if (meetings.length === 0) return formatRoom(lecture.room);
    return meetings
        .map(m => `${m.day}${formatClock(m.startHour, m.startMinute)}~${formatClock(m.endHour, m.endMinute)}`)
        .join(' / ') + ` ${formatRoom(lecture.room)}`;
}

/**
 * savedPlans의 시간표 항목(entries)으로부터 시간 문자열 생성
 * lectureCatalog에서 강의를 찾지 못했을 때의 대체 경로로 사용
 * room은 첫 번째 항목 기준으로 표시
 *
 * @param {Array} entries - 동일 lectureId를 가진 planEntry 배열
 */
function formatMeetingsFromEntries(entries) {
    if (entries.length === 0) return '';
    return entries
        .map(e => `${e.day}${formatClock(e.startHour, e.startMinute)}~${formatClock(e.endHour, e.endMinute)}`)
        .join(' / ') + ` ${formatRoom(entries[0].room)}`;
}

/**
 * planEntries 배열에서 중복 없는 lectureId 목록을 순서 유지하며 반환
 * Set을 활용해 삽입 순서를 보장하면서 중복 제거
 *
 * @param {Array} entries - savedPlans의 시간표 항목 배열
 * @returns {Array<string>} 중복 제거된 lectureId 배열
 */
function uniqueLectureIds(entries) {
    const seen = new Set();
    return entries
        .map(entry => entry.lectureId)
        .filter(id => id && !seen.has(id) && seen.add(id));
}

/**
 * 하나의 lectureId에 대해 수강신청 테이블에 표시할 과목 객체를 생성
 *
 * lectureCatalog에 강의 정보가 있으면 그걸 우선 사용하고,
 * 없으면 planEntries의 항목에서 최대한 정보를 복원 (미확인 과목 처리)
 *
 * @param {string} lectureId       - 대상 강의 ID
 * @param {Array}  planEntries     - 현재 안(plan1/plan2)의 시간표 항목 전체
 * @param {Array}  lectureCatalog  - 전체 강의 카탈로그
 * @returns {{ id, displayCode, name, credit, type, time, dayNight }}
 */
function buildPracticeCourse(lectureId, planEntries, lectureCatalog) {
    const lecture = lectureCatalog.find(item => item.id === lectureId);
    const entries = planEntries.filter(entry => entry.lectureId === lectureId);
    const firstEntry = entries[0];

    // lectureCatalog에서 강의 정보를 찾은 경우 → 정식 데이터 사용
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

    // lectureCatalog에 없는 경우 → 시간표 항목 데이터로 대체 표시
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


// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────

const EnrollmentPage = ({ isLoggedIn, lectureCatalog = [], savedPlans }) => {

    // ── 상태(State) 정의 ──────────────────────────

    // 현재 선택된 시간표 안 ('plan1' 또는 'plan2')
    const [localActivePlan, setLocalActivePlan] = useState('plan1');

    // 연습 중 신청 완료된 강의 id 목록
    const [practiceEnrolledIds, setPracticeEnrolledIds] = useState([]);

    // 화면에 표시되는 보안코드(랜덤 2자리)와 사용자가 입력한 값
    const [securityCode, setSecurityCode] = useState('');
    const [userInputCode, setUserInputCode] = useState('');

    // 과목코드 직접 입력 필드 (앞 5자리 / 뒤 2자리)
    const [directId1, setDirectId1] = useState('');
    const [directId2, setDirectId2] = useState('');

    // 1초마다 갱신되는 현재 시각 (서버 시간 흉내)
    const [serverTime, setServerTime] = useState(new Date());

    // 연습 진행 중 여부
    const [isPracticing, setIsPracticing] = useState(false);

    // 연습 시작 시점 (Date.now() 값, ms 단위)
    const [startTime, setStartTime] = useState(null);

    // 연습 완료 후 결과 모달 표시 여부
    const [showResult, setShowResult] = useState(false);

    // 마지막 연습 소요 시간 (초, 문자열)
    const [finalTime, setFinalTime] = useState('');

    // 모든 회차의 연습 기록 배열 [{ round: 1, time: "12.34" }, ...]
    const [practiceHistory, setPracticeHistory] = useState([]);

    // 가장 최근 완료 기록이 이전 최고 기록을 경신했는지 여부
    const [isRecord, setIsRecord] = useState(false);

    // ── 파생 데이터(Memo) ─────────────────────────

    // 현재 선택된 안(plan1/plan2)의 시간표 항목 배열
    // savedPlans가 없거나 해당 안이 비어있으면 빈 배열 반환
    const planEntries = useMemo(() => savedPlans?.[localActivePlan] || [], [savedPlans, localActivePlan]);

    // planEntries를 기반으로 수강신청 테이블에 표시할 과목 객체 배열
    // lectureId 중복 제거 후 각 강의별 표시 데이터를 빌드
    const practiceCourses = useMemo(() => (
        uniqueLectureIds(planEntries).map(lectureId => buildPracticeCourse(lectureId, planEntries, lectureCatalog))
    ), [planEntries, lectureCatalog]);

    // ── 사이드 이펙트(Effect) ─────────────────────

    // 1초 간격으로 서버 시간 갱신 (컴포넌트 언마운트 시 정리)
    useEffect(() => {
        const timer = setInterval(() => setServerTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // 1안/2안 탭 전환 시 연습 관련 상태를 모두 초기화
    // 다른 안을 보면서 직전 연습 내용이 남아있지 않도록 정리
    useEffect(() => {
        setPracticeEnrolledIds([]);
        setDirectId1('');
        setDirectId2('');
        setIsPracticing(false);
        setStartTime(null);
        setShowResult(false);
        generateCode();
    }, [localActivePlan]);

    // ── 파생 뷰 데이터 ────────────────────────────

    // 아직 신청하지 않은 과목 목록 (위쪽 "수강꾸러미 신청과목" 테이블에 표시)
    const availableCourses = practiceCourses.filter(course => !practiceEnrolledIds.includes(course.id));

    // 이미 신청 완료된 과목 목록 (아래쪽 "수강신청 과목" 테이블에 표시)
    const enrolledCourses = practiceCourses.filter(course => practiceEnrolledIds.includes(course.id));

    // ── 이벤트 핸들러 ─────────────────────────────

    /**
     * 새 보안코드를 생성하고 입력 필드를 초기화
     * 신청/삭제/추가 등 모든 액션이 끝난 후 호출되어 코드를 갱신
     * 10~99 사이의 2자리 난수 사용
     */
    const generateCode = () => {
        setSecurityCode(Math.floor(Math.random() * 90 + 10).toString());
        setUserInputCode('');
    };

    /**
     * 연습 시작 버튼 핸들러
     * 시간표에 과목이 없으면 경고 후 중단
     * 신청 목록을 초기화하고 타이머를 시작
     */
    const handleStartPractice = () => {
        if (practiceCourses.length === 0) {
            alert('시간표에 등록된 강의가 없습니다. 먼저 과목을 추가해 주세요!');
            return;
        }
        setPracticeEnrolledIds([]);
        setIsPracticing(true);
        setStartTime(Date.now());
        setShowResult(false);
        generateCode();
    };

    /**
     * 연습 중단 버튼 핸들러
     * 타이머를 중지하고 연습 진행 상태를 해제 (기록은 저장하지 않음)
     */
    const handleStopPractice = () => {
        setIsPracticing(false);
        setStartTime(null);
        alert('연습이 중단되었습니다.');
    };

    /**
     * 연습 초기화 버튼 핸들러
     * 신청 목록, 연습 기록 히스토리 등 모든 상태를 초기 상태로 되돌림
     */
    const handleReset = () => {
        setPracticeEnrolledIds([]);
        setIsPracticing(false);
        setStartTime(null);
        setShowResult(false);
        setPracticeHistory([]);
        generateCode();
        alert('모든 목록이 초기화되었습니다.');
    };

    /**
     * 과목 신청 처리
     * - 이미 신청된 과목은 무시
     * - 신청 후 남은 과목이 없으면 연습 종료 처리:
     *     소요 시간 계산 → 기록 갱신 여부 판단 → 결과 모달 표시
     *
     * @param {Object} course - 신청할 과목 객체
     */
    const enrollCourse = (course) => {
        if (practiceEnrolledIds.includes(course.id)) return;

        const nextEnrolledIds = [...practiceEnrolledIds, course.id];
        setPracticeEnrolledIds(nextEnrolledIds);
        alert(`${course.name} 신청이 완료되었습니다.`);

        // 모든 과목 신청 완료 여부 확인
        const remainingCount = practiceCourses.filter(c => !nextEnrolledIds.includes(c.id)).length;
        if (isPracticing && remainingCount === 0) {
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            setFinalTime(duration);

            // 이전 최고 기록보다 빠른지 확인 (첫 완료는 기록 없으므로 신기록 X)
            setPracticeHistory(prev => {
                const previousBest = prev.length > 0 ? Math.min(...prev.map(r => parseFloat(r.time))) : null;
                setIsRecord(previousBest !== null && parseFloat(duration) < previousBest);
                return [...prev, { round: prev.length + 1, time: duration }];
            });

            setIsPracticing(false);
            setShowResult(true);
        }
    };

    /**
     * 신청 취소(삭제) 처리
     * 신청 완료 목록에서 해당 과목 id를 제거하여 다시 신청 가능 상태로 되돌림
     *
     * @param {Object} course - 취소할 과목 객체
     */
    const cancelCourse = (course) => {
        setPracticeEnrolledIds(prev => prev.filter(id => id !== course.id));
        alert('삭제되었습니다.');
    };

    /**
     * 신청/삭제/직접추가 통합 액션 핸들러
     * 모든 버튼의 진입점 — 공통 유효성 검사 후 각 액션으로 분기
     *
     * 공통 검사:
     *  1. 로그인 여부 확인
     *  2. 보안코드 일치 여부 확인
     *
     * 액션별 처리:
     *  - 'enroll' : 과목 신청 (수강꾸러미 테이블의 "신청" 버튼)
     *  - 'cancel' : 과목 삭제 (수강신청 테이블의 "삭제" 버튼)
     *  - 'direct' : 과목코드 직접 입력 후 추가 ("+ 추가" 버튼 또는 Enter)
     *               5자리-2자리 형식 검증 → 시간표 내 과목인지 확인 → enrollCourse 호출
     *
     * @param {'enroll'|'cancel'|'direct'} action - 수행할 액션 종류
     * @param {Object|undefined} course            - enroll/cancel 시 대상 과목 객체
     */
    const handleAction = (action, course) => {
        if (!isLoggedIn) return;

        // 보안코드 불일치 시 차단
        if (userInputCode !== securityCode) {
            alert('보안코드를 정확히 입력해 주십시오.');
            return;
        }

        if (action === 'enroll' && course) {
            enrollCourse(course);
        } else if (action === 'cancel' && course) {
            cancelCourse(course);
        } else if (action === 'direct') {
            // 직접 입력 필드 미입력 체크
            if (!directId1 || !directId2) {
                alert('과목코드를 입력해 주세요.');
                return;
            }
            // 형식 검증: 앞 5자리 숫자 / 뒤 2자리 숫자
            if (!/^\d{5}$/.test(directId1) || !/^\d{2}$/.test(directId2)) {
                alert('요청을 처리하는 중 오류가 발생했습니다. (과목 코드를 확인하세요)');
                return;
            }
            const targetCode = `${directId1}-${directId2}`;
            // 현재 시간표에 해당 과목코드가 있는지 확인
            const targetCourse = practiceCourses.find(item => item.displayCode === targetCode);
            if (!targetCourse) {
                alert('요청을 처리하는 중 오류가 발생했습니다. (과목 코드를 확인하세요)');
                return;
            }
            // 이미 신청된 과목인지 확인
            if (practiceEnrolledIds.includes(targetCourse.id)) {
                alert('요청을 처리하는 중 오류가 발생했습니다. (과목 코드를 확인하세요)');
                return;
            }
            enrollCourse(targetCourse);
            setDirectId1('');
            setDirectId2('');
        }

        // 매 액션 후 보안코드 갱신
        generateCode();
    };

    // ── 렌더 ──────────────────────────────────────

    return (
        // 미로그인 시 로그인 안내 화면을 대신 보여주는 래퍼 컴포넌트
        <LoginRequiredSection isLoggedIn={isLoggedIn}>
            <div className="kmu-enroll-container">

                {/* ── 연습 완료 결과 모달 ─────────────────────
                    모든 과목 신청 완료 시 showResult가 true가 되어 표시
                    isRecord가 true이면 "신기록!" 배지 추가 노출 */}
                {showResult && (
                    <div className="result-modal-overlay">
                        <div className="result-modal">
                            {isRecord && <div className="record-badge">신기록!</div>}
                            <h2>연습 종료</h2>
                            <p>모든 과목을 신청하는 데<br /><strong>{finalTime}초</strong> 걸렸습니다.</p>
                            <button onClick={() => setShowResult(false)}>확인</button>
                        </div>
                    </div>
                )}

                {/* ── 상단 헤더: 서버 시간 + 연습 시작/중단 버튼 ─────────
                    isPracticing 상태에 따라 버튼 텍스트와 핸들러가 전환됨 */}
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

                {/* ── 연습 기록 히스토리 바 ────────────────────
                    기록이 1개 이상일 때만 표시, 최근 5개만 보임
                    가장 최근 기록이 신기록이면 해당 항목에 강조 스타일 + 트로피 이모지 */}
                {practiceHistory.length > 0 && (
                    <div className="history-bar">
                        <span className="history-label">연습 기록:</span>
                        <span className="history-records">
                            {practiceHistory.slice(-5).map((record, index, arr) => (
                                <span key={record.round}>
                                    {index > 0 && <span className="history-arrow"> → </span>}
                                    <span className={`history-item${index === arr.length - 1 && isRecord ? ' history-item-record' : ''}`}>
                                        {record.round}회차 {record.time}초
                                        {index === arr.length - 1 && isRecord && ' 🏆'}
                                    </span>
                                </span>
                            ))}
                        </span>
                    </div>
                )}

                {/* ── 1안 / 2안 전환 + 초기화 버튼 바 ────────
                    현재 활성 안은 'active' 클래스로 강조
                    초기화는 빨간 버튼으로 구분 */}
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

                {/* ── 수강꾸러미 신청과목 테이블 ───────────────
                    아직 신청하지 않은 과목만 표시 (availableCourses)
                    연습 중/대기 중 상태에 따라 안내 문구가 달라짐
                    "신청" 버튼 → handleAction('enroll', course) */}
                <h3 className="enroll-title">❚ 수강꾸러미 신청과목</h3>
                <p className="enroll-info-msg">
                    {isPracticing ? '현재 연습이 진행 중입니다. 빠르게 신청하세요!' : '수강 꾸러미 신청과목 중 수강신청이 완료된 과목은 보이지 않습니다.'}
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
                                <td></td><td>{course.displayCode}</td><td className="text-left">{course.name}</td>
                                <td>{course.credit}</td><td>{course.type}</td><td>{course.time}</td>
                                <td>{course.dayNight}</td><td>본교</td>
                                <td><button className="btn-small" onClick={() => handleAction('enroll', course)}>신청</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* ── 보안코드 입력 영역 ────────────────────────
                    securityCode[0]: 초록 배경, securityCode[1]: 회색 배경으로 표시
                    숫자만 입력 가능 (replace(/\D/g, '') 로 필터링)
                    Enter 키 입력 시 직접 추가(handleAction('direct')) 실행 */}
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
                            onChange={(e) => setUserInputCode(e.target.value.replace(/\D/g, ''))}
                            onKeyDown={(e) => e.key === 'Enter' && handleAction('direct')}
                            maxLength="2"
                        />
                    </div>
                    <span className="security-text">신청이나 추가, 삭제 시 왼쪽의 숫자를 반드시 입력해 주십시오.</span>
                </div>

                {/* ── 과목코드 직접 입력 + 수강신청 완료 테이블 ──
                    directId1(5자리) + directId2(2자리) 입력 후 "추가" 클릭
                    enrolledCourses: 신청 완료된 과목 목록
                    "삭제" 버튼 → handleAction('cancel', course) */}
                <h3 className="enroll-title">❚ 수강신청 과목</h3>
                <div className="direct-add-row">
                    <div className="direct-inputs">
                        <input type="text" className="input-5" value={directId1} onChange={(e) => setDirectId1(e.target.value.replace(/\D/g, ''))} maxLength="5" />
                        <span className="sep">-</span>
                        <input type="text" className="input-2" value={directId2} onChange={(e) => setDirectId2(e.target.value.replace(/\D/g, ''))} maxLength="2" />
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
                                <td></td><td>{course.displayCode}</td><td className="text-left">{course.name}</td>
                                <td>{course.credit}</td><td>{course.type}</td><td>{course.time}</td>
                                <td>{course.dayNight}</td><td>본교</td>
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
