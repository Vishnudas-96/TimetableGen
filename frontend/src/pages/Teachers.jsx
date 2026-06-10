import React, { useEffect, useState } from 'react'
import { teachersApi, sectionsApi, subjectsApi, availApi, timeslotsApi } from '../utils/api.js'
import { useToast, ToastContainer, ConfirmDialog, Loading } from '../components/index.jsx'
import { Users, Plus, Pencil, Trash2, X, Grid, ChevronDown } from 'lucide-react'

const DAYS = {1:'Mon',2:'Tue',3:'Wed',4:'Thu',5:'Fri'}
const emptyForm = { name:'', short_name:'', email:'', section_id:'', subject_id:'', is_link_teacher:false, max_periods_per_week:29 }

export default function Teachers() {
  const [data, setData]           = useState([])
  const [sections, setSections]   = useState([])
  const [subjects, setSubjects]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(null)   // 'form' | 'avail'
  const [form, setForm]           = useState(emptyForm)
  const [editId, setEditId]       = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [saving, setSaving]       = useState(false)
  const [availTeacher, setAvailTeacher] = useState(null)
  const [availData, setAvailData] = useState({ available_slot_ids:[], all_teaching_slots:[] })
  const [selectedSlots, setSelectedSlots] = useState(new Set())
  const [filterSection, setFilterSection] = useState('')
  const { toasts, toast } = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const [t, s, sub] = await Promise.all([teachersApi.list(), sectionsApi.list(), subjectsApi.list()])
      setData(t); setSections(s); setSubjects(sub)
    } catch(e) { toast.error(e.message) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openAdd = () => { setForm(emptyForm); setEditId(null); setModal('form') }
  const openEdit = t => {
    setForm({ name:t.name, short_name:t.short_name, email:t.email||'', section_id:t.section_id,
              subject_id:t.subject_id||'', is_link_teacher:t.is_link_teacher===1, max_periods_per_week:t.max_periods_per_week })
    setEditId(t.id); setModal('form')
  }

  const openAvail = async t => {
    setAvailTeacher(t)
    try {
      const d = await availApi.get(t.id)
      setAvailData(d)
      setSelectedSlots(new Set(d.available_slot_ids))
    } catch(e) { toast.error(e.message) }
    setModal('avail')
  }

  const saveAvail = async () => {
    setSaving(true)
    try {
      await availApi.set(availTeacher.id, { slot_ids: [...selectedSlots] })
      toast.success('Availability saved')
      setModal(null)
    } catch(e) { toast.error(e.message) }
    setSaving(false)
  }

  const toggleSlot = id => {
    setSelectedSlots(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.short_name.trim()) return toast.error('Name and short code required')
    if (!form.section_id) return toast.error('Section is required')
    setSaving(true)
    try {
      const payload = { ...form, subject_id: form.subject_id || null }
      if (editId) { await teachersApi.update(editId, payload); toast.success('Teacher updated') }
      else { await teachersApi.create(payload); toast.success('Teacher added') }
      setModal(null); load()
    } catch(e) { toast.error(e.response?.data?.detail || e.message) }
    setSaving(false)
  }

  const handleDelete = async () => {
    try { await teachersApi.delete(confirmDel.id); toast.success('Teacher deleted'); setConfirmDel(null); load() }
    catch(e) { toast.error(e.message) }
  }

  // Group slots by day for availability grid
  const slotsByDay = availData.all_teaching_slots.reduce((acc, s) => {
    acc[s.day_of_week] = acc[s.day_of_week] || []
    acc[s.day_of_week].push(s)
    return acc
  }, {})

  const filtered = filterSection ? data.filter(t => String(t.section_id) === String(filterSection)) : data
  const midTeachers  = filtered.filter(t => t.is_link_teacher === 0)
  const linkTeachers = filtered.filter(t => t.is_link_teacher === 1)

  return (
    <div>
      <ToastContainer toasts={toasts}/>
      {confirmDel && <ConfirmDialog title="Delete Teacher" message={`Delete "${confirmDel.name}"? Their allocations will also be removed.`} onConfirm={handleDelete} onCancel={()=>setConfirmDel(null)}/>}

      <div className="page-header">
        <div>
          <div className="page-title"><Users size={22} style={{color:'var(--accent)'}}/> Teachers</div>
          <div className="page-subtitle">{data.length} teachers · {data.filter(t=>t.is_link_teacher===1).length} link teachers</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <select className="form-select" style={{width:180}} value={filterSection} onChange={e=>setFilterSection(e.target.value)}>
            <option value="">All Sections</option>
            {sections.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={15}/> Add Teacher</button>
        </div>
      </div>

      {loading ? <Loading/> : (
        <>
          {/* Middle Section Teachers */}
          {midTeachers.length > 0 && (
            <div className="card" style={{marginBottom:16,padding:0}}>
              <div style={{padding:'12px 18px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:8}}>
                <span className="badge badge-accent">Middle Section</span>
                <span style={{fontSize:13,color:'var(--text-muted)'}}>{midTeachers.length} teachers</span>
              </div>
              <TeacherTable teachers={midTeachers} onEdit={openEdit} onDelete={setConfirmDel} onAvail={null}/>
            </div>
          )}

          {/* Link Teachers */}
          {linkTeachers.length > 0 && (
            <div className="card" style={{padding:0}}>
              <div style={{padding:'12px 18px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:8}}>
                <span className="badge badge-cyan">Link Teachers</span>
                <span style={{fontSize:13,color:'var(--text-muted)'}}>{linkTeachers.length} teachers from other sections</span>
              </div>
              <TeacherTable teachers={linkTeachers} onEdit={openEdit} onDelete={setConfirmDel} onAvail={openAvail} showAvail/>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">👨‍🏫</div>
                <div className="empty-state-title">No teachers yet</div>
                <div style={{marginTop:12}}><button className="btn btn-primary" onClick={openAdd}><Plus size={14}/> Add First Teacher</button></div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      {modal === 'form' && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editId ? 'Edit Teacher' : 'Add Teacher'}</h2>
              <button className="btn btn-secondary btn-sm btn-icon" onClick={()=>setModal(null)}><X size={14}/></button>
            </div>
            <div className="modal-body">
              <div className="two-col">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Alice Johnson"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Short Code *</label>
                  <input className="form-input" value={form.short_name} onChange={e=>setForm(f=>({...f,short_name:e.target.value.toUpperCase()}))} placeholder="e.g. ALJ" maxLength={5}/>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="teacher@school.edu"/>
              </div>
              <div className="two-col">
                <div className="form-group">
                  <label className="form-label">Home Section *</label>
                  <select className="form-select" value={form.section_id} onChange={e=>setForm(f=>({...f,section_id:e.target.value}))}>
                    <option value="">Select section...</option>
                    {sections.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <select className="form-select" value={form.subject_id} onChange={e=>setForm(f=>({...f,subject_id:e.target.value}))}>
                    <option value="">Select subject...</option>
                    {subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="two-col">
                <div className="form-group">
                  <label className="form-label">Max Periods/Week</label>
                  <input className="form-input" type="number" min={1} max={40} value={form.max_periods_per_week} onChange={e=>setForm(f=>({...f,max_periods_per_week:parseInt(e.target.value)||29}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Teacher Type</label>
                  <label style={{display:'flex',alignItems:'center',gap:8,padding:'9px 12px',background:'var(--bg)',border:'1px solid var(--border-bright)',borderRadius:'var(--radius-sm)',cursor:'pointer'}}>
                    <input type="checkbox" checked={form.is_link_teacher} onChange={e=>setForm(f=>({...f,is_link_teacher:e.target.checked}))} style={{accentColor:'var(--cyan)'}}/>
                    <span style={{fontSize:13,color: form.is_link_teacher ? 'var(--cyan)' : 'var(--text-dim)'}}>Link Teacher</span>
                  </label>
                </div>
              </div>
              {form.is_link_teacher && (
                <div className="alert alert-info" style={{fontSize:12}}>
                  Link teachers must have their free slots marked in the Availability Grid after saving.
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><div className="spinner" style={{width:14,height:14}}/> Saving...</> : 'Save Teacher'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Availability Modal */}
      {modal === 'avail' && availTeacher && (
        <div className="modal-overlay">
          <div className="modal" style={{maxWidth:620}}>
            <div className="modal-header">
              <h2><Grid size={16} style={{display:'inline',marginRight:8}}/>Availability — {availTeacher.name}</h2>
              <button className="btn btn-secondary btn-sm btn-icon" onClick={()=>setModal(null)}><X size={14}/></button>
            </div>
            <div className="modal-body">
              <div className="alert alert-info" style={{fontSize:12,marginBottom:4}}>
                Click slots to mark as <strong>FREE</strong> (green = available for Middle section). 
                Slots not marked will be treated as busy.
              </div>
              <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:12}}>
                {selectedSlots.size} slots marked free
              </div>

              {/* Grid: days as columns, periods as rows */}
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr>
                      <th style={{padding:'6px 10px',fontSize:11,color:'var(--text-muted)',textAlign:'left',borderBottom:'1px solid var(--border)'}}>Period</th>
                      {[1,2,3,4,5].map(d=>(
                        <th key={d} style={{padding:'6px 10px',fontSize:11,color:'var(--text-muted)',textAlign:'center',borderBottom:'1px solid var(--border)'}}>{DAYS[d]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...new Set(availData.all_teaching_slots.map(s=>s.period_number))].sort((a,b)=>a-b).map(pnum => {
                      const anySlot = availData.all_teaching_slots.find(s=>s.period_number===pnum)
                      return (
                        <tr key={pnum}>
                          <td style={{padding:'5px 10px',fontSize:12,color:'var(--text-dim)',fontFamily:'var(--mono)',borderBottom:'1px solid var(--border)',whiteSpace:'nowrap'}}>
                            P{pnum} {anySlot ? `${anySlot.start_time}` : ''}
                          </td>
                          {[1,2,3,4,5].map(day=>{
                            const slot = availData.all_teaching_slots.find(s=>s.day_of_week===day&&s.period_number===pnum)
                            if(!slot) return <td key={day} style={{borderBottom:'1px solid var(--border)'}}/>
                            const isFree = selectedSlots.has(slot.id)
                            return (
                              <td key={day} style={{padding:'4px 6px',textAlign:'center',borderBottom:'1px solid var(--border)'}}>
                                <div
                                  className={`avail-slot ${isFree?'free':'busy'}`}
                                  onClick={()=>toggleSlot(slot.id)}
                                  style={{margin:'0 auto'}}
                                  title={isFree?'Free — click to mark busy':'Busy — click to mark free'}
                                >
                                  {isFree ? '✓' : '·'}
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{display:'flex',gap:16,marginTop:12,fontSize:12}}>
                <button className="btn btn-secondary btn-sm" onClick={()=>setSelectedSlots(new Set(availData.all_teaching_slots.map(s=>s.id)))}>Mark All Free</button>
                <button className="btn btn-secondary btn-sm" onClick={()=>setSelectedSlots(new Set())}>Clear All</button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn btn-success" onClick={saveAvail} disabled={saving}>
                {saving ? 'Saving...' : `Save Availability (${selectedSlots.size} slots)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TeacherTable({ teachers, onEdit, onDelete, onAvail, showAvail }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Code</th>
            <th>Section</th>
            <th>Subject</th>
            <th>Max Periods</th>
            <th>Scheduled</th>
            {showAvail && <th>Availability</th>}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {teachers.map(t=>(
            <tr key={t.id}>
              <td style={{fontWeight:500}}>{t.name}</td>
              <td><span className="badge badge-accent">{t.short_name}</span></td>
              <td><span style={{fontSize:12,color:'var(--text-dim)'}}>{t.section_name}</span></td>
              <td>
                {t.subject_name
                  ? <span style={{fontSize:12,fontWeight:500,color:t.subject_color||'var(--text)'}}>{t.subject_name}</span>
                  : <span style={{color:'var(--text-muted)',fontSize:12}}>—</span>}
              </td>
              <td><span style={{fontFamily:'var(--mono)',fontSize:13}}>{t.max_periods_per_week}</span></td>
              <td>
                {t.scheduled_periods > t.max_periods_per_week
                  ? <span className="badge badge-red">{t.scheduled_periods} ⚠</span>
                  : <span className="badge badge-green">{t.scheduled_periods}</span>}
              </td>
              {showAvail && (
                <td>
                  <button className="btn btn-secondary btn-sm" onClick={()=>onAvail(t)} style={{fontSize:11}}>
                    <Grid size={12}/> Set Free Slots
                  </button>
                </td>
              )}
              <td>
                <div className="row-actions">
                  <button className="btn btn-secondary btn-sm btn-icon" onClick={()=>onEdit(t)} title="Edit"><Pencil size={13}/></button>
                  <button className="btn btn-danger btn-sm btn-icon" onClick={()=>onDelete(t)} title="Delete"><Trash2 size={13}/></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
