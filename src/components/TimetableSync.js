import { useAppStore } from '../store/useAppStore'
import { timetableCourses } from '../data/timetableData'
import { useState } from 'react'

export default function TimetableSync() {
  const { timetableCourses: stored, syncTimetableCourses } = useAppStore()
  const [synced, setSynced] = useState(false)

  const newCount = timetableCourses.filter(c => !stored.find(s => s.id === c.id)).length
  const diffExists = newCount > 0 || timetableCourses.length !== stored.length

  function handleSync() {
    syncTimetableCourses(timetableCourses)
    setSynced(true)
    setTimeout(() => setSynced(false), 2500)
  }

  return (
    <div className={`sync-panel ${diffExists ? 'sync-panel--alert' : ''}`}>
      <div className="sync-left">
        <span className="sync-icon">{diffExists ? '⚠' : '✓'}</span>
        <div>
          <p className="sync-title">
            {diffExists
              ? `시간표 업데이트 감지 — 새 강의 ${newCount}개 포함`
              : '시간표 동기화 완료'}
          </p>
          <p className="sync-sub">
            timetableData.js 기준 {timetableCourses.length}개 강의 ·{' '}
            {timetableCourses.reduce((s, c) => s + c.credit, 0)}학점
          </p>
        </div>
      </div>
      <button
        className={`sync-btn ${synced ? 'sync-btn--done' : ''}`}
        onClick={handleSync}
      >
        {synced ? '✓ 완료' : '시간표에서 불러오기'}
      </button>
    </div>
  )
}
