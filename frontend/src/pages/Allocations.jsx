import React, { useEffect, useState } from 'react'
import { allocsApi, classesApi, subjectsApi, teachersApi, sectionsApi } from '../utils/api.js'
import { useToast, ToastContainer, ConfirmDialog, Loading } from '../components/index.jsx'
import { ListTodo, Plus, Pencil, Trash2, X, Filter, AlertTriangle } from 'lucide-react'

const emptyForm = { class_id:'', subject_id:'', teacher_id:'', periods_per_week:4, is_double_period:false, priority:1 }

export default function Allocations() {
  const [data, setData]           = useState([])
  const [classes, setClasses]     = useState([])
  const [subjects, setSubjects]   = useState([])
  const [teachers, setTeachers]   = useState([])
  const [sections, setSections]   = useState([])
  const [workload, setWorkload]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(null)
  const [form, setForm]           = useState(emptyForm)
  const [editId, setEditId]       = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [saving, setSaving]       = useState(false)
  const [filterClass, setFilterClass]   = useState('')
  const [filterSection, setFilterSection] = useState('')
  const { toasts, toast } = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filterClass)   params.class_id   = filterClass
      if (filterSection) params.section_id = filterSection
      const [a, c, s, t, sec, wl] = await Promise.all([
        allocsApi.list(params),
        classesApi.list(),
        subjectsApi.list(),
        teachersApi.list(),
        sectionsApi.list(),
        allocsApi.teacherLoad(),
      ])
      setData(a); setClasses(c); setSubjects(s); setTeachers(t); setSections(sec); setWorkload(wl)
    } catch(e) { toast.error(e.message) }
    setLoading(false)
  }
  useEffect(() => { load() }, [filterClass, filterSection])

  const openAdd  = () => { setForm({...emptyForm, class_id:filterClass||''}); setEditId(null); setModal('form') }
  const openEdit = a => {
    setForm({ class_id:a.class_id, subject_id:a.subject_id, teacher_id:a.teacher_id,
              periods_per_week:a.periods_per_week, is_double_period:a.is_double_period===1, priority:a.priority })
    setEditId(a.id); setModal('form')
  }

  const handleSave = async () => {
    if (!form.class_id || !form.subject_id || !form.teacher_id) return toast.error('Class, subject and teacher are required')
    setSaving(true)
    try {
      if (editId) { await allocsApi.update(editId, form); toast.success('Allocation updated') }
      else { await allocsApi.create(form); toast.success('Allocation created') }
      setModal(null); load()
    } catch(e) { toast.error(e.response?.data?.detail || e.message) }
    setSaving(false)
  }

  const handleDelete = async () => {
    try { await allocsApi.delete(confirmDel.id); toast.success('Deleted'); setConfirmDel(null); load() }
    catch(e) { toast.error(e.message) }
  }

  // Overloaded teachers warning
  const overloaded = workload.filter(t => t.allocated_periods > t.max_periods_per_week)

  // Group data by class
  const byClass = data.reduce((acc, a) => {
    const key = `${a.grade} ${a.division}`
    acc[key] = acc[key] || []
    acc[key].push(a)
    return acc
  }, {})

  // Subject periods auto-fill helper
  const selectedSubject = subjects.find(s => String(s.id) === String(form.subject_id))
  const suggestedPeriods = { 1:6, 2:4, 3:2 }

  return (
    <div>
      <ToastContainer toasts={toasts}/>
      {confirmDel && <ConfirmDialog title="Remove Allocation" message={`Remove "${confirmDel.subject_name}" from ${confirmDel.grade} ${confirmDel.division}?`} onConfirm={handleDelete} onCancel={()=>setConfirmDel(null)}/>}

      <div className="page-header">
        <div>
          <div className="page-title"><ListTodo size={22} style={{color:'var(--accent)'}}/> Subject Allocations</div>
          <div className="page-subtitle">{data.length} allocations · Who teaches what to which class</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <select className="form-select" style={{width:170}} value={filterSection} onChange={e=>{setFilterSection(e.target.value);setFilterClass('')}}>
            <option value="">All Sections</option>
            {sections.map(s=><option key={s.id} value={s.id}>{s.short_name}</option>)}
          </select>
          <select className="form-select" style={{width:170}} value={filterClass} onChange={e=>setFilterClass(e.target.value)}>
            <option value="">All Classes</option>
            {classes.map(c=><option key={c.id} value={c.id}>{c.grade} – {c.division}</option>)}
          </select>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={15}/> Add Allocation</button>
        </div>
      </div>

      {/* Overload warnings */}
      {overloaded.length > 0 && (
        <div className="alert alert-warning" style={{marginBottom:16}}>
          <AlertTriangle size={16} style={{flexShrink:0}}/>
          <div>
            <strong>Teacher overload detected:</strong>{' '}
            {overloaded.map(t=>`${t.name} (${t.allocated_periods}/${t.max_periods_per_week})`).join(', ')}
          </div>
        </div>
      )}

      {loading ? <Loading/> : data.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No allocations found</div>
            <div style={{marginTop:12}}><button className="btn btn-primary" onClick={openAdd}><Plus size={14}/> Add Allocation</button></div>
          </div>
        </div>
      ) : (
        Object.entries(byClass).map(([className, allocs]) => (
          <div key={className} className="card" style={{marginBottom:14,padding:0}}>
            <div style={{padding:'10px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontWeight:600,fontSize:14}}>{className}</span>
              <span style={{fontSize:12,color:'var(--text-muted)'}}>{allocs.reduce((s,a)=>s+a.periods_per_week,0)} periods/week total</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Teacher</th>
                    <th>Type</th>
                    <th>Periods/Week</th>
                    <th>Double Period</th>
                    <th>Priority</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {allocs.map(a=>(
                    <tr key={a.id}>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:7}}>
                          <div style={{width:10,height:10,borderRadius:'50%',background:a.subject_color,flexShrink:0}}/>
                          <span style={{fontWeight:500}}>{a.subject_name}</span>
                        </div>
                      </td>
                      <td style={{fontWeight:500}}>{a.teacher_name}</td>
                      <td>
                        {a.is_link_teacher === 1
                          ? <span className="badge badge-cyan">Link</span>
                          : <span className="badge badge-green">Regular</span>}
                      </td>
                      <td><span className="badge badge-accent">{a.periods_per_week}</span></td>
                      <td>{a.is_double_period===1 ? <span className="badge badge-purple">Double</span> : <span style={{color:'var(--text-muted)',fontSize:12}}>—</span>}</td>
                      <td><span style={{fontSize:11,color: a.subject_priority===1?'var(--red)':a.subject_priority===2?'var(--yellow)':'var(--green)'}}>P{a.subject_priority}</span></td>
                      <td>
                        <div className="row-actions">
                          <button className="btn btn-secondary btn-sm btn-icon" onClick={()=>openEdit(a)}><Pencil size={12}/></button>
                          <button className="btn btn-danger btn-sm btn-icon" onClick={()=>setConfirmDel(a)}><Trash2 size={12}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {modal === 'form' && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editId ? 'Edit Allocation' : 'Add Allocation'}</h2>
              <button className="btn btn-secondary btn-sm btn-icon" onClick={()=>setModal(null)}><X size={14}/></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Class *</label>
                <select className="form-select" value={form.class_id} onChange={e=>setForm(f=>({...f,class_id:e.target.value}))}>
                  <option value="">Select class...</option>
                  {classes.map(c=><option key={c.id} value={c.id}>{c.grade} – {c.division} ({c.section_name})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Subject *</label>
                <select className="form-select" value={form.subject_id} onChange={e=>{
                  const sub = subjects.find(s=>String(s.id)===e.target.value)
                  setForm(f=>({...f, subject_id:e.target.value, priority:sub?.priority||2, periods_per_week:suggestedPeriods[sub?.priority]||4}))
                }}>
                  <option value="">Select subject...</option>
                  {subjects.map(s=><option key={s.id} value={s.id}>{s.name} (P{s.priority})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Teacher *</label>
                <select className="form-select" value={form.teacher_id} onChange={e=>setForm(f=>({...f,teacher_id:e.target.value}))}>
                  <option value="">Select teacher...</option>
                  <optgroup label="Middle Section Teachers">
                    {teachers.filter(t=>t.is_link_teacher===0).map(t=><option key={t.id} value={t.id}>{t.name} · {t.subject_name||'?'} ({t.scheduled_periods}/{t.max_periods_per_week})</option>)}
                  </optgroup>
                  <optgroup label="Link Teachers">
                    {teachers.filter(t=>t.is_link_teacher===1).map(t=><option key={t.id} value={t.id}>↔ {t.name} · {t.subject_name||'?'} [{t.section_name}]</option>)}
                  </optgroup>
                </select>
              </div>
              <div className="two-col">
                <div className="form-group">
                  <label className="form-label">Periods Per Week</label>
                  <input className="form-input" type="number" min={1} max={10} value={form.periods_per_week} onChange={e=>setForm(f=>({...f,periods_per_week:parseInt(e.target.value)||1}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Generation Priority</label>
                  <select className="form-select" value={form.priority} onChange={e=>setForm(f=>({...f,priority:parseInt(e.target.value)}))}>
                    <option value={1}>1 — Core (first)</option>
                    <option value={2}>2 — Language/Social</option>
                    <option value={3}>3 — Other (last)</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label style={{display:'flex',alignItems:'center',gap:8,padding:'9px 12px',background:'var(--bg)',border:'1px solid var(--border-bright)',borderRadius:'var(--radius-sm)',cursor:'pointer'}}>
                  <input type="checkbox" checked={form.is_double_period} onChange={e=>setForm(f=>({...f,is_double_period:e.target.checked}))} style={{accentColor:'var(--purple)'}}/>
                  <span style={{fontSize:13,color:form.is_double_period?'var(--purple)':'var(--text-dim)'}}>Double Period (2 consecutive slots)</span>
                </label>
                <div className="form-hint">Use for Science lab, Computer lab, Art sessions etc.</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving...':'Save Allocation'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
