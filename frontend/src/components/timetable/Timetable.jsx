import React, { useEffect, useMemo, useState } from 'react'
import LoginRequiredSection from '../common/LoginRequiredSection'
import './Timetable.css'



// 시간표 기본틀
const DAYS = ['월', '화', '수', '목', '금']
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
const TIMETABLE_START = 9 * 60
const TIMETABLE_END = 19 * 60
const TIMETABLE_COLORS = [
  '#A7D8DE',
  '#F6D6AD',
  '#C9E7B8',
  '#D7C6F2',
  '#F6C6D0',
  '#BBD7F2',
  '#F1E6A8',
  '#C7E4D4',
  '#E5C7B7',
  '#C9D6E8',
]
const RECOMMEND_TARGET_CREDITS = 18
const RECOMMEND_MAX_LECTURES = 8
const DEFAULT_PREFERRED_TIME_RANGE = { start: '9:00', end: '19:00' }
const PREFERRED_TIME_OPTIONS = [
  { key: '전체', label: '전체', start: '9:00', end: '19:00' },
  { key: '오전', label: '오전', start: '9:00', end: '12:00' },
  { key: '오후', label: '오후', start: '12:00', end: '16:00' },
  { key: '16시 이후', label: '16시 이후', start: '16:00', end: '19:00' },
]
const COLLEGE_ORDER = [
  '인문국제학대학',
  '사범대학',
  '경영대학',
  '사회과학대학',
  '자연과학대학',
  '공과대학',
  '의과대학',
  '간호대학',
  '음악공연예술대학',
  '미술대학',
  '체육대학',
  'Keimyung Adams College',
  'Tabula Rasa College',
  '약학대학',
  'K-Cloud College',
]
const COLLEGE_ORDER_MAP = new Map(COLLEGE_ORDER.map((college, index) => [college, index]))

const ALL_OPTION = '전체'
const GRADE_OPTIONS = [
  { value: ALL_OPTION, label: '전체' },
  { value: '1', label: '1학년' },
  { value: '2', label: '2학년' },
  { value: '3', label: '3학년' },
  { value: '4', label: '4학년' },
]
const ENGINEERING_COLLEGE = '공과대학'
const ENGINEERING_DIVISION_ORDER = [
  '건축토목공학부',
  '전자전기공학부',
  '컴퓨터공학부',
  '도시학부',
  '스마트모빌리티공학부',
  '화공신소재공학부',
  '로봇공학과',
  '산업공학과',
  '의용공학과',
  '환경공학과',
]
const ENGINEERING_DIVISION_ORDER_MAP = new Map(ENGINEERING_DIVISION_ORDER.map((division, index) => [division, index]))

function pickCourseColor(courses) {
  const usedColors = uniqueValues(courses.map(course => course.color))
  const availableColors = TIMETABLE_COLORS.filter(color => !usedColors.includes(color))
  const colorPool = availableColors.length > 0 ? availableColors : TIMETABLE_COLORS

  return colorPool[Math.floor(Math.random() * colorPool.length)]
}

function getLectureKeyFromEntry(entry) {
  if (entry.lectureId) return entry.lectureId
  if (entry.lectureCode && entry.sectionCode) return `${entry.lectureCode}-${entry.sectionCode}`
  return entry.id
}

function assignColorsToPlanEntries(entries) {
  const colorMap = new Map()
  const assignedColorEntries = []
  let changed = false

  entries.forEach(entry => {
    const lectureKey = getLectureKeyFromEntry(entry)
    if (lectureKey && entry.colorAssigned && entry.color && !colorMap.has(lectureKey)) {
      colorMap.set(lectureKey, entry.color)
      assignedColorEntries.push({ color: entry.color })
    }
  })

  const nextEntries = entries.map(entry => {
    const lectureKey = getLectureKeyFromEntry(entry)
    if (!lectureKey) return entry

    if (!colorMap.has(lectureKey)) {
      const nextColor = pickCourseColor(assignedColorEntries)
      colorMap.set(lectureKey, nextColor)
      assignedColorEntries.push({ color: nextColor })
    }

    const nextColor = colorMap.get(lectureKey)
    if (entry.color === nextColor && entry.colorAssigned) return entry

    changed = true
    return {
      ...entry,
      color: nextColor,
      colorAssigned: true,
    }
  })

  return changed ? nextEntries : entries
}

function localCreateTimetableEntries(lectures, colorByLectureId = new Map()) {
  return lectures.flatMap(lecture =>
    lecture.meetings.map((meeting, index) => ({
      id: `${lecture.id}-${index}`,
      lectureId: lecture.id,
      name: lecture.name,
      professor: lecture.professor,
      room: lecture.room,
      lectureCode: lecture.lectureCode,
      sectionCode: lecture.sectionCode,
      credit: lecture.credit,
      color: colorByLectureId.get(lecture.id) || TIMETABLE_COLORS[0],
      colorAssigned: true,
      day: meeting.day,
      startHour: meeting.startHour,
      startMinute: meeting.startMinute || 0,
      endHour: meeting.endHour,
      endMinute: meeting.endMinute || 0,
    }))
  )
}

// 강의실 약어 표시
function formatRoom(room) {
  if (!room) return ''

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
    .replace(/^K-Cloud관\s*/, 'KC')
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))]
}

function getDivisionName(lecture) {
  return lecture.divisionName || lecture.department || ''
}

function getDivisionCode(lecture) {
  return lecture.divisionCode || ''
}

function getMajorName(lecture) {
  return lecture.majorName || lecture.department || ''
}

function getMajorCode(lecture) {
  return lecture.majorCode || ''
}

function sortAcademicOptions(entries, orderMap = new Map()) {
  return Array.from(entries)
    .sort(([nameA, codeA], [nameB, codeB]) => {
      const orderA = orderMap.has(nameA) ? orderMap.get(nameA) : Number.MAX_SAFE_INTEGER
      const orderB = orderMap.has(nameB) ? orderMap.get(nameB) : Number.MAX_SAFE_INTEGER

      return orderA - orderB || String(codeA || '99999').localeCompare(String(codeB || '99999'), 'ko') || nameA.localeCompare(nameB, 'ko')
    })
    .map(([name]) => name)
}

function getAcademicPath(lecture) {
  const division = getDivisionName(lecture)
  const majorName = getMajorName(lecture)
  const parts = [lecture.college]

  if (division) parts.push(division)
  if (majorName && majorName !== division) parts.push(majorName)

  return parts.filter(Boolean).join(' / ')
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
    lecture.divisionName,
    lecture.divisionCode,
    lecture.majorName,
    lecture.majorCode,
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

function hasLectureMeetings(lecture) {
  return Array.isArray(lecture.meetings) && lecture.meetings.length > 0
}

function getPreferredTimeOption(key) {
  return PREFERRED_TIME_OPTIONS.find(option => option.key === key) || PREFERRED_TIME_OPTIONS[0]
}

function fitsFreeDays(lecture, freeDays) {
  if (freeDays.length === 0) return true
  return lecture.meetings.every(meeting => !freeDays.includes(meeting.day))
}

function clockToMinutes(time, fallback = TIMETABLE_START) {
  const [hour, minute] = String(time || '').split(':').map(Number)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return fallback

  return hour * 60 + minute
}

function isValidTimeValue(time) {
  if (!/^\d{1,2}:\d{2}$/.test(String(time || ''))) return false

  const [hour, minute] = String(time).split(':').map(Number)
  return hour >= 0 && hour <= 23 && minute >= 0 && minute < 60
}

function isValidPreferredTimeRange(timeRange) {
  if (!isValidTimeValue(timeRange.start) || !isValidTimeValue(timeRange.end)) return false

  return clockToMinutes(timeRange.start) < clockToMinutes(timeRange.end)
}

function fitsPreferredTime(lecture, preferredTimeRange) {
  const preferredStart = clockToMinutes(preferredTimeRange.start, TIMETABLE_START)
  const preferredEnd = clockToMinutes(preferredTimeRange.end, TIMETABLE_END)

  return lecture.meetings.every(meeting => {
    const start = toMinutes(meeting, 'start')
    const end = toMinutes(meeting, 'end')
    return start >= preferredStart && end <= preferredEnd
  })
}

function fitsPreferredGrade(lecture, preferredGrade) {
  if (preferredGrade === ALL_OPTION) return true

  return Number(lecture.targetGrade) === Number(preferredGrade)
}

function normalizeDesiredCredits(value) {
  const credits = Number(value)
  if (!Number.isFinite(credits)) return RECOMMEND_TARGET_CREDITS

  return Math.min(Math.max(Math.floor(credits), 1), 24)
}

function getRecommendationScore(lecture) {
  const courseType = lecture.courseType || ''
  const targetGrade = Number(lecture.targetGrade || 9)
  const requiredBonus = courseType.includes('필수') ? -30 : 0

  return requiredBonus + targetGrade
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

export default function Timetable({ isLoggedIn, lectureCatalog = [], savedPlans, setSavedPlans, activePlan, setActivePlan }) {
  const [courses, setCourses] = useState(savedPlans[activePlan] || [])
  const [isSettingOpen, setIsSettingOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [lectureType, setLectureType] = useState('전공')

  // 부모(App.js)에서 백엔드 데이터를 가져오면 courses 상태를 동기화
  useEffect(() => {
    const planCourses = savedPlans[activePlan] || []
    const colorAssignedCourses = assignColorsToPlanEntries(planCourses)

    setCourses(colorAssignedCourses)
    if (colorAssignedCourses !== planCourses) {
      setSavedPlans(prevPlans => ({
        ...prevPlans,
        [activePlan]: colorAssignedCourses,
      }))
    }
  }, [activePlan, savedPlans, setSavedPlans])

  const [selectedCollege, setSelectedCollege] = useState(ENGINEERING_COLLEGE)
  const [selectedDivision, setSelectedDivision] = useState(ALL_OPTION)
  const [selectedMajor, setSelectedMajor] = useState(ALL_OPTION)
  const [selectedLiberalType, setSelectedLiberalType] = useState('공통교양')
  const [selectedLiberalArea, setSelectedLiberalArea] = useState('전체')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [toastMessage, setToastMessage] = useState('')
  const [requiredLectureIds, setRequiredLectureIds] = useState([])
  const [freeDays, setFreeDays] = useState([])
  const [preferredTime, setPreferredTime] = useState('전체')
  const [preferredTimeRange, setPreferredTimeRange] = useState(DEFAULT_PREFERRED_TIME_RANGE)
  const [desiredCredits, setDesiredCredits] = useState(String(RECOMMEND_TARGET_CREDITS))
  const [preferredGrade, setPreferredGrade] = useState(ALL_OPTION)

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

  const selectedLectures = useMemo(() => {
    const colorMap = new Map()
    courses.forEach(course => {
      if (course.lectureId && course.color && !colorMap.has(course.lectureId)) {
        colorMap.set(course.lectureId, course.color)
      }
    })

    return lectureCatalog
      .filter(lecture => selectedLectureIds.has(lecture.id))
      .map(lecture => ({
        ...lecture,
        color: colorMap.get(lecture.id) || TIMETABLE_COLORS[0],
      }))
  }, [courses, lectureCatalog, selectedLectureIds])

  const requiredLectureIdSet = useMemo(
    () => new Set(requiredLectureIds),
    [requiredLectureIds]
  )

  const requiredLectures = useMemo(
    () => lectureCatalog.filter(lecture => requiredLectureIdSet.has(lecture.id)),
    [lectureCatalog, requiredLectureIdSet]
  )

  const colleges = useMemo(() => {
    const collegeMap = new Map()

    lectureCatalog
      .filter(lecture => lecture.category === '전공' && lecture.college)
      .forEach(lecture => {
        if (!collegeMap.has(lecture.college)) {
          collegeMap.set(lecture.college, lecture.collegeCode || '99999')
        }
      })

    return Array.from(collegeMap.entries())
      .sort(([collegeA, codeA], [collegeB, codeB]) => {
        const orderA = COLLEGE_ORDER_MAP.has(collegeA) ? COLLEGE_ORDER_MAP.get(collegeA) : Number.MAX_SAFE_INTEGER
        const orderB = COLLEGE_ORDER_MAP.has(collegeB) ? COLLEGE_ORDER_MAP.get(collegeB) : Number.MAX_SAFE_INTEGER

        return orderA - orderB || codeA.localeCompare(codeB, 'ko') || collegeA.localeCompare(collegeB, 'ko')
      })
      .map(([college]) => college)
  }, [lectureCatalog])

  const divisions = useMemo(() => {
    const divisionMap = new Map()

    lectureCatalog
      .filter(lecture => lecture.category === '전공' && lecture.college === selectedCollege)
      .forEach(lecture => {
        const divisionName = getDivisionName(lecture)
        if (divisionName && !divisionMap.has(divisionName)) {
          divisionMap.set(divisionName, getDivisionCode(lecture))
        }
      })

    const orderMap = selectedCollege === ENGINEERING_COLLEGE ? ENGINEERING_DIVISION_ORDER_MAP : new Map()
    return [ALL_OPTION, ...sortAcademicOptions(divisionMap.entries(), orderMap)]
  }, [lectureCatalog, selectedCollege])

  const majors = useMemo(() => {
    const majorMap = new Map()

    lectureCatalog
      .filter(lecture =>
        lecture.category === '전공' &&
        lecture.college === selectedCollege &&
        (selectedDivision === ALL_OPTION || getDivisionName(lecture) === selectedDivision)
      )
      .forEach(lecture => {
        const majorName = getMajorName(lecture)
        if (majorName && !majorMap.has(majorName)) {
          majorMap.set(majorName, getMajorCode(lecture))
        }
      })

    return [ALL_OPTION, ...sortAcademicOptions(majorMap.entries())]
  }, [lectureCatalog, selectedCollege, selectedDivision])

  const liberalTypes = useMemo(
    () => uniqueValues(lectureCatalog.filter(lecture => lecture.category === '교양').map(lecture => lecture.liberalType)),
    [lectureCatalog]
  )

  const liberalAreas = useMemo(
    () => uniqueValues(
      lectureCatalog
        .filter(lecture => lecture.category === '교양' && lecture.liberalType === selectedLiberalType)
        .map(lecture => lecture.liberalArea)
    ),
    [lectureCatalog, selectedLiberalType]
  )

  const filteredLectures = useMemo(() => {
    const keyword = searchText.trim()
    return lectureCatalog.filter(lecture => {
      const typeMatched = lecture.category === lectureType
      const majorMatched = lectureType === '전공'
        ? lecture.college === selectedCollege &&
          (selectedDivision === ALL_OPTION || getDivisionName(lecture) === selectedDivision) &&
          (selectedMajor === ALL_OPTION || getMajorName(lecture) === selectedMajor)
        : true
      const liberalMatched = lectureType === '교양'
        ? lecture.liberalType === selectedLiberalType &&
          (selectedLiberalArea === '전체' || lecture.liberalArea === selectedLiberalArea)
        : true
      const keywordMatched = !keyword || includesKeyword(lecture, keyword)

      return typeMatched && majorMatched && liberalMatched && keywordMatched
    })
  }, [lectureCatalog, lectureType, searchText, selectedCollege, selectedDivision, selectedMajor, selectedLiberalArea, selectedLiberalType])

  const requiredLectureOptions = useMemo(
    () => filteredLectures.filter(hasLectureMeetings),
    [filteredLectures]
  )

  function changeLectureType(nextType) {
    setLectureType(nextType)
    setSearchText('')
    showMessage('')
  }

  function changeCollege(nextCollege) {
    setSelectedCollege(nextCollege)
    setSelectedDivision(ALL_OPTION)
    setSelectedMajor(ALL_OPTION)
  }

  function changeDivision(nextDivision) {
    setSelectedDivision(nextDivision)
    setSelectedMajor(ALL_OPTION)
  }

  function changeLiberalType(nextType) {
    setSelectedLiberalType(nextType)
    setSelectedLiberalArea('전체')
  }

  function toggleRequiredLecture(lectureId) {
    setRequiredLectureIds(prev =>
      prev.includes(lectureId)
        ? prev.filter(id => id !== lectureId)
        : [...prev, lectureId]
    )
  }

  function toggleFreeDay(day) {
    setFreeDays(prev =>
      prev.includes(day)
        ? prev.filter(selectedDay => selectedDay !== day)
        : [...prev, day]
    )
  }

  function selectPreferredTime(optionKey) {
    const option = getPreferredTimeOption(optionKey)

    setPreferredTime(option.key)
    setPreferredTimeRange({
      start: option.start,
      end: option.end,
    })
  }

  function changePreferredTimeRange(field, value) {
    setPreferredTime('직접 입력')
    setPreferredTimeRange(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  function changeDesiredCredits(value) {
    setDesiredCredits(value.replace(/\D/g, '').slice(0, 2))
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

  // 시간표 생성 모달은 수강신청 DB를 바꾸지 않고 현재 1안/2안만 편집합니다.
  function updateActivePlan(updater) {
    setCourses(prevCourses => {
      const nextCourses = updater(prevCourses)
      setSavedPlans(prevPlans => ({
        ...prevPlans,
        [activePlan]: nextCourses
      }))
      return nextCourses
    })
  }

  function addLecture(lecture) {
    if (selectedLectureIds.has(lecture.id)) {
      showMessage('이미 시간표에 추가된 강의입니다.', 'error')
      return
    }

    const lectureColor = pickCourseColor(courses)
    const newEntries = localCreateTimetableEntries([lecture], new Map([[lecture.id, lectureColor]]))
    if (hasConflict(newEntries)) {
      showMessage('같은 요일과 시간에 겹치는 강의가 있습니다.', 'error')
      return
    }

    updateActivePlan(prev => [...prev, ...newEntries])
    showMessage(`${lecture.name} 강의를 ${activePlan === 'plan1' ? '1안' : '2안'}에 추가했습니다.`)
  }

  function deleteLecture(lectureId) {
    updateActivePlan(prev => prev.filter(course => course.lectureId !== lectureId))
    showMessage('강의를 시간표에서 삭제했습니다.')
  }

  function clearLectures() {
    const deletingIds = new Set(selectedLectures.map(lecture => lecture.id))
    updateActivePlan(prev => prev.filter(course => !deletingIds.has(course.lectureId)))
    showMessage('추가한 강의를 모두 삭제했습니다.')
  }

  function openSettingPanel() {
    setSearchText('')
    setPreferredTime('전체')
    setPreferredTimeRange(DEFAULT_PREFERRED_TIME_RANGE)
    setDesiredCredits(String(RECOMMEND_TARGET_CREDITS))
    setPreferredGrade(ALL_OPTION)
    showMessage('')
    setIsSettingOpen(true)
  }

  function closeSettingPanel() {
    setSearchText('')
    showMessage('')
    setIsSettingOpen(false)
  }

  function toggleSettingPanel() {
    if (isSettingOpen) {
      closeSettingPanel()
      return
    }

    openSettingPanel()
  }

  function generateRecommendedPlan() {
    if (!isValidPreferredTimeRange(preferredTimeRange)) {
      showMessage('선호 시간대는 09:00 형식으로 입력하고 시작 시간이 종료 시간보다 빨라야 합니다.', 'error')
      return
    }

    if (!desiredCredits) {
      showMessage('이번 학기 희망 학점을 입력해 주세요.', 'error')
      return
    }

    const targetCredits = normalizeDesiredCredits(desiredCredits)

    const requiredWithoutMeetings = requiredLectures.find(lecture => !hasLectureMeetings(lecture))
    if (requiredWithoutMeetings) {
      showMessage(`${requiredWithoutMeetings.name} 강의 시간이 없어 추천 시간표에 넣을 수 없습니다.`, 'error')
      return
    }

    const requiredOffDayLecture = requiredLectures.find(lecture => !fitsFreeDays(lecture, freeDays))
    if (requiredOffDayLecture) {
      showMessage(`${requiredOffDayLecture.name}이 선택한 공강 요일에 포함되어 있습니다.`, 'error')
      return
    }

    const requiredTimeLecture = requiredLectures.find(lecture => !fitsPreferredTime(lecture, preferredTimeRange))
    if (requiredTimeLecture) {
      showMessage(`${requiredTimeLecture.name}이 선택한 선호 시간대 밖에 있습니다.`, 'error')
      return
    }

    let nextCourses = []
    const nextLectures = []
    const selectedNames = new Set()

    const tryAddLecture = lecture => {
      if (!hasLectureMeetings(lecture) || selectedNames.has(lecture.name)) return false

      const lectureColor = pickCourseColor(nextCourses)
      const newEntries = localCreateTimetableEntries([lecture], new Map([[lecture.id, lectureColor]]))
      if (hasConflict(newEntries, nextCourses)) return false

      nextCourses = [...nextCourses, ...newEntries]
      nextLectures.push(lecture)
      selectedNames.add(lecture.name)
      return true
    }

    const sortedRequiredLectures = [...requiredLectures].sort((a, b) =>
      a.name.localeCompare(b.name, 'ko') || a.lectureCode.localeCompare(b.lectureCode, 'ko')
    )

    for (const lecture of sortedRequiredLectures) {
      if (!tryAddLecture(lecture)) {
        showMessage(`필수 과목끼리 시간이 겹치거나 같은 과목 분반이 중복됩니다: ${lecture.name}`, 'error')
        return
      }
    }

    const recommendationCandidates = filteredLectures
      .filter(lecture =>
        !requiredLectureIdSet.has(lecture.id) &&
        hasLectureMeetings(lecture) &&
        fitsFreeDays(lecture, freeDays) &&
        fitsPreferredTime(lecture, preferredTimeRange) &&
        fitsPreferredGrade(lecture, preferredGrade)
      )
      .sort((a, b) =>
        getRecommendationScore(a) - getRecommendationScore(b) ||
        String(a.lectureCode).localeCompare(String(b.lectureCode), 'ko') ||
        a.name.localeCompare(b.name, 'ko')
      )

    for (const lecture of recommendationCandidates) {
      const totalCredits = nextLectures.reduce((sum, selectedLecture) => sum + Number(selectedLecture.credit || 0), 0)
      if (nextLectures.length >= RECOMMEND_MAX_LECTURES || totalCredits >= targetCredits) break
      tryAddLecture(lecture)
    }

    if (nextLectures.length === 0) {
      showMessage('선택한 조건에 맞는 추천 강의가 없습니다.', 'error')
      return
    }

    const recommendedCredits = nextLectures.reduce((sum, lecture) => sum + Number(lecture.credit || 0), 0)
    setActivePlan('plan1')
    setCourses(nextCourses)
    setSavedPlans(prevPlans => ({
      ...prevPlans,
      plan1: nextCourses,
    }))
    setToastMessage('조건에 맞는 1안을 생성했습니다.')
    showMessage(`조건에 맞는 1안을 생성했습니다. (${nextLectures.length}과목, ${recommendedCredits}/${targetCredits}학점)`)
  }

  function openSavedPlan(planKey) {
    const planLabel = planKey === 'plan1' ? '1안' : '2안'
    setActivePlan(planKey)
    setCourses(savedPlans[planKey] || [])
    setToastMessage(`${planLabel}을 불러왔습니다.`)
    showMessage(`${planLabel}을 불러왔습니다.`)
  }

  function saveTimetable() {
    // 추가/삭제는 현재 1안/2안 state에 이미 반영되어 있으므로 여기서는 팝업만 닫음
    closeSettingPanel()
    setToastMessage(`${activePlan === 'plan1' ? '1안' : '2안'}이 저장되었습니다.`)
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
          onClick={toggleSettingPanel}
        >
          시간표 생성
        </button>
      </div>

      <LoginRequiredSection isLoggedIn={isLoggedIn} className="timetable-container">
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
                        className={`course-block ${toMinutes(course, 'end') - toMinutes(course, 'start') <= 60 ? 'compact' : ''}`}
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
      </LoginRequiredSection>

      {isLoggedIn && isSettingOpen && (
        <div className="timetable-setting-backdrop">
          <div className="timetable-setting-panel">
            <div className="setting-top">
              <div>
                <h3>시간표 생성</h3>
                <p>{activePlan === 'plan1' ? '1안' : '2안'} 시간표 편집</p>
              </div>
              <button className="btn-text" onClick={closeSettingPanel}>닫기</button>
            </div>

            <div className="recommend-row">
              <button type="button" className={activePlan === 'plan1' ? 'active' : ''} aria-pressed={activePlan === 'plan1'} onClick={() => openSavedPlan('plan1')}>1안</button>
              <button type="button" className={activePlan === 'plan2' ? 'active' : ''} aria-pressed={activePlan === 'plan2'} onClick={() => openSavedPlan('plan2')}>2안</button>
              {/* <button type="button" onClick={() => loadPlan(DEFAULT_PLAN_IDS, '기본 시간표')}>초기화</button> */}
            </div>

            <section className="auto-recommend-section">
              <div className="lecture-search-header">
                <div>
                  <h4>추천 조건</h4>
                  <span>선택한 조건으로 1안을 자동 생성합니다.</span>
                </div>
                <button type="button" className="btn-primary" onClick={generateRecommendedPlan}>
                  1안 자동 생성
                </button>
              </div>

              <div className="recommend-condition-grid">
                <div className="recommend-condition-card required-course-card">
                  <strong>필수 과목 선택</strong>
                  <span>현재 검색 결과에서 필수로 넣을 과목을 체크하세요.</span>
                  <div className="required-course-list">
                    {requiredLectureOptions.length === 0 ? (
                      <p>선택할 수 있는 강의가 없습니다.</p>
                    ) : (
                      requiredLectureOptions.map(lecture => (
                        <label key={lecture.id} className="required-course-option">
                          <input
                            type="checkbox"
                            checked={requiredLectureIdSet.has(lecture.id)}
                            onChange={() => toggleRequiredLecture(lecture.id)}
                          />
                          <span>
                            <strong>{lecture.name}</strong>
                            <small>{lecture.lectureCode}-{lecture.sectionCode} · {lecture.professor}</small>
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                  {requiredLectures.length > 0 && (
                    <div className="required-selected-list">
                      {requiredLectures.map(lecture => (
                        <button key={lecture.id} type="button" onClick={() => toggleRequiredLecture(lecture.id)}>
                          {lecture.name} ×
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="recommend-condition-card">
                  <strong>공강 요일</strong>
                  <span>수업을 넣지 않을 요일을 선택하세요.</span>
                  <div className="condition-button-row">
                    {DAYS.map(day => (
                      <button
                        key={day}
                        type="button"
                        className={freeDays.includes(day) ? 'active' : ''}
                        aria-pressed={freeDays.includes(day)}
                        onClick={() => toggleFreeDay(day)}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="recommend-condition-card">
                  <strong>선호 시간대</strong>
                  <span>직접 입력한 시간대 안에 있는 강의만 추천합니다.</span>
                  <div className="condition-button-row">
                    {PREFERRED_TIME_OPTIONS.map(option => (
                      <button
                        key={option.key}
                        type="button"
                        className={preferredTime === option.key ? 'active' : ''}
                        aria-pressed={preferredTime === option.key}
                        onClick={() => selectPreferredTime(option.key)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <div className="preferred-time-inputs">
                    <label>
                      시작
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength="5"
                        placeholder="예: 9:00"
                        value={preferredTimeRange.start}
                        onChange={event => changePreferredTimeRange('start', event.target.value)}
                      />
                    </label>
                    <label>
                      종료
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength="5"
                        placeholder="예: 18:00"
                        value={preferredTimeRange.end}
                        onChange={event => changePreferredTimeRange('end', event.target.value)}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </section>

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
                    <div className="lecture-filter-grid major-filter-grid">
                      <label>
                        대학/계열
                        <select value={selectedCollege} onChange={event => changeCollege(event.target.value)}>
                          {colleges.map(college => <option key={college} value={college}>{college}</option>)}
                        </select>
                      </label>
                      <label>
                        학부/과
                        <select value={selectedDivision} onChange={event => changeDivision(event.target.value)}>
                          {divisions.map(division => <option key={division} value={division}>{division}</option>)}
                        </select>
                      </label>
                      <label>
                        전공
                        <select value={selectedMajor} onChange={event => setSelectedMajor(event.target.value)}>
                          {majors.map(majorName => <option key={majorName} value={majorName}>{majorName}</option>)}
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
                          ? getAcademicPath(lecture)
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
