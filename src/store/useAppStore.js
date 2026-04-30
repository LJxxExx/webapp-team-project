/**
 * 전역 상태 스토어 (Zustand)
 *
 * [팀원 연동 구조]
 * - timetableCourses: 시간표 팀원이 관리하는 강의 목록 (src/data/timetableData.js)
 * - courseStats: 위험도 팀원(백현우)이 관리하는 출석/과제/시험 실적 데이터
 * - 두 데이터를 courseId 기준으로 merge하여 사용합니다.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { timetableCourses } from '../data/timetableData'

const DEFAULT_STATS = (course) => ({
  courseId: course.id,
  absent: 0,
  hwMiss: 0,
  exam: null,   // null = 미입력
})

export const useAppStore = create(
  persist(
    (set, get) => ({
      // ── 시간표 팀원 데이터 (읽기 전용, 시간표 파트에서 관리) ──
      timetableCourses,

      // ── 위험도 실적 데이터 (이 파트에서 관리) ──
      // { [courseId]: { absent, hwMiss, exam } }
      courseStats: Object.fromEntries(
        timetableCourses.map(c => [c.id, DEFAULT_STATS(c)])
      ),

      // 선택된 과목 id
      selectedCourseId: timetableCourses[0]?.id ?? null,

      // ── 파생 데이터: 시간표 + 실적 merge ──
      getMergedCourses() {
        const { timetableCourses, courseStats } = get()
        return timetableCourses.map(course => ({
          ...course,
          ...(courseStats[course.id] ?? DEFAULT_STATS(course)),
        }))
      },

      // ── Actions ──

      selectCourse(id) {
        set({ selectedCourseId: id })
      },

      updateStat(courseId, key, value) {
        set(state => ({
          courseStats: {
            ...state.courseStats,
            [courseId]: {
              ...state.courseStats[courseId],
              [key]: value,
            },
          },
        }))
      },

      /**
       * 시간표 팀원이 강의를 추가했을 때 호출
       * (시간표 store에서 직접 호출하거나, timetableData.js 변경 후 앱 재시작)
       */
      syncTimetableCourses(newCourses) {
        const prev = get().courseStats
        const synced = Object.fromEntries(
          newCourses.map(c => [c.id, prev[c.id] ?? DEFAULT_STATS(c)])
        )
        set({ timetableCourses: newCourses, courseStats: synced })
      },
    }),
    {
      name: 'grade-risk-storage', // localStorage key
      partialState: (state) => ({ courseStats: state.courseStats }), // 실적만 저장
    }
  )
)
