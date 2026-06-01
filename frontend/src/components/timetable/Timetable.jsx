import React, { useEffect, useMemo, useRef, useState } from 'react'
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
const RECOMMEND_CANDIDATE_COUNT = 3
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

function getNameProfessorKey(item) {
  if (!item?.name) return ''

  return `${item.name || ''}__${item.professor || ''}`
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

// 같은 요일에 시간이 겹치는 강의가 있는지 검사 (상태에 의존하지 않는 순수 함수)
function hasTimeConflict(newEntries, targetCourses) {
  return newEntries.some(newEntry =>
    targetCourses.some(course =>
      course.lectureId !== newEntry.lectureId &&
      course.day === newEntry.day &&
      toMinutes(newEntry, 'start') < toMinutes(course, 'end') &&
      toMinutes(newEntry, 'end') > toMinutes(course, 'start')
    )
  )
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

// 시드 기반 난수 (mulberry32) — 같은 시드면 같은 결과라 후보 재현이 가능
function createRng(seed) {
  let state = (Number(seed) >>> 0) || 1
  return function next() {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seededShuffle(items, rng) {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// 후보 시간표를 강의 id 집합으로 식별 → 중복 후보 제거에 사용
function getCandidateSignature(lectures) {
  return lectures
    .map(lecture => String(lecture.id))
    .sort()
    .join('|')
}

// 동일 과목 식별 키: 과목코드(lectureCode)가 같고 분반(sectionCode)만 다르면 같은 과목
function getCourseKey(item) {
  if (item?.lectureCode) return String(item.lectureCode)
  return item?.name || ''
}

// 정렬된 후보 강의 목록으로 시간표 한 개를 그리디 구성 (상태 커밋 없음, 순수)
function buildTimetableCandidate({ requiredList = [], orderedCandidates = [], targetCredits, maxLectures = RECOMMEND_MAX_LECTURES }) {
  let courses = []
  const lectures = []
  const usedNames = new Set()

  const tryAdd = lecture => {
    if (!hasLectureMeetings(lecture) || usedNames.has(lecture.name)) return false

    const color = pickCourseColor(courses)
    const entries = localCreateTimetableEntries([lecture], new Map([[lecture.id, color]]))
    if (hasTimeConflict(entries, courses)) return false

    courses = [...courses, ...entries]
    lectures.push(lecture)
    usedNames.add(lecture.name)
    return true
  }

  for (const lecture of requiredList) {
    if (!tryAdd(lecture)) {
      return { ok: false, conflictLecture: lecture }
    }
  }

  for (const lecture of orderedCandidates) {
    const totalCredits = lectures.reduce((sum, item) => sum + Number(item.credit || 0), 0)
    if (lectures.length >= maxLectures || totalCredits >= targetCredits) break
    tryAdd(lecture)
  }

  const credits = lectures.reduce((sum, item) => sum + Number(item.credit || 0), 0)
  return { ok: true, courses, lectures, credits }
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
  const savedPlansRef = useRef(savedPlans)
  const [isSettingOpen, setIsSettingOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [lectureType, setLectureType] = useState('전공')

  // 부모(App.js)에서 백엔드 데이터를 가져오면 courses 상태를 동기화
  useEffect(() => {
    savedPlansRef.current = savedPlans
  }, [savedPlans])

  useEffect(() => {
    const planCourses = savedPlans[activePlan] || []
    const colorAssignedCourses = assignColorsToPlanEntries(planCourses)

    setCourses(colorAssignedCourses)
    if (colorAssignedCourses !== planCourses) {
      setSavedPlans(prevPlans => ({
        ...prevPlans,
        [activePlan]: colorAssignedCourses,
      }))
      savedPlansRef.current = {
        ...savedPlansRef.current,
        [activePlan]: colorAssignedCourses,
      }
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
  const [lectureGradeFilters, setLectureGradeFilters] = useState([])
  const [lectureCreditFilters, setLectureCreditFilters] = useState([])
  const [isLectureFilterOpen, setIsLectureFilterOpen] = useState(false)
  // 자동 생성 후보(미리보기) 상태 — 적용 전까지 savedPlans에 커밋하지 않음
  const [recommendCandidates, setRecommendCandidates] = useState([])
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState(0)
  const [recommendSeed, setRecommendSeed] = useState(0)
  const [recommendMode, setRecommendMode] = useState('condition')
  // 모달 안 탭: 'auto'(자동 추천) | 'manual'(직접 편집)
  const [settingTab, setSettingTab] = useState('auto')

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

  const creditFilterOptions = useMemo(
    () => uniqueValues(
      lectureCatalog
        .map(lecture => Number(lecture.credit))
        .filter(credit => Number.isFinite(credit) && credit <= 3)
        .map(credit => String(credit))
    )
      .sort((creditA, creditB) => Number(creditA) - Number(creditB)),
    [lectureCatalog]
  )

  const activeLectureFilterCount = lectureGradeFilters.length + lectureCreditFilters.length
  const hasActiveLectureFilters = activeLectureFilterCount > 0

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
      const gradeMatched = lectureGradeFilters.length === 0 || lectureGradeFilters.includes(String(lecture.targetGrade))
      const creditMatched = lectureCreditFilters.length === 0 || lectureCreditFilters.includes(String(Number(lecture.credit)))
      const keywordMatched = !keyword || includesKeyword(lecture, keyword)

      return typeMatched && majorMatched && liberalMatched && gradeMatched && creditMatched && keywordMatched
    })
  }, [lectureCatalog, lectureType, searchText, selectedCollege, selectedDivision, selectedMajor, selectedLiberalArea, selectedLiberalType, lectureGradeFilters, lectureCreditFilters])

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

  function toggleLectureGradeFilter(value) {
    if (value === ALL_OPTION) {
      setLectureGradeFilters([])
      return
    }

    setLectureGradeFilters(prev =>
      prev.includes(value)
        ? prev.filter(filterValue => filterValue !== value)
        : [...prev, value]
    )
  }

  function toggleLectureCreditFilter(value) {
    if (value === ALL_OPTION) {
      setLectureCreditFilters([])
      return
    }

    setLectureCreditFilters(prev =>
      prev.includes(value)
        ? prev.filter(filterValue => filterValue !== value)
        : [...prev, value]
    )
  }

  function clearLectureDetailFilters() {
    setLectureGradeFilters([])
    setLectureCreditFilters([])
  }

  function hasConflict(newEntries, targetCourses = courses) {
    return hasTimeConflict(newEntries, targetCourses)
  }

  // 시간표 생성 모달은 수강신청 DB를 바꾸지 않고 현재 1안/2안만 편집합니다.
  function updateActivePlan(updater) {
    setCourses(prevCourses => {
      const nextCourses = updater(prevCourses)
      setSavedPlans(prevPlans => {
        const nextPlans = {
          ...prevPlans,
          [activePlan]: nextCourses
        }
        savedPlansRef.current = nextPlans
        return nextPlans
      })
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
    setLectureGradeFilters([])
    setLectureCreditFilters([])
    setIsLectureFilterOpen(false)
    setRecommendSeed(0)
    setRecommendMode('condition')
    setSettingTab('auto')
    clearRecommendCandidates()
    showMessage('')
    setIsSettingOpen(true)
  }

  function closeSettingPanel() {
    setSearchText('')
    setIsLectureFilterOpen(false)
    clearRecommendCandidates()
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

  function clearRecommendCandidates() {
    setRecommendCandidates([])
    setSelectedCandidateIndex(0)
  }

  // 추천 조건 검증 + 후보 강의 풀(정렬) 준비. 실패 시 { ok:false, error } 반환.
  function prepareRecommendation() {
    if (!isValidPreferredTimeRange(preferredTimeRange)) {
      return { ok: false, error: '선호 시간대는 09:00 형식으로 입력하고 시작 시간이 종료 시간보다 빨라야 합니다.' }
    }
    if (!desiredCredits) {
      return { ok: false, error: '이번 학기 희망 학점을 입력해 주세요.' }
    }

    const requiredWithoutMeetings = requiredLectures.find(lecture => !hasLectureMeetings(lecture))
    if (requiredWithoutMeetings) {
      return { ok: false, error: `${requiredWithoutMeetings.name} 강의 시간이 없어 추천 시간표에 넣을 수 없습니다.` }
    }
    const requiredOffDayLecture = requiredLectures.find(lecture => !fitsFreeDays(lecture, freeDays))
    if (requiredOffDayLecture) {
      return { ok: false, error: `${requiredOffDayLecture.name}이 선택한 공강 요일에 포함되어 있습니다.` }
    }
    const requiredTimeLecture = requiredLectures.find(lecture => !fitsPreferredTime(lecture, preferredTimeRange))
    if (requiredTimeLecture) {
      return { ok: false, error: `${requiredTimeLecture.name}이 선택한 선호 시간대 밖에 있습니다.` }
    }

    const targetCredits = normalizeDesiredCredits(desiredCredits)
    const savedPlansSnapshot = savedPlansRef.current || savedPlans
    const otherPlanEntries = activePlan === 'plan2' ? (savedPlansSnapshot.plan1 || []) : []
    const excludedLectureKeys = activePlan === 'plan2'
      ? new Set(otherPlanEntries.map(getLectureKeyFromEntry).filter(Boolean))
      : new Set()
    const otherPlanNameProfessorKeys = activePlan === 'plan2'
      ? new Set(otherPlanEntries.map(getNameProfessorKey).filter(Boolean))
      : new Set()
    const isExcludedByOtherPlan = lecture =>
      excludedLectureKeys.has(lecture.id) ||
      excludedLectureKeys.has(`${lecture.lectureCode}-${lecture.sectionCode}`)
    const getAlternativePenalty = lecture =>
      activePlan === 'plan2' && otherPlanNameProfessorKeys.has(getNameProfessorKey(lecture)) ? 100 : 0

    const requiredOrdered = [...requiredLectures].sort((a, b) =>
      a.name.localeCompare(b.name, 'ko') || a.lectureCode.localeCompare(b.lectureCode, 'ko')
    )

    const pool = filteredLectures
      .filter(lecture =>
        !requiredLectureIdSet.has(lecture.id) &&
        !isExcludedByOtherPlan(lecture) &&
        hasLectureMeetings(lecture) &&
        fitsFreeDays(lecture, freeDays) &&
        fitsPreferredTime(lecture, preferredTimeRange) &&
        fitsPreferredGrade(lecture, preferredGrade)
      )
      .sort((a, b) =>
        getAlternativePenalty(a) - getAlternativePenalty(b) ||
        getRecommendationScore(a) - getRecommendationScore(b) ||
        String(a.lectureCode).localeCompare(String(b.lectureCode), 'ko') ||
        a.name.localeCompare(b.name, 'ko')
      )

    // 동점 정렬 키에 약간의 흔들림(jitter)을 줘서 후보별로 다른 조합을 뽑되 품질 순서는 유지
    const scoreOf = lecture => getAlternativePenalty(lecture) * 1000 + getRecommendationScore(lecture)

    return { ok: true, requiredOrdered, pool, targetCredits, scoreOf }
  }

  function orderPoolForVariant(pool, scoreOf, rng, jitter) {
    return pool
      .map(lecture => ({ lecture, key: scoreOf(lecture) + (rng() - 0.5) * jitter }))
      .sort((a, b) => a.key - b.key)
      .map(item => item.lecture)
  }

  // 조건 기반으로 서로 다른 시간표 후보 여러 개를 생성 (상태 커밋 X)
  function generateConditionCandidates(seed) {
    const prepared = prepareRecommendation()
    if (!prepared.ok) {
      clearRecommendCandidates()
      showMessage(prepared.error, 'error')
      return
    }

    const { requiredOrdered, pool, targetCredits, scoreOf } = prepared
    const rng = createRng(seed + 1)
    const results = []
    const signatures = new Set()
    const maxAttempts = 12

    for (let attempt = 0; results.length < RECOMMEND_CANDIDATE_COUNT && attempt < maxAttempts; attempt++) {
      const jitter = attempt === 0 ? 0 : 4 + attempt * 3
      const ordered = attempt === 0 ? pool : orderPoolForVariant(pool, scoreOf, rng, jitter)
      const built = buildTimetableCandidate({ requiredList: requiredOrdered, orderedCandidates: ordered, targetCredits })

      if (!built.ok) {
        clearRecommendCandidates()
        showMessage(`필수 과목끼리 시간이 겹치거나 같은 과목 분반이 중복됩니다: ${built.conflictLecture.name}`, 'error')
        return
      }
      if (built.lectures.length === 0) continue

      const signature = getCandidateSignature(built.lectures)
      if (signatures.has(signature)) continue

      signatures.add(signature)
      results.push({ ...built, mode: 'condition', signature })
    }

    if (results.length === 0) {
      clearRecommendCandidates()
      showMessage('선택한 조건에 맞는 추천 강의가 없습니다.', 'error')
      return
    }

    setRecommendMode('condition')
    setRecommendCandidates(results)
    setSelectedCandidateIndex(0)
    showMessage(`조건에 맞는 시간표 후보 ${results.length}개를 만들었어요. 카드를 골라 적용하세요.`)
  }

  // 1안 과목을 동일 과목(lectureCode)의 다른 분반·교수로 교체한 대체 시간표(2안) 후보 생성
  function generateAlternativeCandidates(seed) {
    const savedPlansSnapshot = savedPlansRef.current || savedPlans
    const plan1Entries = savedPlansSnapshot.plan1 || []

    if (plan1Entries.length === 0) {
      clearRecommendCandidates()
      showMessage('먼저 1안을 만들어 주세요. 1안 과목을 기준으로 대체 분반을 찾습니다.', 'error')
      return
    }

    const plan1Lectures = uniqueValues(plan1Entries.map(entry => entry.lectureId))
      .map(lectureId => lectureCatalog.find(lecture => String(lecture.id) === String(lectureId)))
      .filter(Boolean)

    if (plan1Lectures.length === 0) {
      clearRecommendCandidates()
      showMessage('1안 강의 정보를 찾을 수 없습니다.', 'error')
      return
    }

    const courseGroups = plan1Lectures.map(original => ({
      original,
      alternatives: lectureCatalog.filter(lecture =>
        getCourseKey(lecture) === getCourseKey(original) &&
        String(lecture.id) !== String(original.id) &&
        hasLectureMeetings(lecture)
      ),
    }))

    const hasAnyAlternative = courseGroups.some(group => group.alternatives.length > 0)
    const rng = createRng(seed + 1)
    const results = []
    const signatures = new Set()
    const maxAttempts = 14

    for (let attempt = 0; results.length < RECOMMEND_CANDIDATE_COUNT && attempt < maxAttempts; attempt++) {
      let courses = []
      const chosen = []
      let swappedCount = 0

      for (const group of courseGroups) {
        const altOrder = attempt === 0 ? group.alternatives : seededShuffle(group.alternatives, rng)
        const tryOrder = [...altOrder, group.original] // 다른 분반 우선, 안 되면 원래 분반

        for (const section of tryOrder) {
          const color = pickCourseColor(courses)
          const entries = localCreateTimetableEntries([section], new Map([[section.id, color]]))
          if (hasTimeConflict(entries, courses)) continue

          courses = [...courses, ...entries]
          chosen.push(section)
          if (String(section.id) !== String(group.original.id)) swappedCount++
          break
        }
      }

      if (chosen.length === 0) continue

      const signature = getCandidateSignature(chosen)
      if (signatures.has(signature)) continue

      signatures.add(signature)
      const credits = chosen.reduce((sum, lecture) => sum + Number(lecture.credit || 0), 0)
      results.push({ ok: true, courses, lectures: chosen, credits, mode: 'alternative', signature, swappedCount })
    }

    if (results.length === 0) {
      clearRecommendCandidates()
      showMessage('대체 시간표를 만들 수 없습니다. 분반이 서로 겹치거나 대체 분반이 없습니다.', 'error')
      return
    }

    setRecommendMode('alternative')
    setRecommendCandidates(results)
    setSelectedCandidateIndex(0)
    const note = hasAnyAlternative ? '' : ' (대체 분반이 없어 기존 분반으로 구성했어요.)'
    showMessage(`1안 기반 대체 시간표 후보 ${results.length}개를 만들었어요.${note}`)
  }

  function regenerateCandidates() {
    const nextSeed = recommendSeed + 1
    setRecommendSeed(nextSeed)
    if (recommendMode === 'alternative') {
      generateAlternativeCandidates(nextSeed)
    } else {
      generateConditionCandidates(nextSeed)
    }
  }

  // 선택한 후보를 현재 1안/2안에 실제 반영(커밋)
  function applyCandidate(index) {
    const candidate = recommendCandidates[index]
    if (!candidate) return

    const planLabel = activePlan === 'plan1' ? '1안' : '2안'
    setCourses(candidate.courses)
    setSavedPlans(prevPlans => {
      const nextPlans = {
        ...prevPlans,
        [activePlan]: candidate.courses,
      }
      savedPlansRef.current = nextPlans
      return nextPlans
    })
    clearRecommendCandidates()
    setToastMessage(`${planLabel}에 적용했어요.`)
    showMessage(`${planLabel}에 적용했어요. (${candidate.lectures.length}과목, ${candidate.credits}학점)`)
  }

  function openSavedPlan(planKey) {
    const planLabel = planKey === 'plan1' ? '1안' : '2안'
    const plansSnapshot = savedPlansRef.current || savedPlans
    setActivePlan(planKey)
    setCourses(plansSnapshot[planKey] || [])
    setRecommendMode('condition')
    clearRecommendCandidates()
    setToastMessage(`${planLabel}을 불러왔습니다.`)
    showMessage(`${planLabel}을 불러왔습니다.`)
  }

  function saveTimetable() {
    // 추가/삭제는 현재 1안/2안 state에 이미 반영되어 있으므로 여기서는 팝업만 닫음
    closeSettingPanel()
    setToastMessage(`${activePlan === 'plan1' ? '1안' : '2안'}이 저장되었습니다.`)
  }

  // 강의 범위 필터(전공/교양 + 대학·학부·전공 + 학년/학점) — 자동 추천/직접 편집 두 탭에서 공유
  const lectureFilterPanel = (
    <div className="lecture-filter-panel">
      <div className="lecture-filter-toolbar">
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
        <div className="lecture-filter-actions">
          {hasActiveLectureFilters && (
            <button type="button" className="lecture-filter-reset" onClick={clearLectureDetailFilters}>
              초기화
            </button>
          )}
          <button
            type="button"
            className={`lecture-filter-toggle ${isLectureFilterOpen || hasActiveLectureFilters ? 'active' : ''}`}
            aria-expanded={isLectureFilterOpen}
            onClick={() => setIsLectureFilterOpen(prev => !prev)}
          >
            필터{hasActiveLectureFilters ? ` ${activeLectureFilterCount}` : ''}
          </button>
        </div>
      </div>

      {isLectureFilterOpen && (
        <div className="lecture-quick-filters">
          <div className="lecture-filter-group">
            <strong>학년</strong>
            <div className="lecture-filter-chip-row">
              {GRADE_OPTIONS.map(option => {
                const isAllOption = option.value === ALL_OPTION
                const isActive = isAllOption ? lectureGradeFilters.length === 0 : lectureGradeFilters.includes(option.value)

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={isActive ? 'active' : ''}
                    aria-pressed={isActive}
                    onClick={() => toggleLectureGradeFilter(option.value)}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="lecture-filter-group">
            <strong>학점</strong>
            <div className="lecture-filter-chip-row">
              {[ALL_OPTION, ...creditFilterOptions].map(credit => {
                const isAllOption = credit === ALL_OPTION
                const isActive = isAllOption ? lectureCreditFilters.length === 0 : lectureCreditFilters.includes(credit)

                return (
                  <button
                    key={credit}
                    type="button"
                    className={isActive ? 'active' : ''}
                    aria-pressed={isActive}
                    onClick={() => toggleLectureCreditFilter(credit)}
                  >
                    {isAllOption ? credit : `${credit}학점`}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

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
  )

  const lectureSearchField = (
    <input
      className="lecture-search-input"
      value={searchText}
      onChange={event => setSearchText(event.target.value)}
      placeholder="계명대 강의명, 교수명, 강의코드, 강의실 검색"
    />
  )

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

            <div className="setting-mode-tabs" role="tablist" aria-label="시간표 생성 방식">
              <button
                type="button"
                role="tab"
                className={settingTab === 'auto' ? 'active' : ''}
                aria-selected={settingTab === 'auto'}
                onClick={() => setSettingTab('auto')}
              >
                자동 추천
              </button>
              <button
                type="button"
                role="tab"
                className={settingTab === 'manual' ? 'active' : ''}
                aria-selected={settingTab === 'manual'}
                onClick={() => setSettingTab('manual')}
              >
                직접 편집
              </button>
            </div>

            {settingTab === 'auto' && (
            <>
            <section className="auto-recommend-section">
              <div className="lecture-search-header">
                <div>
                  <h4>추천 조건</h4>
                  <span>선택한 조건으로 {activePlan === 'plan1' ? '1안' : '2안'} 후보를 여러 개 만들어 비교합니다.</span>
                </div>
                <div className="recommend-actions">
                  {activePlan === 'plan2' && (
                    <button type="button" className="btn-secondary" onClick={() => generateAlternativeCandidates(recommendSeed)}>
                      1안 기반 대체안 (분반·교수 교체)
                    </button>
                  )}
                  <button type="button" className="btn-primary" onClick={() => generateConditionCandidates(recommendSeed)}>
                    시간표 추천
                  </button>
                </div>
              </div>

              <div className="recommend-scope">
                <div className="recommend-scope-head">
                  <strong>강의 범위</strong>
                  <span>전공/교양과 대학·학부·전공을 좁히면 아래 필수 과목 목록도 함께 걸러집니다.</span>
                </div>
                {lectureFilterPanel}
                {lectureSearchField}
              </div>

              <div className="recommend-condition-grid">
                <div className="recommend-condition-card required-course-card">
                  <strong>필수 과목 선택</strong>
                  <span>위 강의 범위/검색 결과에서 꼭 넣을 과목을 체크하세요. ({requiredLectureOptions.length}개)</span>
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
                  <span>수업을 넣지 않을 요일과 목표 조건을 선택하세요.</span>
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
                  <div className="recommend-compact-fields">
                    <label>
                      희망 학점
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength="2"
                        placeholder="예: 18"
                        value={desiredCredits}
                        onChange={event => changeDesiredCredits(event.target.value)}
                      />
                    </label>
                    <label>
                      희망 학년
                      <select value={preferredGrade} onChange={event => setPreferredGrade(event.target.value)}>
                        {GRADE_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
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

            {recommendCandidates.length > 0 && (() => {
              const selectedCandidate = recommendCandidates[selectedCandidateIndex] || recommendCandidates[0]
              const previewCourses = selectedCandidate ? selectedCandidate.courses : []
              return (
                <section className="recommend-candidates">
                  <div className="lecture-search-header">
                    <div>
                      <h4>추천 후보</h4>
                      <span>
                        {recommendMode === 'alternative'
                          ? '1안과 같은 과목을 다른 분반·교수로 바꾼 대체안입니다.'
                          : '마음에 드는 후보를 고른 뒤 적용하세요.'}
                      </span>
                    </div>
                    <button type="button" className="btn-secondary" onClick={regenerateCandidates}>
                      다시 추천
                    </button>
                  </div>

                  <div className="candidate-card-row">
                    {recommendCandidates.map((candidate, index) => {
                      const usedDays = new Set(candidate.courses.map(course => course.day))
                      const freeDaysOfCandidate = DAYS.filter(day => !usedDays.has(day))
                      const isActive = index === selectedCandidateIndex

                      return (
                        <button
                          key={candidate.signature}
                          type="button"
                          className={`candidate-card ${isActive ? 'active' : ''}`}
                          aria-pressed={isActive}
                          onClick={() => setSelectedCandidateIndex(index)}
                        >
                          <div className="candidate-card-head">
                            <strong>후보 {index + 1}</strong>
                            <span>{candidate.lectures.length}과목 · {candidate.credits}학점</span>
                          </div>
                          <div className="candidate-summary">
                            공강 {freeDaysOfCandidate.length > 0 ? freeDaysOfCandidate.join('·') : '없음'}
                            {candidate.mode === 'alternative' && typeof candidate.swappedCount === 'number'
                              ? ` · 분반 교체 ${candidate.swappedCount}개`
                              : ''}
                          </div>
                          <div className="candidate-course-chips">
                            {candidate.lectures.map(lecture => (
                              <span key={lecture.id} className="candidate-course-chip">{lecture.name}</span>
                            ))}
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  <div className="candidate-preview">
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
                            {previewCourses
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
                                </div>
                              ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="candidate-actions">
                    <button type="button" className="btn-primary" onClick={() => applyCandidate(selectedCandidateIndex)}>
                      이 시간표 {activePlan === 'plan1' ? '1안' : '2안'}에 적용
                    </button>
                  </div>
                </section>
              )
            })()}
            </>
            )}

            {settingTab === 'manual' && (
            <div className="lecture-manager">
              <section className="lecture-search-section">
                <div className="lecture-search-header">
                  <h4>강의 검색</h4>
                  <span>{filteredLectures.length}개 강의</span>
                </div>

                {lectureFilterPanel}

                {lectureSearchField}
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
            )}

            {message && <p className={`setting-message ${messageType}`}>{message}</p>}

            {settingTab === 'manual' && (
              <div className="setting-footer">
                <span>{activePlan === 'plan1' ? '1안' : '2안'}에 저장됩니다.</span>
                <button className="btn-primary" type="button" onClick={saveTimetable}>저장</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
