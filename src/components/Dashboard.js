import { useAppStore } from '../store/useAppStore'
import CourseCard from './CourseCard'
import DetailPanel from './DetailPanel'
import TimetableSync from './TimetableSync'
import { calcRisk } from '../utils/riskCalc'
import { useState } from 'react'

export default function Dashboard() {
  const { getMergedCourses, selectedCourseId, selectCourse } = useAppStore()
  const courses = getMergedCourses()
  const selected = courses.find(c => c.id === selectedCourseId)

  const dangerCount = courses.filter(c => calcRisk(c).level === 'danger').length
  const avgRisk = courses.length
    ? Math.round(courses.reduce((sum, c) => sum + calcRisk(c).risk, 0) / courses.length)
    : 0
  const totalCredits = courses.reduce((sum, c) => sum + c.credit, 0)

  return (
    <div className="dashboard">
      {/* 요약 카드 */}
      <div className="summary-grid">
        <div className="sum-card">
          <span className="sum-label">수강 과목</span>
          <span className="sum-val">{courses.length}<small>과목</small></span>
        </div>
        <div className="sum-card">
          <span className="sum-label">총 학점</span>
          <span className="sum-val">{totalCredits}<small>학점</small></span>
        </div>
        <div className="sum-card">
          <span className="sum-label">위험 과목</span>
          <span className={`sum-val ${dangerCount > 0 ? 'danger' : ''}`}>
            {dangerCount}<small>과목</small>
          </span>
        </div>
        <div className="sum-card">
          <span className="sum-label">평균 위험도</span>
          <span className="sum-val">{courses.length ? avgRisk : '—'}<small>점</small></span>
        </div>
      </div>

      {/* 시간표 연동 패널 */}
      <TimetableSync />

      <div className="content-area">
        {/* 왼쪽: 수업 목록 */}
        <div className="course-section">
          <div className="section-header">
            <span className="section-label">강의 목록 ({courses.length}개)</span>
          </div>
          <div className="course-list">
            {courses.map(course => (
              <CourseCard
                key={course.id}
                course={course}
                isSelected={selectedCourseId === course.id}
                onClick={() => selectCourse(course.id)}
              />
            ))}
            {courses.length === 0 && (
              <p className="empty-msg">시간표에서 강의를 불러와 주세요</p>
            )}
          </div>
        </div>

        {/* 오른쪽: 상세 패널 */}
        {selected && <DetailPanel course={selected} />}
      </div>
    </div>
  )
}
