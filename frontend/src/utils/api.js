import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const sectionsApi   = { list: () => api.get('/sections/').then(r=>r.data), create: d=>api.post('/sections/',d).then(r=>r.data), update:(id,d)=>api.put(`/sections/${id}`,d).then(r=>r.data), delete: id=>api.delete(`/sections/${id}`).then(r=>r.data) };
export const teachersApi   = { list: () => api.get('/teachers/').then(r=>r.data), get: id=>api.get(`/teachers/${id}`).then(r=>r.data), create: d=>api.post('/teachers/',d).then(r=>r.data), update:(id,d)=>api.put(`/teachers/${id}`,d).then(r=>r.data), delete: id=>api.delete(`/teachers/${id}`).then(r=>r.data) };
export const subjectsApi   = { list: () => api.get('/subjects/').then(r=>r.data), create: d=>api.post('/subjects/',d).then(r=>r.data), update:(id,d)=>api.put(`/subjects/${id}`,d).then(r=>r.data), delete: id=>api.delete(`/subjects/${id}`).then(r=>r.data) };
export const classesApi    = { list: (sid) => api.get('/classes/', {params: sid?{section_id:sid}:{}}).then(r=>r.data), create: d=>api.post('/classes/',d).then(r=>r.data), update:(id,d)=>api.put(`/classes/${id}`,d).then(r=>r.data), delete: id=>api.delete(`/classes/${id}`).then(r=>r.data) };
export const timeslotsApi  = { list: () => api.get('/timeslots/').then(r=>r.data), update:(id,d)=>api.put(`/timeslots/${id}`,d).then(r=>r.data) };
export const availApi      = { get: tid=>api.get(`/availability/${tid}`).then(r=>r.data), set:(tid,d)=>api.post(`/availability/${tid}`,d).then(r=>r.data), clear: tid=>api.delete(`/availability/${tid}`).then(r=>r.data) };
export const allocsApi     = { list:(params)=>api.get('/allocations/',{params}).then(r=>r.data), create:d=>api.post('/allocations/',d).then(r=>r.data), update:(id,d)=>api.put(`/allocations/${id}`,d).then(r=>r.data), delete:id=>api.delete(`/allocations/${id}`).then(r=>r.data), teacherLoad:(sid)=>api.get('/allocations/summary/teacher-load',{params:sid?{section_id:sid}:{}}).then(r=>r.data) };
export const timetableApi  = { generate:(d)=>api.post('/timetable/generate',d).then(r=>r.data), forClass:id=>api.get(`/timetable/class/${id}`).then(r=>r.data), forTeacher:id=>api.get(`/timetable/teacher/${id}`).then(r=>r.data), logs:()=>api.get('/timetable/logs').then(r=>r.data) };
export const statsApi      = { get: () => api.get('/stats/').then(r=>r.data) };

// Download helpers
export const downloadPDF   = (classId) => { window.open(`/api/timetable/export/class/${classId}/pdf`, '_blank'); };
export const downloadExcel = (classId) => { window.open(`/api/timetable/export/class/${classId}/excel`, '_blank'); };
export const downloadAllExcel = (sectionId) => { window.open(`/api/timetable/export/all/excel${sectionId?`?section_id=${sectionId}`:''}`, '_blank'); };

export default api;
