import { useState, useMemo, useEffect } from 'react';
import {
  Calendar, ChevronRight, Edit3, X, Check, Save,
  ChevronLeft, Lock, Trash2, Search, RotateCcw
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { calcAttendanceStats } from '../../utils/attendanceCalc';
import { getTeacherScope } from '../../utils/teacherScope';
import CustomSelect from '../ui/CustomSelect';

function AttendanceEditModal({ record, students, onSave, onClose }) {
  const [attendance, setAttendance] = useState({ ...(record?.attendance || {}) });

  const recordClass = record?.class || (record?.id && record.id.includes('_') ? record.id.split('_')[1] : '');
  const recordSection = record?.section || (record?.id && record.id.includes('_') ? record.id.split('_')[2] : '');
  const recordDateStr = record?.date || (record?.id && record.id.includes('_') ? record.id.split('_')[0] : '');

  const classStudents = useMemo(() => {
    const matched = (students || []).filter(s =>
      String(s.class || '').trim() === String(recordClass || '').trim() &&
      String(s.section || '').trim().toUpperCase() === String(recordSection || '').trim().toUpperCase()
    ).sort((a, b) => String(a.rollNumber || '').localeCompare(String(b.rollNumber || ''), undefined, { numeric: true }));

    if (matched.length > 0) return matched;

    // Fallback: If students are not yet loaded or have slight class name variance,
    // construct display list directly from the saved attendance map keys
    const attKeys = Object.keys(record?.attendance || {});
    return attKeys.map((id, idx) => {
      const found = (students || []).find(s => s.id === id || s._docId === id || s.entityId === id || String(s.rollNumber || '') === String(id));
      return found || {
        id,
        rollNumber: String(idx + 1).padStart(2, '0'),
        name: `Student (${id})`,
      };
    });
  }, [students, recordClass, recordSection, record?.attendance]);

  const stats = calcAttendanceStats(classStudents, { attendance });

  const setStatus = (id, status) => setAttendance(prev => ({ ...prev, [id]: status }));
  const markAll = (status) => {
    const u = {};
    classStudents.forEach(s => {
      const sId = s.id || s._docId;
      if (sId) u[sId] = status;
    });
    setAttendance(u);
  };

  const formattedDate = useMemo(() => {
    try {
      if (!recordDateStr) return '';
      const d = recordDateStr.includes('T') ? new Date(recordDateStr) : new Date(recordDateStr + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
      }
      return recordDateStr;
    } catch {
      return recordDateStr;
    }
  }, [recordDateStr]);

  // Close on Escape key press and lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-[#0E1422] rounded-2xl shadow-2xl border border-slate-100 dark:border-white/15 overflow-hidden backdrop-blur-2xl animate-slide-up">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-white/10 flex-shrink-0">
          <div className="min-w-0 pr-2">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">Edit Attendance</h2>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
              Class {recordClass}-{recordSection} · {formattedDate}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 flex-shrink-0 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-2.5 sm:py-3 border-b border-slate-100 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 bg-slate-50/50 dark:bg-white/[0.02] flex-shrink-0">
          <div className="flex gap-2">
            <button onClick={() => markAll('present')} className="btn-success text-xs py-1.5 px-3 cursor-pointer">All Present</button>
            <button onClick={() => markAll('absent')} className="btn-danger text-xs py-1.5 px-3 cursor-pointer">All Absent</button>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{stats.present}P</span>
            <span className="text-rose-600 dark:text-rose-400 font-semibold">{stats.absent}A</span>
            <span className="font-bold text-slate-900 dark:text-white">{stats.percentage}%</span>
          </div>
        </div>

        <div className="overflow-y-auto max-h-96 divide-y divide-slate-100 dark:divide-white/5">
          {classStudents.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No students found for this class & section.
            </div>
          ) : (
            classStudents.map(s => {
              const sId = s.id || s._docId;
              const st = attendance[sId] || (s.id ? attendance[s.id] : undefined) || (s._docId ? attendance[s._docId] : undefined) || (s.entityId ? attendance[s.entityId] : undefined) || (s.rollNumber ? attendance[String(s.rollNumber)] : undefined) || 'present';
              return (
                <div key={sId} className="flex items-center justify-between px-6 py-2.5 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors">
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-mono w-6 flex-shrink-0">{s.rollNumber}</span>
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{s.name}</p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {['present', 'absent'].map(status => (
                      <button
                        key={status}
                        onClick={() => setStatus(sId, status)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                          st === status
                            ? status === 'present' ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                            : 'bg-rose-500/15 border-rose-500/50 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                            : 'border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/25 hover:bg-white/5'
                        }`}
                      >
                        {status === 'present' ? (
                          <Check size={13} strokeWidth={2.5} />
                        ) : (
                          <X size={13} strokeWidth={2.5} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-white/10 flex justify-end gap-3 bg-slate-50/50 dark:bg-white/[0.02]">
          <button onClick={onClose} className="btn-secondary cursor-pointer">Cancel</button>
          <button onClick={() => onSave(attendance)} className="btn-primary cursor-pointer">
            <Save size={14} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AttendanceHistory() {
  const {
    students,
    attendanceRecords,
    saveAttendanceRecord,
    deleteAttendanceRecord,
    addToast,
    refreshStudents,
    refreshAttendance,
  } = useApp();
  const { role, user } = useAuth();

  const teacherScope = useMemo(() => getTeacherScope(user, role), [user, role]);

  const [classFilter, setClassFilter] = useState(() => {
    if (role === 'teacher' && teacherScope.allowedClasses.length > 0) {
      return teacherScope.defaultClass;
    }
    return 'all';
  });
  const [sectionFilter, setSectionFilter] = useState(() => {
    if (role === 'teacher' && teacherScope.allowedSections.length > 0) {
      return teacherScope.defaultSection;
    }
    return 'all';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [editRecord, setEditRecord] = useState(null);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  // Auto-sync teacher filter boundaries
  useEffect(() => {
    if (role === 'teacher' && teacherScope.isRestricted) {
      if (teacherScope.allowedClasses.length > 0 && classFilter !== 'all' && !teacherScope.isClassAllowed(classFilter)) {
        setClassFilter(teacherScope.defaultClass);
      }
      if (teacherScope.allowedSections.length > 0 && sectionFilter !== 'all' && !teacherScope.isSectionAllowed(sectionFilter)) {
        setSectionFilter(teacherScope.defaultSection);
      }
    }
  }, [role, teacherScope, classFilter, sectionFilter]);

  // Auto-fetch students if empty on mount
  useEffect(() => {
    if ((!students || students.length === 0) && refreshStudents) {
      refreshStudents();
    }
  }, [students, refreshStudents]);

  // Auto-fetch attendance records if empty on mount
  useEffect(() => {
    if ((!attendanceRecords || Object.keys(attendanceRecords).length === 0) && refreshAttendance) {
      refreshAttendance();
    }
  }, [attendanceRecords, refreshAttendance]);

  // Calculate available classes dynamically from both students and existing attendance records
  const availableClasses = useMemo(() => {
    if (role === 'teacher' && teacherScope.allowedClasses.length > 0) {
      return teacherScope.allowedClasses;
    }
    const fromStudents = (students || []).map(s => String(s.class || '').trim());
    const fromRecords = Object.values(attendanceRecords || {}).map(r => String(r?.class || '').trim());
    const set = new Set([...fromStudents, ...fromRecords, '8', '9', '10'].filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [students, attendanceRecords, role, teacherScope]);

  // Calculate available sections dynamically
  const availableSections = useMemo(() => {
    if (role === 'teacher' && teacherScope.allowedSections.length > 0) {
      return teacherScope.allowedSections;
    }
    const fromStudents = (students || []).map(s => String(s.section || '').trim().toUpperCase());
    const fromRecords = Object.values(attendanceRecords || {}).map(r => String(r?.section || '').trim().toUpperCase());
    const set = new Set([...fromStudents, ...fromRecords, 'A', 'B'].filter(Boolean));
    return Array.from(set).sort();
  }, [students, attendanceRecords, role, teacherScope]);

  const canEditRecord = (record) => {
    if (role === 'admin') return false; // Admin cannot take or edit attendance; restricted to assigned teachers only
    if (role === 'teacher') {
      if (!teacherScope.isRestricted) return true;
      const rClass = String(record?.class || '').trim();
      const rSec = String(record?.section || '').trim().toUpperCase();
      return teacherScope.isClassAllowed(rClass) && teacherScope.isSectionAllowed(rSec);
    }
    return false;
  };

  const sortedRecords = useMemo(() => {
    const entries = Object.entries(attendanceRecords || {});
    return entries
      .filter(([key, r]) => {
        if (!r && !key) return false;
        const rec = r || {};
        const recClass = String(rec.class || (key.includes('_') ? key.split('_')[1] : '')).trim();
        const recSection = String(rec.section || (key.includes('_') ? key.split('_')[2] : '')).trim().toUpperCase();
        const recDate = String(rec.date || (key.includes('_') ? key.split('_')[0] : '')).trim();

        if (role === 'teacher' && teacherScope.isRestricted) {
          if (!teacherScope.isClassAllowed(recClass) || !teacherScope.isSectionAllowed(recSection)) {
            return false;
          }
        }

        if (classFilter !== 'all') {
          const cleanFCls = String(classFilter).trim().replace(/^(class|cls)\.?\s*/i, '').replace(/(st|nd|rd|th)$/i, '');
          const cleanRCls = recClass.replace(/^(class|cls)\.?\s*/i, '').replace(/(st|nd|rd|th)$/i, '');
          if (cleanRCls !== cleanFCls) return false;
        }
        if (sectionFilter !== 'all' && recSection !== String(sectionFilter).trim().toUpperCase()) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchDate = recDate.toLowerCase().includes(q);
          const matchClass = `class ${recClass}`.toLowerCase().includes(q) || recClass.toLowerCase().includes(q);
          const matchSection = `section ${recSection}`.toLowerCase().includes(q) || recSection.toLowerCase().includes(q);
          if (!matchDate && !matchClass && !matchSection) return false;
        }

        return true;
      })
      .sort(([keyA, a], [keyB, b]) => {
        const dateAStr = a?.date || (keyA.includes('_') ? keyA.split('_')[0] : '');
        const dateBStr = b?.date || (keyB.includes('_') ? keyB.split('_')[0] : '');
        const timeA = new Date(dateAStr).getTime() || 0;
        const timeB = new Date(dateBStr).getTime() || 0;
        return timeB - timeA;
      });
  }, [attendanceRecords, classFilter, sectionFilter, searchQuery]);

  const paginated = sortedRecords.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(sortedRecords.length / PER_PAGE);

  const handleSaveEdit = async (attendance) => {
    try {
      const recDate = editRecord.date || (editRecord.id && editRecord.id.includes('_') ? editRecord.id.split('_')[0] : '');
      const recClass = editRecord.class || (editRecord.id && editRecord.id.includes('_') ? editRecord.id.split('_')[1] : '');
      const recSection = editRecord.section || (editRecord.id && editRecord.id.includes('_') ? editRecord.id.split('_')[2] : '');
      const key = editRecord.id || `${recDate}_${recClass}_${recSection}`;
      
      await saveAttendanceRecord(key, {
        ...editRecord,
        id: key,
        date: recDate,
        class: recClass,
        section: recSection,
        attendance,
        savedAt: new Date().toISOString(),
      });
      addToast('Attendance updated successfully. ✓', 'success');
      setEditRecord(null);
    } catch (err) {
      console.error('Failed to update attendance record:', err);
      addToast('Failed to update attendance. Please try again.', 'error');
    }
  };

  const handleDeleteRecord = async (key) => {
    if (!key) return;
    try {
      if (deleteAttendanceRecord) {
        await deleteAttendanceRecord(key);
        addToast('Attendance record deleted successfully.', 'success');
      }
      setRecordToDelete(null);
    } catch (err) {
      console.error('Failed to delete attendance record:', err);
      addToast('Failed to delete attendance record.', 'error');
    }
  };

  const clearFilters = () => {
    setClassFilter('all');
    setSectionFilter('all');
    setSearchQuery('');
    setPage(1);
  };

  return (
    <div className="w-full space-y-5 animate-fade-in pb-10">
      {/* ── TOP HEADER & CONTROLS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-20">
        <div>
          <h1 className="text-xl font-bold text-navy-900 dark:text-white">Attendance History</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {sortedRecords.length} record{sortedRecords.length === 1 ? '' : 's'} found
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 relative z-20">
          {/* Search */}
          <div className="relative flex-1 sm:flex-initial min-w-[140px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search history..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
              className="input-field pl-8 py-1.5 text-xs w-full sm:w-44"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Class Filter */}
          <CustomSelect
            value={classFilter}
            onChange={e => { setClassFilter(e.target.value); setPage(1); }}
            className="input-field w-auto text-xs py-1.5"
          >
            <option value="all">Classes</option>
            {availableClasses.map(c => (
              <option key={c} value={c}>Class {c}</option>
            ))}
          </CustomSelect>

          {/* Section Filter */}
          <CustomSelect
            value={sectionFilter}
            onChange={e => { setSectionFilter(e.target.value); setPage(1); }}
            className="input-field w-auto text-xs py-1.5"
          >
            <option value="all">Section</option>
            {availableSections.map(s => (
              <option key={s} value={s}>Section {s}</option>
            ))}
          </CustomSelect>

          {(classFilter !== 'all' || sectionFilter !== 'all' || searchQuery) && (
            <button
              onClick={clearFilters}
              title="Reset Filters"
              className="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── RECORDS LIST ── */}
      {sortedRecords.length === 0 ? (
        <div className="card text-center py-16">
          <Calendar size={40} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-600 dark:text-slate-300 font-semibold text-sm">No attendance records found.</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
            {classFilter !== 'all' || sectionFilter !== 'all' || searchQuery
              ? 'Try changing or resetting your search and filter criteria.'
              : 'Take attendance to generate history logs and reports.'}
          </p>
          {(classFilter !== 'all' || sectionFilter !== 'all' || searchQuery) && (
            <button
              onClick={clearFilters}
              className="btn-secondary text-xs mt-4 mx-auto cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paginated.map(([key, record]) => {
              const recClass = record?.class || (key.includes('_') ? key.split('_')[1] : '');
              const recSection = record?.section || (key.includes('_') ? key.split('_')[2] : '');
              const recDateStr = record?.date || (key.includes('_') ? key.split('_')[0] : '');

              const classStudents = (students || []).filter(s =>
                String(s.class || '').trim() === String(recClass || '').trim() &&
                String(s.section || '').trim().toUpperCase() === String(recSection || '').trim().toUpperCase()
              );
              const stats = calcAttendanceStats(classStudents, record);

              let dateObj;
              try {
                dateObj = recDateStr.includes('T') ? new Date(recDateStr) : new Date(recDateStr + 'T00:00:00');
                if (isNaN(dateObj.getTime())) dateObj = new Date();
              } catch {
                dateObj = new Date();
              }

              const isToday = recDateStr === new Date().toISOString().split('T')[0];

              return (
                <div
                  key={key}
                  className="rounded-2xl bg-white dark:bg-[#0B0F19]/80 border border-slate-200/80 dark:border-white/10 p-3.5 sm:p-5 backdrop-blur-xl shadow-sm dark:shadow-[0_4px_25px_rgba(0,0,0,0.3)] hover:shadow-md dark:hover:border-white/20 transition-all duration-300 group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 flex flex-col items-center justify-center flex-shrink-0">
                        <p className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400 leading-none">
                          {dateObj.getDate()}
                        </p>
                        <p className="text-[9px] text-blue-600/70 dark:text-blue-400/80 font-semibold uppercase mt-0.5">
                          {dateObj.toLocaleDateString('en-IN', { month: 'short' })}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">
                            Class {recClass}-{recSection}
                          </p>
                          {isToday && (
                            <span className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold px-2 py-0.5 rounded-full">
                              Today
                            </span>
                          )}
                          {record?.markedBy && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                              by {record.markedBy}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {dateObj.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-white/[0.04]">
                      <div className="flex gap-2.5 text-xs">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                          <span className="text-slate-600 dark:text-slate-400 font-medium">{stats.present}P</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]" />
                          <span className="text-slate-600 dark:text-slate-400 font-medium">{stats.absent}A</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs sm:text-sm font-bold border ${
                          stats.percentage >= 90 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.15)]' :
                          stats.percentage >= 75 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25 shadow-[0_0_12px_rgba(245,158,11,0.15)]' :
                          'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25 shadow-[0_0_12px_rgba(244,63,94,0.15)]'
                        }`}>
                          {stats.percentage}%
                        </div>

                        {canEditRecord({ ...record, class: recClass, section: recSection }) ? (
                          <button
                            onClick={() => setEditRecord({ ...record, id: key, class: recClass, section: recSection, date: recDateStr })}
                            className="flex items-center gap-1.5 min-h-[34px] px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-blue-500 hover:text-blue-500 dark:hover:border-blue-400 dark:hover:text-blue-400 dark:hover:bg-blue-500/10 transition-all cursor-pointer active:scale-95"
                          >
                            <Edit3 size={13} /> Edit
                          </button>
                        ) : (
                          <span
                            className="flex items-center gap-1.5 min-h-[34px] px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-400 dark:text-slate-500 border border-slate-200/60 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] cursor-not-allowed"
                            title={role === 'admin' ? "Only assigned class teachers can record or edit attendance." : `Only Class ${recClass}-${recSection} teacher can edit this record.`}
                          >
                            <Lock size={12} /> Read-only
                          </span>
                        )}

                        {role === 'admin' && (
                          <button
                            onClick={() => setRecordToDelete({ key, class: recClass, section: recSection, date: recDateStr })}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
                            title="Delete this attendance record"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          stats.percentage >= 90 ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                          stats.percentage >= 75 ? 'bg-gradient-to-r from-amber-500 to-yellow-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
                          'bg-gradient-to-r from-rose-500 to-pink-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                        }`}
                        style={{ width: `${stats.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary py-2 px-3 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium px-2">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary py-2 px-3 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </>
      )}

      {/* ── EDIT ATTENDANCE MODAL ── */}
      {editRecord && (
        <AttendanceEditModal
          record={editRecord}
          students={students}
          onSave={handleSaveEdit}
          onClose={() => setEditRecord(null)}
        />
      )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={() => setRecordToDelete(null)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-[#0E1422] rounded-2xl shadow-2xl border border-slate-100 dark:border-white/15 p-5 animate-slide-up text-center">
            <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={20} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Delete Attendance Record?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Are you sure you want to delete the attendance record for Class {recordToDelete.class}-{recordToDelete.section} on {recordToDelete.date}? This action cannot be undone.
            </p>
            <div className="flex gap-2.5 justify-center mt-5">
              <button
                onClick={() => setRecordToDelete(null)}
                className="btn-secondary text-xs py-2 px-4 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteRecord(recordToDelete.key)}
                className="btn-danger text-xs py-2 px-4 cursor-pointer"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
