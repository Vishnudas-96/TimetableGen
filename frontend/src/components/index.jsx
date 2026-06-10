import React, { useState, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, BookOpen, School, ListTodo,
  Wand2, Eye, GraduationCap, Calendar, Clock, AlertTriangle,
  CheckCircle, Info, X
} from 'lucide-react';

// ── Toast ──────────────────────────────────────────────────────
let _toastId = 0;
export function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((message, type = 'info', duration = 3500) => {
    const id = ++_toastId;
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), duration);
  }, []);
  return {
    toasts,
    toast: { success: m => add(m,'success'), error: m => add(m,'error',5000), info: m => add(m,'info'), warning: m => add(m,'warning') }
  };
}

export function ToastContainer({ toasts }) {
  const icons = { success:<CheckCircle size={15} style={{color:'var(--green)',flexShrink:0}}/>, error:<AlertTriangle size={15} style={{color:'var(--red)',flexShrink:0}}/>, info:<Info size={15} style={{color:'var(--accent-light)',flexShrink:0}}/>, warning:<AlertTriangle size={15} style={{color:'var(--yellow)',flexShrink:0}}/> };
  if (!toasts.length) return null;
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {icons[t.type]}
          <span style={{flex:1,lineHeight:1.4}}>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ── Confirm Dialog ─────────────────────────────────────────────
export function ConfirmDialog({ title, message, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay">
      <div className="modal" style={{maxWidth:380}}>
        <div className="modal-body" style={{padding:'24px 22px'}}>
          <div style={{display:'flex',gap:14,alignItems:'flex-start'}}>
            <div style={{width:40,height:40,borderRadius:10,background:'rgba(239,68,68,.1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <AlertTriangle size={20} style={{color:'var(--red)'}}/>
            </div>
            <div>
              <div style={{fontWeight:700,fontSize:15,marginBottom:6}}>{title}</div>
              <div style={{fontSize:13,color:'var(--text-dim)',lineHeight:1.5}}>{message}</div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────────────
const nav = [
  { to:'/',              icon:LayoutDashboard, label:'Dashboard'    },
  { to:'/teachers',      icon:Users,           label:'Teachers'     },
  { to:'/subjects',      icon:BookOpen,        label:'Subjects'     },
  { to:'/classes',       icon:School,          label:'Classes'      },
  { to:'/allocations',   icon:ListTodo,        label:'Allocations'  },
  { to:'/timeslots',     icon:Clock,           label:'Time Slots'   },
  { to:'/generate',      icon:Wand2,           label:'Generate'     },
  { to:'/view/classes',  icon:Eye,             label:'Class View'   },
  { to:'/view/teachers', icon:GraduationCap,   label:'Teacher View' },
];

export function Sidebar() {
  return (
    <aside style={{width:220,flexShrink:0,background:'var(--bg-card)',borderRight:'1px solid var(--border)',display:'flex',flexDirection:'column',height:'100vh',position:'sticky',top:0,overflowY:'auto'}}>
      <div style={{padding:'18px 16px 14px',borderBottom:'1px solid var(--border)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:34,height:34,borderRadius:9,background:'linear-gradient(135deg,var(--accent),var(--cyan))',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <Calendar size={18} color="white"/>
          </div>
          <div>
            <div style={{fontWeight:700,fontSize:14,lineHeight:1.2}}>TimetableGen</div>
            <div style={{fontSize:10,color:'var(--text-muted)'}}>OR-Tools Powered</div>
          </div>
        </div>
      </div>
      <nav style={{flex:1,padding:'10px 8px'}}>
        {nav.map(({to,icon:Icon,label})=>(
          <NavLink key={to} to={to} end={to==='/'} style={({isActive})=>({
            display:'flex',alignItems:'center',gap:9,padding:'8px 10px',borderRadius:7,
            color:isActive?'var(--accent-light)':'var(--text-dim)',
            background:isActive?'var(--accent-glow)':'transparent',
            textDecoration:'none',fontSize:13,fontWeight:500,marginBottom:2,
            border:isActive?'1px solid rgba(99,102,241,.2)':'1px solid transparent',
            transition:'all .15s',
          })}>
            <Icon size={15}/>{label}
          </NavLink>
        ))}
      </nav>
      <div style={{padding:'10px 14px',borderTop:'1px solid var(--border)',fontSize:10,color:'var(--text-muted)'}}>
        SQLite · FastAPI · OR-Tools
      </div>
    </aside>
  );
}

// ── Timetable Grid ─────────────────────────────────────────────
const DAYS = {1:'Monday',2:'Tuesday',3:'Wednesday',4:'Thursday',5:'Friday'};
const DAYS_SHORT = {1:'Mon',2:'Tue',3:'Wed',4:'Thu',5:'Fri'};

export function TimetableGrid({ entries=[], timeSlots=[], mode='class' }) {
  const teachingSlots = timeSlots.filter(s=>!s.is_break);
  const periods = [...new Set(teachingSlots.map(s=>s.period_number))].sort((a,b)=>a-b);
  const getSlot = (day,p) => timeSlots.find(s=>s.day_of_week===day&&s.period_number===p);
  const getEntry = (day,p) => entries.find(e=>e.day_of_week===day&&e.period_number===p);

  if (!periods.length) return (
    <div className="empty-state"><div className="empty-state-icon">📅</div><div className="empty-state-title">No timetable generated yet</div></div>
  );

  return (
    <div className="tt-wrap">
      <div className="tt-grid" style={{gridTemplateColumns:`72px repeat(${periods.length},1fr)`}}>
        <div className="tt-header-cell">Day</div>
        {periods.map(p=>{
          const slot = getSlot(1,p);
          return (
            <div key={p} className="tt-header-cell">
              <div style={{fontWeight:700}}>P{p}</div>
              {slot&&!slot.is_break&&<div style={{fontSize:9,fontFamily:'var(--mono)',color:'var(--text-muted)',marginTop:1}}>{slot.start_time}</div>}
              {slot&&slot.is_break&&<div style={{fontSize:9,color:'var(--yellow)'}}>Break</div>}
            </div>
          );
        })}
        {[1,2,3,4,5].map(day=>(
          <React.Fragment key={day}>
            <div className="tt-day-cell">
              <span style={{fontWeight:700,fontSize:12}}>{DAYS_SHORT[day]}</span>
              <span style={{fontSize:9,color:'var(--text-muted)'}}>{DAYS[day]}</span>
            </div>
            {periods.map(p=>{
              const slot = getSlot(day,p);
              if(slot?.is_break) return (
                <div key={p} className="tt-break-cell">{slot.break_name||'Break'}</div>
              );
              const entry = getEntry(day,p);
              if(entry){
                const bg = entry.subject_color||'#4A90E2';
                return (
                  <div key={p} className="tt-cell">
                    <div className="tt-subject-block" style={{background:bg+'1a',borderLeft:`3px solid ${bg}`}}>
                      <div className="tt-subject-name" style={{color:bg}}>{entry.subject_short}</div>
                      {mode==='class'&&<div className="tt-teacher-name" style={{color:'var(--text-dim)'}}>{entry.teacher_short}</div>}
                      {mode==='teacher'&&<div className="tt-class-name" style={{color:'var(--text-dim)'}}>{entry.grade} {entry.division}</div>}
                      {entry.is_link_teacher===1&&<div className="tt-link-badge">↔ Link</div>}
                    </div>
                  </div>
                );
              }
              return <div key={p} className="tt-cell tt-empty-cell">—</div>;
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ── Loading ────────────────────────────────────────────────────
export function Loading({text='Loading...'}) {
  return <div className="loading-full"><div className="spinner"/><span style={{color:'var(--text-muted)'}}>{text}</span></div>;
}
