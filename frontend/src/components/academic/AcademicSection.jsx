import React, { useState, useEffect } from "react"
import "./AcademicSection.css"

/**
 * AcademicSection Component
 * @param {Array} enrolledCourses - 현재 시간표에 등록된 강의 목록 (savedLectures)
 */

export default function AcademicSection({ enrolledCourses }) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(()=> {
    if (!enrolledCourses || enrolledCourses.length === 0) return

    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1 ) % enrolledCourses.length)
    }, 3000)

    return () => clearInterval(timer)
  }, [enrolledCourses])

  if (!enrolledCourses || enrolledCourses.length === 0) {
    return (
      <div className="academic-section">
        <h2 className="academic-title">추천 학술 자료</h2>
        <p className="academic-desc">현재 시간표에 등록된 과목이 없습니다.</p>
      </div>
    )
  }

  const safeIndex = currentIndex >= enrolledCourses.length ? 0 : currentIndex
  const currentCourse = enrolledCourses[safeIndex]
  
  const dummyResources = [
    { id: 1, title: `[${currentCourse.name}] 관련 최신 연구 동향`, author: "name1", year: "2024" },
    { id: 2, title: `[${currentCourse.name}] 기초 이론 및 응용 사례`, author: "name2", year: "2025" },
    { id: 3, title: `[${currentCourse.name}] 학회지 게재 우수 논문`, author: "name3", year: "2026" },
  ]

  return (
    <div className="academic-section">
      <h2 className="academic-title">추천 학술 자료</h2>

      <div className="academic-carousel">
        <div className="academic-carousel-header">
          <h3 className="academic-course-name">{currentCourse.name}</h3>
          <span className="academic-indicator">
            {safeIndex + 1} / {enrolledCourses.length}
          </span>
      </div>

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
  </div>
  )
}  