import React, { useEffect, useState } from 'react'
import { teachersApi, timetableApi } from '../utils/api.js'
import { useToast, ToastContainer, TimetableGrid, Loading } from '../components/index.jsx'
import { GraduationCap, FileDown } from 'lucide-react'

export default function TeacherView() {
  const [teachers, setTeachers] = useState([])
  const [selected, setSelected] = useState('')
  const [ttData, setTtData]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [filterType, setFilterType] = useState('')
  const { toasts, toast } = useToast()

  useEffect(() => {
    teachersApi.list().then(setTeachers).catch(e=>toast.error(e.message))
  }, [])

  useEffect(() => {
    if (!selected) { setTtData(null); return }
    setLoading(true)
    timetableApi.forTeacher(selected)
      .then(setTtData)
      .catch(e=>toast.error(e.message))
      .finally(()=>setLoading(false))
  }, [selected])

  const handleExportPDF = () => {
    window.open(`/api/timetable/export/teacher/${selected}/pdf`, '_blank')
  }

  const filtered = filterType === 'link' ? teachers.filter(t=>t.is_link_teacher===1)
    : filterType === 'regular' ? teachers.filter(t=>t.is_link_teacher===0)
    : teachers

  const teacher = teachers.find(t=>String(t.id)===String(selected))
  const periods  = ttData?.entries?.length || 0
  const pct = teacher ? Math.min(100,Math.round(periods/teacher.max_periods_per_week*100)) : 0
  const pctColor = pct > 95 ? 'var(--red)' : pct > 75 ? 'var(--yellow)' : 'var(--green)'

  // Classes summary
  const classesTaught = ttData?.entries
    ? [...new Set(ttData.entries.map(e=>`${e.grade} ${e.division}`))]
    : []

  const subjectCounts = ttData?.entries?.reduce((acc,e) => {
    const k = `${e.grade} ${e.division}`
    acc[k] = acc[k]||{count:0,subject:e.subject_name,color:e.subject_color}
    acc[k].count++
    return acc
  }, {}) || {}

  // Group by section
  const midTeachers  = filtered.filter(t=>t.is_link_teacher===0)
  const linkTeachers = filtered.filter(t=>t.is_link_teacher===1)

  return (
    <div>
      <ToastContainer toasts={toasts}/>

      <div className="page-header">
        <div>
          <div className="page-title"><GraduationCap size={22} style={{color:'var(--accent)'}}/> Teacher Timetable View</div>
          <div className="page-subtitle">Individual teacher schedules and workload analysis</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <select className="form-select" style={{width:150}} value={filterType} onChange={e=>{setFilterType(e.target.value);setSelected('')}}>
            <option value="">All Teachers</option>
            <option value="regular">Regular Only</option>
            <option value="link">Link Only</option>
          </select>
          <select className="form-select" style={{width:220}} value={selected} onChange={e=>setSelected(e.target.value)}>
            <option value="">Select teacher...</option>
            {midTeachers.length>0 && <optgroup label="Middle Section Teachers">{midTeachers.map(t=><option key={t.id} value={t.id}>{t.name} · {t.subject_name||'?'}</option>)}</optgroup>}
            {linkTeachers.length>0 && <optgroup label="Link Teachers">{linkTeachers.map(t=><option key={t.id} value={t.id}>↔ {t.name} · {t.subject_name||'?'} [{t.section_name}]</option>)}</optgroup>}
          </select>
          {selected && periods > 0 && (
            <button className="btn btn-secondary" onClick={handleExportPDF}><FileDown size={14}/> PDF</button>
          )}
        </div>
      </div>

      {!selected ? (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:10}}>
          {filtered.map(t=>{
            const pct = Math.min(100,Math.round(t.scheduled_periods/t.max_periods_per_week*100))
            const col = pct>95?'var(--red)':pct>75?'var(--yellow)':'var(--green)'
            return (
              <div key={t.id} className="card" style={{padding:14,cursor:'pointer',borderColor:selected===String(t.id)?'var(--accent)':'var(--border)',transition:'border-color .15s'}} onClick={()=>setSelected(String(t.id))}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                  <span style={{fontWeight:600,fontSize:13}}>{t.name}</span>
                  {t.is_link_teacher===1 && <span className="badge badge-cyan" style={{fontSize:9}}>Link</span>}
                </div>
                <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:8}}>{t.subject_name||'No subject'} · {t.section_name}</div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:4}}>
                  <span style={{color:'var(--text-muted)'}}>Scheduled</span>
                  <span style={{fontFamily:'var(--mono)',color:col}}>{t.scheduled_periods}/{t.max_periods_per_week}</span>
                </div>
                <div className="workload-bar"><div className="workload-fill" style={{width:`${pct}%`,background:col}}/></div>
              </div>
            )
          })}
          {filtered.length===0 && (
            <div className="card" style={{gridColumn:'1/-1'}}>
              <div className="empty-state"><div className="empty-state-icon">👩‍🏫</div><div className="empty-state-title">No teachers found</div></div>
            </div>
          )}
        </div>
      ) : loading ? <Loading text="Loading schedule..."/> : (
        <>
          {/* Teacher info bar */}
          {teacher && (
            <div className="card" style={{marginBottom:16,padding:'14px 18px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:44,height:44,borderRadius:10,background:'var(--accent-glow)',border:'1px solid rgba(99,102,241,.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:700,color:'var(--accent)'}}>
                    {teacher.name.charAt(0)}
                  </div>
                  <div>
                    <div style={{fontWeight:700,fontSize:16,display:'flex',alignItems:'center',gap:8}}>
                      {teacher.name}
                      {teacher.is_link_teacher===1 && <span className="badge badge-cyan">Link Teacher</span>}
                    </div>
                    <div style={{fontSize:12,color:'var(--text-muted)',marginTop:2}}>
                      {teacher.subject_name||'No subject'} · {teacher.section_name}
                      {teacher.email && ` · ${teacher.email}`}
                    </div>
                  </div>
                </div>
                <div style={{display:'flex',gap:20}}>
                  {[
                    {label:'Scheduled', value:periods, color:pctColor},
                    {label:'Max Allowed', value:teacher.max_periods_per_week, color:'var(--text)'},
                    {label:'Workload', value:`${pct}%`, color:pctColor},
                    {label:'Classes', value:classesTaught.length, color:'var(--cyan)'},
                  ].map(({label,value,color})=>(
                    <div key={label} style={{textAlign:'center'}}>
                      <div style={{fontFamily:'var(--mono)',fontSize:20,fontWeight:700,color}}>{value}</div>
                      <div style={{fontSize:11,color:'var(--text-muted)'}}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{marginTop:14}}>
                <div className="workload-bar" style={{height:8,borderRadius:4}}>
                  <div className="workload-fill" style={{width:`${pct}%`,background:pctColor,borderRadius:4}}/>
                </div>
              </div>
            </div>
          )}

          {/* Timetable */}
          {periods === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <div className="empty-state-title">No periods scheduled for this teacher</div>
              </div>
            </div>
          ) : (
            <>
              <div className="card" style={{padding:0,marginBottom:16}}>
                <div style={{padding:'12px 18px',borderBottom:'1px solid var(--border)',fontWeight:600,fontSize:13}}>Weekly Schedule</div>
                <div style={{padding:16}}>
                  <TimetableGrid entries={ttData.entries} timeSlots={ttData.time_slots} mode="teacher"/>
                </div>
              </div>

              <div className="card">
                <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>Classes Schedule</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                  {Object.entries(subjectCounts).map(([cls,info])=>(
                    <div key={cls} style={{display:'flex',alignItems:'center',gap:7,padding:'6px 12px',borderRadius:20,border:'1px solid var(--border)',fontSize:12,background:'var(--bg)'}}>
                      <div style={{width:8,height:8,borderRadius:'50%',background:info.color,flexShrink:0}}/>
                      <span style={{fontWeight:600}}>{cls}</span>
                      <span style={{fontFamily:'var(--mono)',color:'var(--accent)',fontWeight:600}}>{info.count}×</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
