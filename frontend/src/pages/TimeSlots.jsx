import React, { useEffect, useState } from 'react'
import { timeslotsApi } from '../utils/api.js'
import { useToast, ToastContainer, Loading } from '../components/index.jsx'
import { Clock, Pencil, X, Check } from 'lucide-react'

const DAYS = {1:'Monday',2:'Tuesday',3:'Wednesday',4:'Thursday',5:'Friday'}

export default function TimeSlots() {
  const [slots, setSlots]     = useState([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId]   = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving]   = useState(false)
  const { toasts, toast } = useToast()

  const load = async () => {
    setLoading(true)
    try { setSlots(await timeslotsApi.list()) } catch(e) { toast.error(e.message) }
    setLoading(false)
  }
  useEffect(()=>{ load() },[])

  const startEdit = s => { setEditId(s.id); setEditForm({start_time:s.start_time, end_time:s.end_time, break_name:s.break_name||''}) }
  const cancelEdit = () => { setEditId(null) }

  const handleSave = async (id) => {
    setSaving(true)
    try {
      await timeslotsApi.update(id, editForm)
      toast.success('Time slot updated')
      setEditId(null)
      load()
    } catch(e) { toast.error(e.message) }
    setSaving(false)
  }

  // Group by period (show Mon only structure, others are same)
  const periodSlots = slots.filter(s=>s.day_of_week===1)

  return (
    <div>
      <ToastContainer toasts={toasts}/>

      <div className="page-header">
        <div>
          <div className="page-title"><Clock size={22} style={{color:'var(--accent)'}}/> Time Slots</div>
          <div className="page-subtitle">Configure daily period timings · Changes apply to all days</div>
        </div>
      </div>

      <div className="alert alert-info" style={{marginBottom:16}}>
        <Clock size={15}/>
        <span>The period structure is the same for all days (Monday–Friday). Edit any period below to update its timing across all days.</span>
      </div>

      {loading ? <Loading/> : (
        <div className="card" style={{padding:0}}>
          <table>
            <thead>
              <tr>
                <th>Period</th>
                <th>Type</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th>Name / Label</th>
                <th>Duration</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {periodSlots.map(slot => {
                const isEdit = editId === slot.id
                const dur = (() => {
                  try {
                    const [sh,sm] = (isEdit?editForm.start_time:slot.start_time).split(':').map(Number)
                    const [eh,em] = (isEdit?editForm.end_time:slot.end_time).split(':').map(Number)
                    return (eh*60+em)-(sh*60+sm)
                  } catch { return '?' }
                })()
                return (
                  <tr key={slot.id} style={{background: slot.is_break ? 'rgba(245,158,11,.04)' : undefined}}>
                    <td>
                      {slot.is_break
                        ? <span style={{color:'var(--yellow)',fontWeight:600,fontSize:12}}>⎯ Break</span>
                        : <span style={{fontFamily:'var(--mono)',fontWeight:700,color:'var(--accent)'}}>P{slot.period_number}</span>}
                    </td>
                    <td>
                      {slot.is_break
                        ? <span className="badge badge-yellow">Break</span>
                        : <span className="badge badge-green">Teaching</span>}
                    </td>
                    <td>
                      {isEdit
                        ? <input className="form-input" type="time" value={editForm.start_time} onChange={e=>setEditForm(f=>({...f,start_time:e.target.value}))} style={{width:110}}/>
                        : <span style={{fontFamily:'var(--mono)',fontSize:13}}>{slot.start_time}</span>}
                    </td>
                    <td>
                      {isEdit
                        ? <input className="form-input" type="time" value={editForm.end_time} onChange={e=>setEditForm(f=>({...f,end_time:e.target.value}))} style={{width:110}}/>
                        : <span style={{fontFamily:'var(--mono)',fontSize:13}}>{slot.end_time}</span>}
                    </td>
                    <td>
                      {isEdit && slot.is_break
                        ? <input className="form-input" value={editForm.break_name} onChange={e=>setEditForm(f=>({...f,break_name:e.target.value}))} placeholder="Break name" style={{width:140}}/>
                        : <span style={{color:'var(--text-muted)',fontSize:12}}>{slot.break_name || (slot.is_break?'Break':'—')}</span>}
                    </td>
                    <td>
                      <span style={{fontFamily:'var(--mono)',fontSize:12,color:'var(--text-dim)'}}>{dur} min</span>
                    </td>
                    <td>
                      {isEdit ? (
                        <div style={{display:'flex',gap:4}}>
                          <button className="btn btn-success btn-sm btn-icon" onClick={()=>handleSave(slot.id)} disabled={saving}><Check size={13}/></button>
                          <button className="btn btn-secondary btn-sm btn-icon" onClick={cancelEdit}><X size={13}/></button>
                        </div>
                      ) : (
                        <button className="btn btn-secondary btn-sm btn-icon" onClick={()=>startEdit(slot)}><Pencil size={12}/></button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Preview all days */}
      {!loading && (
        <div style={{marginTop:20}}>
          <div style={{fontWeight:600,fontSize:14,marginBottom:12,color:'var(--text-dim)'}}>Weekly Period Preview</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10}}>
            {[1,2,3,4,5].map(day=>(
              <div key={day} className="card" style={{padding:12}}>
                <div style={{fontWeight:700,fontSize:12,marginBottom:8,color:'var(--accent)'}}>{DAYS[day]}</div>
                {slots.filter(s=>s.day_of_week===day).map(s=>(
                  <div key={s.id} style={{fontSize:10,marginBottom:4,padding:'3px 6px',borderRadius:4,background:s.is_break?'rgba(245,158,11,.1)':'var(--bg)',color:s.is_break?'var(--yellow)':'var(--text-dim)',fontFamily:'var(--mono)'}}>
                    {s.is_break ? `— ${s.break_name||'Break'} —` : `P${s.period_number} ${s.start_time}–${s.end_time}`}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
