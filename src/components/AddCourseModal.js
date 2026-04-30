import { useState } from 'react'

const DEFAULT = {
  name: '', credit: 3, totalClass: 15,
  absent: 0, hwTotal: 5, hwMiss: 0, exam: '',
}

export default function AddCourseModal({ onAdd, onClose }) {
  const [form, setForm] = useState(DEFAULT)

  function set(key, val) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  function handleSubmit() {
    if (!form.name.trim()) return
    onAdd({
      name: form.name.trim(),
      credit: Number(form.credit),
      totalClass: Number(form.totalClass),
      absent: Number(form.absent),
      hwTotal: Number(form.hwTotal),
      hwMiss: Number(form.hwMiss),
      exam: form.exam === '' ? null : Number(form.exam),
    })
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <h2 className="modal-title">새 수업 추가</h2>

        <Field label="수업명">
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="예: 웹어플리케이션구축" />
        </Field>
        <Field label="학점">
          <input type="number" min={1} max={4} value={form.credit} onChange={e => set('credit', e.target.value)} />
        </Field>
        <Field label="총 수업 횟수">
          <input type="number" min={1} value={form.totalClass} onChange={e => set('totalClass', e.target.value)} />
        </Field>
        <Field label="결석 횟수">
          <input type="number" min={0} value={form.absent} onChange={e => set('absent', e.target.value)} />
        </Field>
        <Field label="총 과제 수">
          <input type="number" min={0} value={form.hwTotal} onChange={e => set('hwTotal', e.target.value)} />
        </Field>
        <Field label="미제출 과제 수">
          <input type="number" min={0} value={form.hwMiss} onChange={e => set('hwMiss', e.target.value)} />
        </Field>
        <Field label="현재 시험 점수 (없으면 빈칸)">
          <input type="number" min={0} max={100} value={form.exam} onChange={e => set('exam', e.target.value)} placeholder="예: 78" />
        </Field>

        <div className="modal-btns">
          <button className="btn-cancel" onClick={onClose}>취소</button>
          <button className="btn-confirm" onClick={handleSubmit}>추가</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="form-field">
      <label className="form-label">{label}</label>
      {children}
    </div>
  )
}
