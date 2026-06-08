/**
 * AcademicSection.jsx - 추천 학술 자료 캐러셀 컴포넌트
 * 
 * 시간표에 등록된 과목들과 관련된 학술 자료를 캐러셀 형태로 순환 표시합니다.
 * 3초마다 자동으로 다음 과목의 추천 자료로 전환됩니다.
 * 
 * @component
 * 
 * React 핵심 개념:
 * - useState: 현재 표시 중인 과목 인덱스를 관리하는 상태 훅
 * - useEffect: 컴포넌트 마운트 시 타이머를 설정하고, 언마운트 시 정리하는 부수효과 훅
 * - 조건부 렌더링: enrolledCourses 배열의 존재 여부에 따라 다른 UI를 표시
 * 
 * 데이터 흐름:
 * - App.js에서 isLoggedIn(로그인 상태)과 savedLectures(시간표에 등록된 강의 목록)를 props로 전달받음
 * - 로그인 상태가 아니면 시간표 정보를 표시하지 않음
 * - 컴포넌트 내부에서 더미 학술 자료 데이터를 생성하여 표시
 */

import React, { useState, useEffect } from "react"
import "./AcademicSection.css"

/**
 * AcademicSection 컴포넌트
 * 
 * @param {Object} props - 컴포넌트 props
 * @param {boolean} props.isLoggedIn - 로그인 상태 여부
 * @param {Array} props.enrolledCourses - 현재 시간표에 등록된 강의 목록 (savedLectures)
 *   - 각 항목은 { id, name, credit, professor, ... } 형태의 강의 객체
 * 
 * @returns {JSX.Element} 학술 자료 캐러셀 UI
 * 
 * @example
 * // App.js에서 사용 예시
 * <AcademicSection isLoggedIn={isLoggedIn} enrolledCourses={savedLectures} />
 */
export default function AcademicSection({ isLoggedIn, enrolledCourses }) {
  /**
   * 현재 표시 중인 과목의 인덱스
   * 
   * useState 훅을 사용하여 상태 관리:
   * - currentIndex: 현재 상태값 (읽기용)
   * - setCurrentIndex: 상태를 업데이트하는 함수
   * - 0: 초기값 (첫 번째 과목부터 시작)
   * 
   * 상태가 변경되면 React가 자동으로 컴포넌트를 리렌더링합니다.
   */
  const [currentIndex, setCurrentIndex] = useState(0)

  /**
   * 자동 슬라이드 타이머 설정
   * 
   * useEffect 훅의 동작:
   * 1. 첫 번째 인자 (콜백 함수): 부수효과 로직
   * 2. 두 번째 인자 (의존성 배열): [isLoggedIn, enrolledCourses]가 변경될 때만 effect 재실행
   * 
   * 클린업 함수 (return () => clearInterval):
   * - 컴포넌트 언마운트 시 또는 의존성 변경으로 effect 재실행 전에 호출
   * - 메모리 누수를 방지하기 위해 타이머를 정리해야 함
   * - 정리하지 않으면 컴포넌트가 사라져도 타이머가 계속 실행됨
   */
  useEffect(() => {
    // Early return: 로그인 상태가 아니거나 과목이 없으면 타이머 설정하지 않음
    if (!isLoggedIn || !enrolledCourses || enrolledCourses.length === 0) return

    /**
     * 3초마다 실행되는 인터벌 타이머
     * 
     * setCurrentIndex에 함수를 전달하는 패턴 (함수형 업데이트):
     * - prevIndex: 이전 상태값을 매개변수로 받음
     * - 이 패턴을 사용하면 항상 최신 상태값을 기준으로 업데이트 가능
     * - 클로저 문제 방지: 직접 currentIndex를 참조하면 오래된 값 참조 가능
     * 
     * 모듈러 연산 (% enrolledCourses.length):
     * - 마지막 과목 이후 첫 번째 과목으로 순환
     * - 예: 과목 3개일 때 2 → 0 → 1 → 2 → 0 ...
     */
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % enrolledCourses.length)
    }, 3000) // 3000ms = 3초

    /**
     * 클린업 함수: 타이머 정리
     * 
     * 호출 시점:
     * 1. 컴포넌트가 언마운트될 때
     * 2. isLoggedIn 또는 enrolledCourses가 변경되어 effect가 재실행되기 전
     * 
     * 반드시 필요한 이유:
     * - setInterval은 명시적으로 정리하지 않으면 계속 실행됨
     * - 컴포넌트가 사라진 후에도 setState를 호출하면 메모리 누수 및 경고 발생
     */
    return () => clearInterval(timer)
  }, [isLoggedIn, enrolledCourses]) // 의존성 배열: isLoggedIn 또는 enrolledCourses 변경 시에만 effect 재실행

  /**
   * 조건부 렌더링: 로그인 상태가 아닌 경우
   * 
   * 로그인하지 않은 사용자에게는 시간표 기반 추천 대신
   * 로그인 유도 메시지를 표시합니다.
   */
  if (!isLoggedIn) {
    return (
      <div className="academic-section">
        <h2 className="academic-title">추천 학술 자료</h2>
        <p className="academic-desc">로그인하면 시간표 기반 학술 자료를 추천받을 수 있습니다.</p>
        <div className="academic-footer">
          <a 
            href="https://www.dbpia.co.kr" 
            target="_blank" 
            rel="noopener noreferrer"
            className="dbpia-link"
          >
            DBpia에서 더 많은 자료 찾기 →
          </a>
        </div>
      </div>
    )
  }

  /**
   * 조건부 렌더링: 등록된 과목이 없는 경우
   * 
   * Early return 패턴으로 예외 상황을 먼저 처리하면:
   * - 코드 가독성 향상
   * - 이후 로직에서 null 체크 불필요
   */
  if (!enrolledCourses || enrolledCourses.length === 0) {
    return (
      <div className="academic-section">
        <h2 className="academic-title">추천 학술 자료</h2>
        <p className="academic-desc">현재 시간표에 등록된 과목이 없습니다.</p>
        <div className="academic-footer">
          <a 
            href="https://www.dbpia.co.kr" 
            target="_blank" 
            rel="noopener noreferrer"
            className="dbpia-link"
          >
            DBpia에서 더 많은 자료 찾기 →
          </a>
        </div>
      </div>
    )
  }

  /**
   * 안전한 인덱스 계산
   * 
   * enrolledCourses가 변경되어 길이가 줄어들면
   * currentIndex가 범위를 벗어날 수 있으므로 방어적 처리
   * 
   * 예: 과목 5개 → 3개로 감소, currentIndex가 4였다면 0으로 리셋
   */
  const safeIndex = currentIndex >= enrolledCourses.length ? 0 : currentIndex
  const currentCourse = enrolledCourses[safeIndex]
  
  /**
   * 더미 학술 자료 데이터
   * 
   * 실제 서비스에서는 API를 통해 과목별 추천 자료를 가져와야 함
   * 현재는 템플릿 리터럴을 사용하여 과목명을 동적으로 삽입
   */
  const dummyResources = [
    { id: 1, title: `[${currentCourse.name}] 관련 최신 연구 동향`, author: "name1", year: "2024" },
    { id: 2, title: `[${currentCourse.name}] 기초 이론 및 응용 사례`, author: "name2", year: "2025" },
    { id: 3, title: `[${currentCourse.name}] 학회지 게재 우수 논문`, author: "name3", year: "2026" },
  ]

  /**
   * JSX 렌더링
   * 
   * React의 선언적 UI:
   * - 상태(currentIndex, enrolledCourses)에 따라 UI가 자동으로 업데이트
   * - DOM 조작 코드 없이 원하는 UI 구조만 선언
   */
  return (
    <div className="academic-section">
      <h2 className="academic-title">추천 학술 자료</h2>

      <div className="academic-carousel">
        {/* 캐러셀 헤더: 현재 과목명과 페이지 인디케이터 */}
        <div className="academic-carousel-header">
          <h3 className="academic-course-name">{currentCourse.name}</h3>
          <span className="academic-indicator">
            {safeIndex + 1} / {enrolledCourses.length}
          </span>
        </div>

        {/* 
          학술 자료 목록 렌더링
          
          map() 함수를 사용한 리스트 렌더링:
          - 배열의 각 항목을 JSX 요소로 변환
          - key prop: React가 각 항목을 고유하게 식별하기 위해 필수
          - key는 형제 요소 간에만 고유하면 됨 (전역 고유 불필요)
          
          key가 중요한 이유:
          - React의 재조정(Reconciliation) 알고리즘이 효율적으로 DOM 업데이트
          - key 없이 리스트가 변경되면 전체 리스트를 다시 렌더링
          - 고유 key가 있으면 변경된 항목만 업데이트
        */}
        <ul className="academic-resource-list">
          {dummyResources.map((resource) => (
            <li key={resource.id} className="academic-resource-item">
              <span className="resource-title">{resource.title}</span>
              <span className="resource-meta">
                {resource.author} · {resource.year}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* 
        DBpia 링크 푸터
        
        target="_blank": 새 탭에서 열기
        rel="noopener noreferrer": 보안을 위한 필수 속성
          - noopener: 새 탭에서 window.opener 접근 차단 (탭 내빙 공격 방지)
          - noreferrer: Referer 헤더 전송 차단 (개인정보 보호)
      */}
      <div className="academic-footer">
        <a 
          href="https://www.dbpia.co.kr" 
          target="_blank" 
          rel="noopener noreferrer"
          className="dbpia-link"
        >
          DBpia에서 더 많은 자료 찾기 →
        </a>
      </div>
    </div>
  )
}
