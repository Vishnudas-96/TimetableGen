import React, { useEffect, useState } from 'react'
import { classesApi, sectionsApi, timetableApi } from '../utils/api.js'
import { downloadPDF, downloadExcel, downloadAllExcel } from '../utils/api.js'
import { useToast, ToastContainer, TimetableGrid, Loading } from '../components/index.jsx'
import { Eye, FileDown, Sheet, Download } from 'lucide-react'

export default function ClassView() {
  const [classes, setClasses]   = useState([])
  const [sections, setSections] = useState([])
  const [selected, setSelected] = useState('')
  const [ttData, setTtData]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [filterSec, setFilterSec] = useState('')
  const { toasts, toast } = useToast()

  useEffect(() => {
    Promise.all([classesApi.list(), sectionsApi.list()])
      .then(([c,s]) => { setClasses(c); setSections(s) })
      .catch(e => toast.error(e.message))
  }, [])

  useEffect(() => {
    if (!selected) { setTtData(null); return }
    setLoading(true)
    timetableApi.forClass(selected)
      .then(setTtData)
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [selected])

  const filteredClasses = filterSec
    ? classes.filter(c => String(c.section_id) === String(filterSec))
    : classes

  // Group for dropdown
  const byGrade = filteredClasses.reduce((acc,c) => {
    acc[c.grade] = acc[c.grade]||[]
    acc[c.grade].push(c)
    return acc
  }, {})

  const cls = classes.find(c => String(c.id) === String(selected))
  const periods = ttData?.entries?.length || 0

  // Subject summary
  const subjectSummary = ttData?.entries?.reduce((acc,e) => {
    const k = e.subject_name
    acc[k] = acc[k] || { count:0, color:e.subject_color, teacher:e.teacher_name, short:e.subject_short }
    acc[k].count++
    return acc
  }, {}) || {}

  return (
    <div>
      <ToastContainer toasts={toasts}/>

      <div className="page-header">
        <div>
          <div className="page-title"><Eye size={22} style={{color:'var(--accent)'}}/> Class Timetable View</div>
          <div className="page-subtitle">View and export individual class timetables</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <select className="form-select" style={{width:160}} value={filterSec} onChange={e=>{setFilterSec(e.target.value);setSelected('')}}>
            <option value="">All Sections</option>
            {sections.map(s=><option key={s.id} value={s.id}>{s.short_name}</option>)}
          </select>
          <select className="form-select" style={{width:200}} value={selected} onChange={e=>setSelected(e.target.value)}>
            <option value="">Select class...</option>
            {Object.entries(byGrade).map(([grade,gradeClasses])=>(
              <optgroup key={grade} label={grade}>
                {gradeClasses.map(c=><option key={c.id} value={c.id}>{c.grade} – Division {c.division}</option>)}
              </optgroup>
            ))}
          </select>
          {selected && periods > 0 && (
            <>
              <button className="btn btn-secondary" onClick={()=>downloadPDF(selected)}><FileDown size={14}/> PDF</button>
              <button className="btn btn-secondary" onClick={()=>downloadExcel(selected)}><Sheet size={14}/> Excel</button>
            </>
          )}
          <button className="btn btn-secondary" onClick={()=>downloadAllExcel(filterSec||undefined)} title="Export all classes to one Excel workbook">
            <Download size={14}/> All Classes
          </button>
        </div>
      </div>

      {!selected ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <div className="empty-state-title">Select a class to view its timetable</div>
            <div style={{color:'var(--text-muted)',fontSize:13,marginTop:6}}>
              {classes.length === 0 ? 'No classes added yet.' : `${classes.length} classes available`}
            </div>
          </div>
        </div>
      ) : loading ? <Loading text="Loading timetable..."/> : !ttData || periods === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">⚠️</div>
            <div className="empty-state-title">No timetable generated yet for this class</div>
            <div style={{color:'var(--text-muted)',fontSize:13,marginTop:6}}>Go to the Generate page to create the timetable.</div>
          </div>
        </div>
      ) : (
        <>
          <div className="card" style={{marginBottom:16,padding:'14px 18px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
              <div>
                <div style={{fontWeight:700,fontSize:16}}>{ttData.class_info?.grade} — Division {ttData.class_info?.division}</div>
                <div style={{color:'var(--text-muted)',fontSize:12,marginTop:2}}>{ttData.class_info?.section_name} · {ttData.class_info?.strength} students</div>
              </div>
              <div style={{display:'flex',gap:20}}>
                <div style={{textAlign:'center'}}>
                  <div style={{fontFamily:'var(--mono)',fontSize:22,fontWeight:700,color:'var(--accent)'}}>{periods}</div>
                  <div style={{fontSize:11,color:'var(--text-muted)'}}>Periods/Week</div>
                </div>
                <div style={{textAlign:'center'}}>
                  <div style={{fontFamily:'var(--mono)',fontSize:22,fontWeight:700,color:'var(--green)'}}>{Object.keys(subjectSummary).length}</div>
                  <div style={{fontSize:11,color:'var(--text-muted)'}}>Subjects</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{padding:0,marginBottom:16}}>
            <div style={{padding:'12px 18px',borderBottom:'1px solid var(--border)',fontWeight:600,fontSize:13}}>Weekly Timetable</div>
            <div style={{padding:16}}>
              <TimetableGrid entries={ttData.entries} timeSlots={ttData.time_slots} mode="class"/>
            </div>
          </div>

          <div className="card">
            <div style={{fontWeight:600,fontSize:13,marginBottom:12}}>Subject Summary</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
              {Object.entries(subjectSummary).map(([name,info])=>(
                <div key={name} style={{display:'flex',alignItems:'center',gap:7,padding:'6px 12px',borderRadius:20,border:'1px solid var(--border)',fontSize:12,background:'var(--bg)'}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:info.color,flexShrink:0}}/>
                  <span style={{fontWeight:600}}>{info.short}</span>
                  <span style={{color:'var(--text-muted)'}}>{name}</span>
                  <span style={{fontFamily:'var(--mono)',color:'var(--accent)',fontWeight:600}}>{info.count}×</span>
                  <span style={{color:'var(--text-muted)',fontSize:11}}>{info.teacher}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
