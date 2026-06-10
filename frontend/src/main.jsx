import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Sidebar } from './components/index.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Teachers from './pages/Teachers.jsx'
import Subjects from './pages/Subjects.jsx'
import Classes from './pages/Classes.jsx'
import Allocations from './pages/Allocations.jsx'
import TimeSlots from './pages/TimeSlots.jsx'
import Generate from './pages/Generate.jsx'
import ClassView from './pages/ClassView.jsx'
import TeacherView from './pages/TeacherView.jsx'
import './index.css'

function App() {
  return (
    <BrowserRouter>
      <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>
        <Sidebar />
        <main style={{ flex:1, overflow:'auto', padding:'28px 32px', background:'var(--bg)' }}>
          <Routes>
            <Route path="/"              element={<Dashboard />}   />
            <Route path="/teachers"      element={<Teachers />}    />
            <Route path="/subjects"      element={<Subjects />}    />
            <Route path="/classes"       element={<Classes />}     />
            <Route path="/allocations"   element={<Allocations />} />
            <Route path="/timeslots"     element={<TimeSlots />}   />
            <Route path="/generate"      element={<Generate />}    />
            <Route path="/view/classes"  element={<ClassView />}   />
            <Route path="/view/teachers" element={<TeacherView />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
)
