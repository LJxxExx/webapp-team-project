import React, { useEffect, useMemo, useState } from 'react'
import './Timetable.css'
import { createTimetableEntries, lectureCatalog } from '../data'

// 시간표 기본틀
const DAYS = ['월', '화', '수', '목', '금']
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
const TIMETABLE_START = 9 * 60
const TIMETABLE_END = 19 * 60

// 기본, 추천, 2안 시간표 설정
const DEFAULT_PLAN_IDS = ['KMU-CSE3102-01', 'KMU-CSE1402-01', 'KMU-CSE2019-01']
const RECOMMENDED_PLAN_IDS = ['KMU-CSE3102-01', 'KMU-CSE1402-01', 'KMU-CSE2019-01', 'KMU-CSE1302-01']
const SECOND_PLAN_IDS = ['KMU-CSE3127-01', 'KMU-CSE2019-01', 'KMU-GEN3104-03']

// 강의실 약어 표시
function formatRoom(room) {
  if (!room) return ''

  return room
    .replace(/^공학1호관\s*/, '공')
    .replace(/^공학2호관\s*/, '공')
    .replace(/^의양관\s*/, '의')
    .replace(/^영암관\s*/, '영')
    .replace(/^백은관\s*/, '백')
    .replace(/^쉐턱관\s*/, '쉐')
    .replace(/^동천관\s*/, '동')
    .replace(/^대명비사관\s*/, '대')
    .replace(/^바우어관\s*/, '바')
    .replace(/^교양관\s*/, '교')
    .replace(/^사범관\s*/, '사')
    .replace(/^체육관\s*/, '체')
    .replace(/^약학관\s*/, '약')
    .replace(/^아담스채플\s*/, '채')
    .replace(/^Tabula Rasa관\s*/, 'TR')
    .replace(/^K-Cloud관\s*/, 'KC')
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))]
}

function toMinutes({ startHour, startMinute = 0, endHour, endMinute = 0 }, type = 'start') {
  return type === 'start'
    ? Number(startHour) * 60 + Number(startMinute || 0)
    : Number(endHour) * 60 + Number(endMinute || 0)
}

function formatClock(hour, minute = 0) {
  return `${Number(hour)}:${String(Number(minute || 0)).padStart(2, '0')}`
}

function includesKeyword(lecture, keyword) {
  const target = [
    lecture.name,
    lecture.professor,
    lecture.room,
    formatRoom(lecture.room),
    lecture.lectureCode,
    lecture.sectionCode,
    lecture.department,
    lecture.college,
    lecture.liberalType,
    lecture.liberalArea,
  ].join(' ').toLowerCase()

  return target.includes(keyword.toLowerCase())
}

function formatMeetings(meetings) {
  return meetings
    .map(meeting => `${meeting.day} ${formatClock(meeting.startHour, meeting.startMinute)}-${formatClock(meeting.endHour, meeting.endMinute)}`)
    .join(' / ')
}

function getCourseStyle(course) {
  const start = Math.max(toMinutes(course, 'start'), TIMETABLE_START)
  const end = Math.min(toMinutes(course, 'end'), TIMETABLE_END)
  const total = TIMETABLE_END - TIMETABLE_START

  return {
    top: `${((start - TIMETABLE_START) / total) * 100}%`,
    height: `${((end - start) / total) * 100}%`,
    background: course.color,
  }
}

export default function Timetable({ isLoggedIn }) {
  const [savedPlans, setSavedPlans] = useState({
    plan1: createTimetableEntries(lectureCatalog.filter(lecture => RECOMMENDED_PLAN_IDS.includes(lecture.id))),
    plan2: createTimetableEntries(lectureCatalog.filter(lecture => SECOND_PLAN_IDS.includes(lecture.id))),
  })
  const [activePlan, setActivePlan] = useState('plan1')
  const [courses, setCourses] = useState(savedPlans.plan1)
  const [isSettingOpen, setIsSettingOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [lectureType, setLectureType] = useState('전공')
  const [selectedCollege, setSelectedCollege] = useState('공과대학')
  const [selectedDepartment, setSelectedDepartment] = useState('컴퓨터공학과')
  const [selectedLiberalType, setSelectedLiberalType] = useState('공통교양')
  const [selectedLiberalArea, setSelectedLiberalArea] = useState('전체')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [toastMessage, setToastMessage] = useState('')

  function showMessage(text, type = 'success') {
    setMessage(text)
    setMessageType(type)
  }

  useEffect(() => {
    if (!toastMessage) return undefined

    const timer = setTimeout(() => {
      setToastMessage('')
    }, 1800)

    return () => clearTimeout(timer)
  }, [toastMessage])

  const selectedLectureIds = useMemo(
    () => new Set(courses.map(course => course.lectureId)),
    [courses]
  )

  const selectedLectures = useMemo(
    () => lectureCatalog.filter(lecture => selectedLectureIds.has(lecture.id)),
    [selectedLectureIds]
  )

  const colleges = useMemo(
    () => uniqueValues(lectureCatalog.filter(lecture => lecture.category === '전공').map(lecture => lecture.college)),
    []
  )

  const departments = useMemo(
    () => uniqueValues(
      lectureCatalog
        .filter(lecture => lecture.category === '전공' && lecture.college === selectedCollege)
        .map(lecture => lecture.department)
    ),
    [selectedCollege]
  )

  const liberalTypes = useMemo(
    () => uniqueValues(lectureCatalog.filter(lecture => lecture.category === '교양').map(lecture => lecture.liberalType)),
    []
  )

  const liberalAreas = useMemo(
    () => uniqueValues(
      lectureCatalog
        .filter(lecture => lecture.category === '교양' && lecture.liberalType === selectedLiberalType)
        .map(lecture => lecture.liberalArea)
    ),
    [selectedLiberalType]
  )

  const filteredLectures = useMemo(() => {
    const keyword = searchText.trim()
    return lectureCatalog.filter(lecture => {
      const typeMatched = lecture.category === lectureType
      const majorMatched = lectureType === '전공'
        ? lecture.college === selectedCollege && lecture.department === selectedDepartment
        : true
      const liberalMatched = lectureType === '교양'
        ? lecture.liberalType === selectedLiberalType &&
          (selectedLiberalArea === '전체' || lecture.liberalArea === selectedLiberalArea)
        : true
      const keywordMatched = !keyword || includesKeyword(lecture, keyword)

      return typeMatched && majorMatched && liberalMatched && keywordMatched
    })
  }, [lectureType, searchText, selectedCollege, selectedDepartment, selectedLiberalArea, selectedLiberalType])

  function changeLectureType(nextType) {
    setLectureType(nextType)
    setSearchText('')
    showMessage('')
  }

  function changeCollege(nextCollege) {
    const nextDepartments = uniqueValues(
      lectureCatalog
        .filter(lecture => lecture.category === '전공' && lecture.college === nextCollege)
        .map(lecture => lecture.department)
    )
    setSelectedCollege(nextCollege)
    setSelectedDepartment(nextDepartments[0] || '')
  }

  function changeLiberalType(nextType) {
    setSelectedLiberalType(nextType)
    setSelectedLiberalArea('전체')
  }

  function hasConflict(newEntries, targetCourses = courses) {
    return newEntries.some(newEntry =>
      targetCourses.some(course =>
        course.lectureId !== newEntry.lectureId &&
        course.day === newEntry.day &&
        toMinutes(newEntry, 'start') < toMinutes(course, 'end') &&
        toMinutes(newEntry, 'end') > toMinutes(course, 'start')
      )
    )
  }

  function addLecture(lecture) {
    if (selectedLectureIds.has(lecture.id)) {
      showMessage('이미 시간표에 추가된 강의입니다.', 'error')
      return
    }

    const newEntries = createTimetableEntries([lecture])
    if (hasConflict(newEntries)) {
      showMessage('같은 요일과 시간에 겹치는 강의가 있습니다.', 'error')
      return
    }

    setCourses(prev => [...prev, ...newEntries])
    showMessage(`${lecture.name} 강의를 추가했습니다.`)
  }

  function deleteLecture(lectureId) {
    setCourses(prev => prev.filter(course => course.lectureId !== lectureId))
    showMessage('강의를 시간표에서 삭제했습니다.')
  }

  function clearLectures() {
    setCourses([])
    showMessage('추가한 강의를 모두 삭제했습니다.')
  }

  function loadPlan(lectureIds, label) {
    const lectures = lectureIds
      .map(id => lectureCatalog.find(lecture => lecture.id === id))
      .filter(Boolean)
    setCourses(createTimetableEntries(lectures))
    showMessage(`${label}을 불러왔습니다.`)
  }

  function openSavedPlan(planKey) {
    const planLabel = planKey === 'plan1' ? '1안' : '2안'
    setActivePlan(planKey)
    setCourses(savedPlans[planKey])
    setToastMessage(`${planLabel}을 불러왔습니다.`)
    showMessage(`${planLabel}을 불러왔습니다.`)
  }

  function saveTimetable() {
    setSavedPlans(prev => ({
      ...prev,
      [activePlan]: courses,
    }))
    setIsSettingOpen(false)
    setToastMessage(`${activePlan === 'plan1' ? '1안' : '2안'}이 저장되었습니다.`)
    showMessage('')
  }

  return (
    <div className="timetable-wrap">
      <div className="timetable-header-row">
        <div className="timetable-title-area">
          <h2 className="section-title">시간표</h2>
          <div className="plan-tabs" aria-label="저장된 시간표 보기">
            <button
              type="button"
              className={activePlan === 'plan1' ? 'active' : ''}
              disabled={!isLoggedIn}
              onClick={() => openSavedPlan('plan1')}
            >
              1안
            </button>
            <button
              type="button"
              className={activePlan === 'plan2' ? 'active' : ''}
              disabled={!isLoggedIn}
              onClick={() => openSavedPlan('plan2')}
            >
              2안
            </button>
          </div>
        </div>
        <button
          className="btn-secondary"
          disabled={!isLoggedIn}
          onClick={() => setIsSettingOpen(prev => !prev)}
        >
          시간표 생성
        </button>
      </div>

      <div className={'timetable-container' + (!isLoggedIn ? ' timetable-blurred' : '')}>
        <div className="timetable">
          <div className="timetable-head">
            <div className="th-time">시간</div>
            {DAYS.map(day => <div key={day} className="th-day">{day}</div>)}
          </div>
          <div className="timetable-body">
            <div className="time-axis">
              {HOURS.map(hour => (
                <div key={hour} className="td-time">{String(hour).padStart(2, '0')}:00</div>
              ))}
            </div>
            <div className="day-lanes">
              {DAYS.map(day => (
                <div key={day} className="day-lane">
                  {courses
                    .filter(course => course.day === day)
                    .sort((a, b) => toMinutes(a, 'start') - toMinutes(b, 'start'))
                    .map(course => (
                      <div
                        key={course.id}
                        className="course-block"
                        style={getCourseStyle(course)}
                      >
                        <strong>{course.name}</strong>
                        <span>{formatRoom(course.room)} {course.professor}</span>
                        <em>{course.lectureCode}-{course.sectionCode}</em>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        {toastMessage && (
          <div className="timetable-toast" role="status" aria-live="polite">
            {toastMessage}
          </div>
        )}
      </div>

      {!isLoggedIn && (
        <div className="timetable-blur-overlay">
          <span className="blur-label">'로그인이 필요합니다'</span>
        </div>
      )}

      {isLoggedIn && isSettingOpen && (
        <div className="timetable-setting-backdrop">
          <div className="timetable-setting-panel">
            <div className="setting-top">
              <div>
                <h3>시간표 생성</h3>
                <p>{activePlan === 'plan1' ? '1안' : '2안'} 시간표 편집</p>
              </div>
              <button className="btn-text" onClick={() => setIsSettingOpen(false)}>닫기</button>
            </div>

            <div className="recommend-row">
              <button type="button" onClick={() => openSavedPlan('plan1')}>1안</button>
              <button type="button" onClick={() => openSavedPlan('plan2')}>2안</button>
              <button type="button" onClick={() => loadPlan(DEFAULT_PLAN_IDS, '기본 시간표')}>초기화</button>
            </div>

            <div className="lecture-manager">
              <section className="lecture-search-section">
                <div className="lecture-search-header">
                  <h4>강의 검색</h4>
                  <span>{filteredLectures.length}개 강의</span>
                </div>

                <div className="lecture-filter-panel">
                  <div className="lecture-type-tabs" aria-label="강의 분류">
                    {['전공', '교양'].map(type => (
                      <button
                        key={type}
                        type="button"
                        className={lectureType === type ? 'active' : ''}
                        onClick={() => changeLectureType(type)}
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                  {lectureType === '전공' ? (
                    <div className="lecture-filter-grid">
                      <label>
                        단과대학
                        <select value={selectedCollege} onChange={event => changeCollege(event.target.value)}>
                          {colleges.map(college => <option key={college} value={college}>{college}</option>)}
                        </select>
                      </label>
                      <label>
                        학과
                        <select value={selectedDepartment} onChange={event => setSelectedDepartment(event.target.value)}>
                          {departments.map(department => <option key={department} value={department}>{department}</option>)}
                        </select>
                      </label>
                    </div>
                  ) : (
                    <div className="lecture-filter-grid">
                      <label>
                        교양 구분
                        <select value={selectedLiberalType} onChange={event => changeLiberalType(event.target.value)}>
                          {liberalTypes.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                      </label>
                      <label>
                        교양 과목/영역
                        <select value={selectedLiberalArea} onChange={event => setSelectedLiberalArea(event.target.value)}>
                          <option value="전체">전체</option>
                          {liberalAreas.map(area => <option key={area} value={area}>{area}</option>)}
                        </select>
                      </label>
                    </div>
                  )}
                </div>

                <input
                  className="lecture-search-input"
                  value={searchText}
                  onChange={event => setSearchText(event.target.value)}
                  placeholder="계명대 강의명, 교수명, 강의코드, 강의실 검색"
                />
                <div className="lecture-result-list">
                  {filteredLectures.map(lecture => (
                    <button
                      key={lecture.id}
                      type="button"
                      className="lecture-result-item"
                      onClick={() => addLecture(lecture)}
                    >
                      <strong>{lecture.name}</strong>
                      <span>{formatRoom(lecture.room)} · {lecture.professor}</span>
                      <small>
                        {lecture.lectureCode}-{lecture.sectionCode} · {lecture.category === '전공'
                          ? `${lecture.college} / ${lecture.department}`
                          : `${lecture.liberalType} / ${lecture.liberalArea}`}
                      </small>
                      <small>{formatMeetings(lecture.meetings)}</small>
                    </button>
                  ))}
                </div>
              </section>

              <section className="selected-lecture-section">
                <div className="lecture-search-header">
                  <div>
                    <h4>추가한 강의</h4>
                    <span>{selectedLectures.length}개</span>
                  </div>
                  <button
                    type="button"
                    className="clear-selected-btn"
                    disabled={selectedLectures.length === 0}
                    onClick={clearLectures}
                  >
                    전체 삭제
                  </button>
                </div>
                <div className="selected-lecture-list">
                  {selectedLectures.length === 0 ? (
                    <p className="empty-lecture">아직 추가한 강의가 없습니다.</p>
                  ) : (
                    selectedLectures.map(lecture => (
                      <div key={lecture.id} className="selected-lecture-card">
                        <span className="course-dot" style={{ backgroundColor: lecture.color }} />
                        <div className="selected-lecture-info">
                          <strong>{lecture.name}</strong>
                          <span>{formatRoom(lecture.room)} · {lecture.professor}</span>
                          <small>{lecture.lectureCode}-{lecture.sectionCode}</small>
                        </div>
                        <button type="button" onClick={() => deleteLecture(lecture.id)}>삭제</button>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

            {message && <p className={`setting-message ${messageType}`}>{message}</p>}

            <div className="setting-footer">
              <span>{activePlan === 'plan1' ? '1안' : '2안'}에 저장됩니다.</span>
              <button className="btn-primary" type="button" onClick={saveTimetable}>저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
