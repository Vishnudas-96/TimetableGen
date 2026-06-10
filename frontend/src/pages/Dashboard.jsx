import React, { useEffect, useState } from 'react'
import { statsApi } from '../utils/api.js'
import { Loading } from '../components/index.jsx'
import { LayoutDashboard, RefreshCw, TrendingUp, Users, BookOpen, School, ListTodo, Calendar } from 'lucide-react'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try { setData(await statsApi.get()) } catch(e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  if (loading) return <Loading text="Loading dashboard..." />

  const { stats: s, workload, grade_coverage } = data || {}

  const statCards = [
    { label:'Teachers',         value: s?.teachers ?? 0,          color:'var(--accent)',  icon:<Users size={16}/> },
    { label:'Link Teachers',    value: s?.link_teachers ?? 0,     color:'var(--cyan)',    icon:<Users size={16}/> },
    { label:'Subjects',         value: s?.subjects ?? 0,          color:'var(--purple)',  icon:<BookOpen size={16}/> },
    { label:'Classes',          value: s?.classes ?? 0,           color:'var(--green)',   icon:<School size={16}/> },
    { label:'Allocations',      value: s?.allocations ?? 0,       color:'var(--yellow)',  icon:<ListTodo size={16}/> },
    { label:'Scheduled Periods',value: s?.scheduled_periods ?? 0, color:'var(--accent-light)', icon:<Calendar size={16}/> },
  ]

  const coveragePct = s?.coverage_pct ?? 0
  const coverageColor = coveragePct >= 100 ? 'var(--green)' : coveragePct >= 80 ? 'var(--yellow)' : 'var(--red)'

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title"><LayoutDashboard size={22} style={{color:'var(--accent)'}}/> Dashboard</div>
          <div className="page-subtitle">School Timetable Generator — Middle Section Overview</div>
        </div>
        <button className="btn btn-secondary" onClick={load}><RefreshCw size={14}/> Refresh</button>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid" style={{marginBottom:20}}>
        {statCards.map(({label,value,color,icon}) => (
          <div key={label} className="stat-card">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
              <div style={{color,opacity:.7}}>{icon}</div>
            </div>
            <div className="stat-value" style={{color}}>{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Coverage Bar */}
      <div className="card" style={{marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <div style={{fontWeight:600,fontSize:14,display:'flex',alignItems:'center',gap:8}}>
            <TrendingUp size={16} style={{color:'var(--accent)'}}/> Timetable Coverage
          </div>
          <span style={{fontFamily:'var(--mono)',fontSize:18,fontWeight:700,color:coverageColor}}>
            {coveragePct}%
          </span>
        </div>
        <div className="workload-bar" style={{height:10,borderRadius:5}}>
          <div className="workload-fill" style={{width:`${Math.min(100,coveragePct)}%`,background:coverageColor,borderRadius:5}}/>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:6,fontSize:11,color:'var(--text-muted)'}}>
          <span>{s?.scheduled_periods ?? 0} periods scheduled</span>
          <span>{s?.required_periods ?? 0} periods required</span>
        </div>
        {s?.last_generated && (
          <div style={{marginTop:10,fontSize:12,color:'var(--text-muted)'}}>
            Last generated: {new Date(s.last_generated).toLocaleString()}
          </div>
        )}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        {/* Grade Coverage */}
        <div className="card">
          <div style={{fontWeight:600,fontSize:14,marginBottom:14}}>Grade-wise Coverage</div>
          {grade_coverage?.length === 0 ? (
            <div style={{color:'var(--text-muted)',fontSize:13}}>No data yet. Add classes and generate.</div>
          ) : grade_coverage?.map(g => {
            const pct = g.required > 0 ? Math.round(g.scheduled / g.required * 100) : 0
            const col = pct >= 100 ? 'var(--green)' : pct >= 70 ? 'var(--yellow)' : 'var(--red)'
            return (
              <div key={g.grade} style={{marginBottom:14}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:13}}>
                  <span style={{fontWeight:500}}>{g.grade}</span>
                  <span style={{fontFamily:'var(--mono)',fontSize:11,color:col}}>{g.scheduled}/{g.required} periods</span>
                </div>
                <div className="workload-bar">
                  <div className="workload-fill" style={{width:`${Math.min(100,pct)}%`,background:col}}/>
                </div>
                <div style={{fontSize:10,color:'var(--text-muted)',marginTop:2}}>{g.class_count} classes</div>
              </div>
            )
          })}
        </div>

        {/* Teacher Workload */}
        <div className="card" style={{maxHeight:420,overflow:'auto'}}>
          <div style={{fontWeight:600,fontSize:14,marginBottom:14}}>Teacher Workload</div>
          {workload?.length === 0 ? (
            <div style={{color:'var(--text-muted)',fontSize:13}}>No teachers yet.</div>
          ) : workload?.map(t => {
            const pct = t.max_periods_per_week > 0 ? Math.min(100,Math.round(t.allocated_periods/t.max_periods_per_week*100)) : 0
            const col = pct > 95 ? 'var(--red)' : pct > 75 ? 'var(--yellow)' : 'var(--green)'
            return (
              <div key={t.id} style={{marginBottom:12}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:3}}>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <span style={{fontWeight:500}}>{t.name}</span>
                    {t.is_link_teacher===1 && <span className="badge badge-cyan" style={{fontSize:9}}>Link</span>}
                  </div>
                  <span style={{fontFamily:'var(--mono)',color:col,fontSize:11}}>{t.allocated_periods}/{t.max_periods_per_week}</span>
                </div>
                <div className="workload-bar">
                  <div className="workload-fill" style={{width:`${pct}%`,background:col}}/>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
