import React, { useEffect, useState } from 'react'
import { subjectsApi } from '../utils/api.js'
import { useToast, ToastContainer, ConfirmDialog, Loading } from '../components/index.jsx'
import { BookOpen, Plus, Pencil, Trash2, X } from 'lucide-react'

const COLORS = ['#E74C3C','#3498DB','#2ECC71','#F39C12','#9B59B6','#1ABC9C','#E67E22','#E91E63','#607D8B','#00BCD4','#FF5722','#8B5CF6','#10B981','#F59E0B','#6366F1']
const PRIORITIES = [ {v:1,label:'Core (Maths, Science, English, CS)'}, {v:2,label:'Language / Social'}, {v:3,label:'Other (PE, Art, Music)'} ]
const emptyForm = { name:'', short_name:'', color:'#6366F1', priority:1 }

export default function Subjects() {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)
  const [form, setForm]       = useState(emptyForm)
  const [editId, setEditId]   = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [saving, setSaving]   = useState(false)
  const { toasts, toast } = useToast()

  const load = async () => {
    setLoading(true)
    try { setData(await subjectsApi.list()) } catch(e) { toast.error(e.message) }
    setLoading(false)
  }
  useEffect(()=>{ load() },[])

  const openAdd  = () => { setForm(emptyForm); setEditId(null); setModal('form') }
  const openEdit = s => { setForm({name:s.name,short_name:s.short_name,color:s.color,priority:s.priority}); setEditId(s.id); setModal('form') }

  const handleSave = async () => {
    if (!form.name.trim() || !form.short_name.trim()) return toast.error('Name and short code required')
    setSaving(true)
    try {
      if (editId) { await subjectsApi.update(editId, form); toast.success('Subject updated') }
      else { await subjectsApi.create(form); toast.success('Subject added') }
      setModal(null); load()
    } catch(e) { toast.error(e.response?.data?.detail || e.message) }
    setSaving(false)
  }

  const handleDelete = async () => {
    try { await subjectsApi.delete(confirmDel.id); toast.success('Deleted'); setConfirmDel(null); load() }
    catch(e) { toast.error(e.message) }
  }

  const grouped = {1:[],2:[],3:[]}
  data.forEach(s => { if(grouped[s.priority]) grouped[s.priority].push(s) })

  const priorityLabels = { 1:'Priority 1 — Core Subjects', 2:'Priority 2 — Language & Social', 3:'Priority 3 — Other' }
  const priorityColors = { 1:'var(--red)', 2:'var(--yellow)', 3:'var(--green)' }

  return (
    <div>
      <ToastContainer toasts={toasts}/>
      {confirmDel && <ConfirmDialog title="Delete Subject" message={`Delete "${confirmDel.name}"?`} onConfirm={handleDelete} onCancel={()=>setConfirmDel(null)}/>}

      <div className="page-header">
        <div>
          <div className="page-title"><BookOpen size={22} style={{color:'var(--accent)'}}/> Subjects</div>
          <div className="page-subtitle">{data.length} subjects · Generation priority determines scheduling order</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={15}/> Add Subject</button>
      </div>

      {loading ? <Loading/> : (
        <>
          {[1,2,3].map(priority => (
            grouped[priority].length > 0 && (
              <div key={priority} style={{marginBottom:20}}>
                <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',color:priorityColors[priority],marginBottom:10,paddingBottom:6,borderBottom:'1px solid var(--border)'}}>
                  {priorityLabels[priority]}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:10}}>
                  {grouped[priority].map(s=>(
                    <div key={s.id} className="card" style={{padding:14,borderLeft:`3px solid ${s.color}`}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <div style={{width:12,height:12,borderRadius:'50%',background:s.color,flexShrink:0}}/>
                          <span style={{fontWeight:600,fontSize:13}}>{s.name}</span>
                        </div>
                        <div style={{display:'flex',gap:3}}>
                          <button className="btn btn-secondary btn-sm btn-icon" onClick={()=>openEdit(s)}><Pencil size={11}/></button>
                          <button className="btn btn-danger btn-sm btn-icon" onClick={()=>setConfirmDel(s)}><Trash2 size={11}/></button>
                        </div>
                      </div>
                      <span className="badge badge-accent" style={{fontFamily:'var(--mono)',fontSize:10}}>{s.short_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
          {data.length === 0 && (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">📚</div>
                <div className="empty-state-title">No subjects yet</div>
                <div style={{marginTop:12}}><button className="btn btn-primary" onClick={openAdd}><Plus size={14}/> Add Subject</button></div>
              </div>
            </div>
          )}
        </>
      )}

      {modal === 'form' && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editId ? 'Edit Subject' : 'Add Subject'}</h2>
              <button className="btn btn-secondary btn-sm btn-icon" onClick={()=>setModal(null)}><X size={14}/></button>
            </div>
            <div className="modal-body">
              <div className="two-col">
                <div className="form-group">
                  <label className="form-label">Subject Name *</label>
                  <input className="form-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Mathematics"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Short Code *</label>
                  <input className="form-input" value={form.short_name} onChange={e=>setForm(f=>({...f,short_name:e.target.value.toUpperCase()}))} placeholder="e.g. MATH" maxLength={6}/>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Generation Priority *</label>
                <select className="form-select" value={form.priority} onChange={e=>setForm(f=>({...f,priority:parseInt(e.target.value)}))}>
                  {PRIORITIES.map(p=><option key={p.v} value={p.v}>{p.label}</option>)}
                </select>
                <div className="form-hint">Priority 1 subjects are scheduled first and get the best time slots</div>
              </div>
              <div className="form-group">
                <label className="form-label">Color</label>
                <div style={{display:'flex',gap:7,flexWrap:'wrap',marginBottom:8}}>
                  {COLORS.map(c=>(
                    <div key={c} onClick={()=>setForm(f=>({...f,color:c}))} style={{width:26,height:26,borderRadius:'50%',background:c,cursor:'pointer',outline:form.color===c?'3px solid white':'none',outlineOffset:2,transition:'transform .1s',transform:form.color===c?'scale(1.2)':'scale(1)'}}/>
                  ))}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{width:30,height:30,borderRadius:6,background:form.color,border:'1px solid var(--border-bright)',flexShrink:0}}/>
                  <input className="form-input" value={form.color} onChange={e=>setForm(f=>({...f,color:e.target.value}))} style={{fontFamily:'var(--mono)',width:110}}/>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving...':'Save Subject'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
