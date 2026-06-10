import React, { useState, useEffect } from 'react'
import { timetableApi, sectionsApi } from '../utils/api.js'
import { useToast, ToastContainer, Loading } from '../components/index.jsx'
import { Wand2, CheckCircle, AlertTriangle, XCircle, Clock, Zap, Info } from 'lucide-react'

export default function Generate() {
  const [sections, setSections]   = useState([])
  const [section, setSection]     = useState('Middle Section')
  const [timeLimit, setTimeLimit] = useState(120)
  const [generating, setGenerating] = useState(false)
  const [result, setResult]       = useState(null)
  const [logs, setLogs]           = useState([])
  const [elapsed, setElapsed]     = useState(0)
  const { toasts, toast } = useToast()

  useEffect(() => {
    sectionsApi.list().then(setSections).catch(()=>{})
    timetableApi.logs().then(setLogs).catch(()=>{})
  }, [])

  // Elapsed timer while generating
  useEffect(() => {
    if (!generating) { setElapsed(0); return }
    const t = setInterval(() => setElapsed(e => e+1), 1000)
    return () => clearInterval(t)
  }, [generating])

  const handleGenerate = async () => {
    setGenerating(true)
    setResult(null)
    try {
      const res = await timetableApi.generate({ section, time_limit: timeLimit })
      setResult(res)
      if (res.success) toast.success(res.message)
      else toast.warning(res.message)
      timetableApi.logs().then(setLogs).catch(()=>{})
    } catch(e) {
      toast.error(e.response?.data?.detail || e.message)
      setResult({ success:false, message: e.message, conflicts:[] })
    }
    setGenerating(false)
  }

  const statusColor = result
    ? result.success ? 'var(--green)' : result.placed > 0 ? 'var(--yellow)' : 'var(--red)'
    : 'var(--text-muted)'

  return (
    <div>
      <ToastContainer toasts={toasts}/>

      <div className="page-header">
        <div>
          <div className="page-title"><Wand2 size={22} style={{color:'var(--accent)'}}/> Generate Timetable</div>
          <div className="page-subtitle">OR-Tools CP-SAT solver · Constraint-based optimal scheduling</div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
        {/* Config */}
        <div className="card">
          <div style={{fontWeight:600,fontSize:14,marginBottom:16}}>Generation Settings</div>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div className="form-group">
              <label className="form-label">Section to Generate</label>
              <select className="form-select" value={section} onChange={e=>setSection(e.target.value)}>
                {sections.map(s=><option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Max Solve Time (seconds)</label>
              <input className="form-input" type="number" min={30} max={600} value={timeLimit} onChange={e=>setTimeLimit(parseInt(e.target.value)||120)}/>
              <div className="form-hint">OR-Tools returns best solution found within this time. 60–120s is recommended for 27 classes.</div>
            </div>
          </div>
        </div>

        {/* Rules */}
        <div className="card">
          <div style={{fontWeight:600,fontSize:14,marginBottom:14}}>Constraints Applied</div>
          {[
            ['Hard','No teacher clash (including link teachers)','var(--green)'],
            ['Hard','No class clash','var(--green)'],
            ['Hard','Link teachers restricted to free slots only','var(--green)'],
            ['Hard','Max periods per teacher per week enforced','var(--green)'],
            ['Soft','Core subjects scheduled first (morning preference)','var(--cyan)'],
            ['Soft','Same subject not twice on same day','var(--cyan)'],
            ['Soft','No teacher > 3 consecutive periods','var(--cyan)'],
          ].map(([type,rule,color],i)=>(
            <div key={i} style={{display:'flex',alignItems:'flex-start',gap:8,marginBottom:8,fontSize:12}}>
              <span style={{fontSize:9,fontWeight:700,padding:'2px 5px',borderRadius:3,background:color+'22',color,flexShrink:0,marginTop:2}}>{type}</span>
              <span style={{color:'var(--text-dim)'}}>{rule}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <div className="card" style={{textAlign:'center',padding:'32px 20px',marginBottom:20}}>
        {generating ? (
          <div>
            <div style={{fontSize:40,marginBottom:16}}>⚙️</div>
            <div style={{fontWeight:600,fontSize:16,marginBottom:8}}>OR-Tools is solving...</div>
            <div style={{color:'var(--text-muted)',fontSize:13,marginBottom:20}}>
              Finding optimal timetable for {section}
            </div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:12,marginBottom:16}}>
              <div className="spinner" style={{width:24,height:24}}/>
              <span style={{fontFamily:'var(--mono)',fontSize:20,color:'var(--accent)'}}>{elapsed}s</span>
              <span style={{color:'var(--text-muted)',fontSize:13}}>/ {timeLimit}s max</span>
            </div>
            <div style={{maxWidth:300,margin:'0 auto'}}>
              <div className="workload-bar" style={{height:6}}>
                <div className="workload-fill" style={{width:`${Math.min(100,elapsed/timeLimit*100)}%`,background:'var(--accent)',transition:'width 1s linear'}}/>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div style={{fontSize:48,marginBottom:12}}>🗓️</div>
            <div style={{fontWeight:700,fontSize:18,marginBottom:6}}>Ready to Generate</div>
            <div style={{color:'var(--text-muted)',fontSize:13,marginBottom:24,maxWidth:400,margin:'0 auto 24px'}}>
              Generates complete timetable for all classes in {section}.<br/>
              Existing timetable will be replaced.
            </div>
            <button className="btn btn-primary" onClick={handleGenerate} style={{padding:'14px 36px',fontSize:16,gap:10}}>
              <Wand2 size={18}/> Generate Timetable
            </button>
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div style={{marginBottom:20}}>
          <div className={`alert ${result.success?'alert-success':result.placed>0?'alert-warning':'alert-error'}`} style={{marginBottom:14}}>
            {result.success ? <CheckCircle size={16}/> : <AlertTriangle size={16}/>}
            <div style={{flex:1}}>
              <div style={{fontWeight:600,marginBottom:2}}>{result.success ? '✅ Success!' : result.placed > 0 ? '⚠️ Partial Result' : '❌ Failed'}</div>
              <div style={{fontSize:12,opacity:.9}}>{result.message}</div>
              {result.placed !== undefined && (
                <div style={{marginTop:6,display:'flex',gap:16,fontSize:12}}>
                  <span>Placed: <strong>{result.placed}</strong></span>
                  <span>Required: <strong>{result.required}</strong></span>
                  <span>Solve time: <strong>{result.solve_time}s</strong></span>
                  {result.status && <span>Status: <strong>{result.status}</strong></span>}
                </div>
              )}
            </div>
          </div>

          {result.conflicts?.length > 0 && (
            <div className="card" style={{padding:0}}>
              <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',fontWeight:600,fontSize:13,display:'flex',alignItems:'center',gap:8}}>
                <AlertTriangle size={15} style={{color:'var(--yellow)'}}/> Conflicts & Warnings ({result.conflicts.length})
              </div>
              <div style={{maxHeight:280,overflow:'auto'}}>
                {result.conflicts.map((c,i)=>(
                  <div key={i} style={{padding:'9px 16px',borderBottom:'1px solid var(--border)',display:'flex',gap:10,alignItems:'flex-start',fontSize:12}}>
                    <span className={`badge ${c.type==='OVERLOAD'?'badge-red':'badge-yellow'}`} style={{flexShrink:0,marginTop:1,fontSize:9}}>{c.type}</span>
                    <span style={{color:'var(--text-dim)'}}>{c.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.success && (
            <div className="alert alert-info" style={{marginTop:12}}>
              <Info size={15}/>
              <span>Timetable is ready. Go to <strong>Class View</strong> or <strong>Teacher View</strong> to see and export it.</span>
            </div>
          )}
        </div>
      )}

      {/* Generation History */}
      {logs.length > 0 && (
        <div className="card" style={{padding:0}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',fontWeight:600,fontSize:13,display:'flex',alignItems:'center',gap:8}}>
            <Clock size={14} style={{color:'var(--text-muted)'}}/> Generation History
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Status</th><th>Placed</th><th>Required</th><th>Coverage</th><th>Solve Time</th></tr></thead>
              <tbody>
                {logs.map(l=>{
                  const pct = l.total_required > 0 ? Math.round(l.total_placed/l.total_required*100) : 0
                  return (
                    <tr key={l.id}>
                      <td style={{fontFamily:'var(--mono)',fontSize:11}}>{new Date(l.created_at).toLocaleString()}</td>
                      <td><span className={`badge ${l.status==='SUCCESS'?'badge-green':'badge-yellow'}`}>{l.status}</span></td>
                      <td style={{fontFamily:'var(--mono)'}}>{l.total_placed}</td>
                      <td style={{fontFamily:'var(--mono)'}}>{l.total_required}</td>
                      <td>
                        <span style={{fontFamily:'var(--mono)',color:pct>=100?'var(--green)':pct>=80?'var(--yellow)':'var(--red)'}}>{pct}%</span>
                      </td>
                      <td style={{fontFamily:'var(--mono)',fontSize:11}}>{l.solve_time_sec ? `${l.solve_time_sec}s` : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
