import React, { useEffect, useState } from 'react'
import { classesApi, sectionsApi } from '../utils/api.js'
import { useToast, ToastContainer, ConfirmDialog, Loading } from '../components/index.jsx'
import { School, Plus, Pencil, Trash2, X } from 'lucide-react'

const emptyForm = { grade:'', division:'', section_id:'', strength:35 }

export default function Classes() {
  const [data, setData]         = useState([])
  const [sections, setSections] = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(null)
  const [form, setForm]         = useState(emptyForm)
  const [editId, setEditId]     = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [saving, setSaving]     = useState(false)
  const [filterSec, setFilterSec] = useState('')
  const { toasts, toast } = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const [c, s] = await Promise.all([classesApi.list(), sectionsApi.list()])
      setData(c); setSections(s)
    } catch(e) { toast.error(e.message) }
    setLoading(false)
  }
  useEffect(()=>{ load() },[])

  const openAdd  = () => { setForm({...emptyForm, section_id: filterSec||''}); setEditId(null); setModal('form') }
  const openEdit = c => { setForm({grade:c.grade,division:c.division,section_id:c.section_id,strength:c.strength}); setEditId(c.id); setModal('form') }

  const handleSave = async () => {
    if (!form.grade.trim() || !form.division.trim()) return toast.error('Grade and division required')
    if (!form.section_id) return toast.error('Section is required')
    setSaving(true)
    try {
      if (editId) { await classesApi.update(editId, form); toast.success('Class updated') }
      else { await classesApi.create(form); toast.success('Class added') }
      setModal(null); load()
    } catch(e) { toast.error(e.response?.data?.detail || e.message) }
    setSaving(false)
  }

  const handleDelete = async () => {
    try { await classesApi.delete(confirmDel.id); toast.success('Class deleted'); setConfirmDel(null); load() }
    catch(e) { toast.error(e.message) }
  }

  // Group by section → grade
  const filtered = filterSec ? data.filter(c=>String(c.section_id)===String(filterSec)) : data
  const bySec = filtered.reduce((acc,c) => {
    const key = c.section_name||'Unknown'
    acc[key] = acc[key]||{}
    acc[key][c.grade] = acc[key][c.grade]||[]
    acc[key][c.grade].push(c)
    return acc
  }, {})

  return (
    <div>
      <ToastContainer toasts={toasts}/>
      {confirmDel && <ConfirmDialog title="Delete Class" message={`Delete "${confirmDel.grade} – ${confirmDel.division}"? All allocations will be removed.`} onConfirm={handleDelete} onCancel={()=>setConfirmDel(null)}/>}

      <div className="page-header">
        <div>
          <div className="page-title"><School size={22} style={{color:'var(--accent)'}}/> Classes & Divisions</div>
          <div className="page-subtitle">{data.length} classes registered</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <select className="form-select" style={{width:180}} value={filterSec} onChange={e=>setFilterSec(e.target.value)}>
            <option value="">All Sections</option>
            {sections.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={15}/> Add Class</button>
        </div>
      </div>

      {loading ? <Loading/> : Object.keys(bySec).length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🏫</div>
            <div className="empty-state-title">No classes yet</div>
            <div style={{marginTop:12}}><button className="btn btn-primary" onClick={openAdd}><Plus size={14}/> Add Class</button></div>
          </div>
        </div>
      ) : Object.entries(bySec).map(([secName, grades]) => (
        <div key={secName} style={{marginBottom:20}}>
          <div style={{fontSize:13,fontWeight:700,color:'var(--text-dim)',marginBottom:10,display:'flex',alignItems:'center',gap:8}}>
            <span className="badge badge-accent">{secName}</span>
            <span style={{fontWeight:400,color:'var(--text-muted)',fontSize:12}}>{Object.values(grades).flat().length} classes</span>
          </div>
          {Object.entries(grades).map(([grade, classes]) => (
            <div key={grade} className="card" style={{marginBottom:12,padding:0}}>
              <div style={{padding:'10px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <span style={{fontWeight:600,fontSize:14}}>{grade}</span>
                <span style={{fontSize:12,color:'var(--text-muted)'}}>{classes.length} divisions</span>
              </div>
              <div style={{display:'flex',flexWrap:'wrap',gap:10,padding:14}}>
                {classes.map(c=>(
                  <div key={c.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 14px',background:'var(--bg)',border:'1px solid var(--border-bright)',borderRadius:8,minWidth:120}}>
                    <div>
                      <div style={{fontWeight:600,fontSize:13}}>{c.grade} – {c.division}</div>
                      <div style={{fontSize:11,color:'var(--text-muted)'}}>{c.strength} students · {c.alloc_count} subjects</div>
                    </div>
                    <div style={{display:'flex',gap:3,marginLeft:'auto'}}>
                      <button className="btn btn-secondary btn-sm btn-icon" onClick={()=>openEdit(c)}><Pencil size={11}/></button>
                      <button className="btn btn-danger btn-sm btn-icon" onClick={()=>setConfirmDel(c)}><Trash2 size={11}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}

      {modal === 'form' && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editId ? 'Edit Class' : 'Add Class'}</h2>
              <button className="btn btn-secondary btn-sm btn-icon" onClick={()=>setModal(null)}><X size={14}/></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Section *</label>
                <select className="form-select" value={form.section_id} onChange={e=>setForm(f=>({...f,section_id:e.target.value}))}>
                  <option value="">Select section...</option>
                  {sections.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="two-col">
                <div className="form-group">
                  <label className="form-label">Grade *</label>
                  <input className="form-input" value={form.grade} onChange={e=>setForm(f=>({...f,grade:e.target.value}))} placeholder="e.g. Grade 6"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Division *</label>
                  <input className="form-input" value={form.division} onChange={e=>setForm(f=>({...f,division:e.target.value.toUpperCase()}))} placeholder="e.g. A" maxLength={3}/>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Class Strength</label>
                <input className="form-input" type="number" min={1} value={form.strength} onChange={e=>setForm(f=>({...f,strength:parseInt(e.target.value)||35}))}/>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving...':'Save Class'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
