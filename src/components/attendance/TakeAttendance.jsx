import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Save, RefreshCw,
  Search, Printer, CheckCircle2, Check, X,
  Info, AlertCircle, Lock
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { calcAttendanceStats } from '../../utils/attendanceCalc';
import HolidayDatePicker from '../ui/HolidayDatePicker';
import { getIndianHoliday } from '../../utils/indianHolidays';
import { getTeacherScope } from '../../utils/teacherScope';
import LoadingScreen from '../ui/LoadingScreen';

function DateNav({ date, onChange }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = new Date(date + 'T00:00:00');
  selected.setHours(0, 0, 0, 0);
  const isToday = selected.getTime() === today.getTime();
  const isFuture = selected > today;

  const move = (days) => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + days);
    if (d > today) return;
    onChange(d.toISOString().split('T')[0]);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap">
      <button
        type="button"
        onClick={() => move(-1)}
        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111726] hover:bg-slate-50 dark:hover:bg-[#161F34] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors shadow-xs cursor-pointer active:scale-95"
        title="Previous Day"
      >
        <ChevronLeft size={13} />
      </button>

      <HolidayDatePicker
        value={date}
        onChange={onChange}
        maxDate={todayStr}
      />

      <button
        type="button"
        onClick={() => move(1)}
        disabled={isFuture || isToday}
        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111726] hover:bg-slate-50 dark:hover:bg-[#161F34] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-xs cursor-pointer active:scale-95"
        title="Next Day"
      >
        <ChevronRight size={13} />
      </button>

      {!isToday && (
        <button
          type="button"
          onClick={() => onChange(todayStr)}
          className="text-[11px] sm:text-xs text-blue-500 hover:text-blue-400 font-semibold px-1 sm:px-1.5 py-0.5 rounded hover:bg-blue-500/10 transition-colors cursor-pointer"
        >
          Today
        </button>
      )}
    </div>
  );
}

function StatusButton({ status, current, onClick }) {
  const isSelected = current === status;

  let btnClasses = 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#111726] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#161F34]';

  if (status === 'present') {
    if (isSelected) {
      btnClasses = 'bg-emerald-600 dark:bg-emerald-500/25 border-emerald-500 dark:border-emerald-400/50 text-white dark:text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]';
    } else {
      btnClasses = 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#111726] text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10';
    }
  } else if (status === 'absent') {
    if (isSelected) {
      btnClasses = 'bg-rose-600 dark:bg-rose-500/25 border-rose-500 dark:border-rose-400/50 text-white dark:text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.3)]';
    } else {
      btnClasses = 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#111726] text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10';
    }
  }

  const labels = { present: 'Present', absent: 'Absent' };
  const Icon = status === 'present' ? Check : X;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1 sm:gap-1.5 w-8 h-8 sm:w-auto sm:h-auto px-1 sm:px-3 py-1.5 rounded-lg sm:rounded-xl text-xs font-semibold border transition-all duration-150 cursor-pointer active:scale-95 ${btnClasses}`}
      title={labels[status]}
      aria-label={labels[status]}
    >
      <Icon size={14} strokeWidth={2.5} className="flex-shrink-0" />
      <span className="hidden sm:inline">{labels[status]}</span>
    </button>
  );
}

function ProgressRing({ percentage }) {
  const size = 100;
  const strokeWidth = 8;
  const center = 50;
  const r = 42;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percentage / 100) * circ;
  const color = percentage >= 85 ? '#10B981' : percentage >= 70 ? '#F59E0B' : '#F43F5E';

  return (
    <div className="relative inline-flex items-center justify-center flex-shrink-0 w-10 h-10 sm:w-24 sm:h-24">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none">
        <span className="text-[10px] sm:text-xl font-extrabold text-slate-900 dark:text-white leading-none tracking-tight">
          {percentage}%
        </span>
        <span className="hidden sm:inline text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wide">
          Attendance
        </span>
      </div>
    </div>
  );
}

export default function TakeAttendance() {
  const {
    students,
    attendanceRecords,
    saveAttendanceRecord,
    selectedClass,
    setSelectedClass,
    selectedSection,
    setSelectedSection,
    addToast,
    settings,
    refreshStudents,
  } = useApp();
  const { role, user } = useAuth();
  if (role === 'admin') {
    return <Navigate to="/history" replace />;
  }
  const isTeacher = role === 'teacher';
  const teacherScope = useMemo(() => getTeacherScope(user, role), [user, role]);

  const availableClasses = useMemo(() => {
    if (isTeacher && teacherScope.allowedClasses.length > 0) {
      return teacherScope.allowedClasses;
    }
    return Array.from(new Set([...students.map(s => String(s.class || '').trim()), '8', '9', '10'])).filter(Boolean).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [isTeacher, teacherScope, students]);

  const availableSections = useMemo(() => {
    if (isTeacher && teacherScope.allowedSections.length > 0) {
      return teacherScope.allowedSections;
    }
    return Array.from(new Set([...students.map(s => String(s.section || '').trim().toUpperCase()), 'A', 'B'])).filter(Boolean).sort();
  }, [isTeacher, teacherScope, students]);

  const displayName = role === 'admin' 
    ? (user?.name || 'Administrator') 
    : (user?.name || 'Teacher');

  const activeClass = selectedClass;
  const activeSection = selectedSection;

  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Auto-fetch students immediately if list is empty without requiring manual page refresh
  useEffect(() => {
    if (students.length === 0 && refreshStudents) {
      refreshStudents();
    }
  }, [students.length, refreshStudents]);

  const recordKey = `${date}_${activeClass}_${activeSection}`;
  const existingRecord = attendanceRecords[recordKey];

  const isMatch = useCallback((s, cls, sec) => {
    if (!s) return false;
    const cleanSCls = String(s.class || '').trim().replace(/^(class|cls)\.?\s*/i, '').replace(/(st|nd|rd|th)$/i, '');
    const cleanTargetCls = String(cls || '').trim().replace(/^(class|cls)\.?\s*/i, '').replace(/(st|nd|rd|th)$/i, '');
    const matchClass = cleanSCls === cleanTargetCls;
    const matchSec = String(s.section || '').trim().toUpperCase() === String(sec || '').trim().toUpperCase();
    return matchClass && matchSec;
  }, []);

  const [attendance, setAttendance] = useState(() => {
    const targetCls = (isTeacher && teacherScope.allowedClasses.length > 0 && !teacherScope.isClassAllowed(selectedClass))
      ? teacherScope.defaultClass
      : selectedClass;
    const targetSec = (isTeacher && teacherScope.allowedSections.length > 0 && !teacherScope.isSectionAllowed(selectedSection))
      ? teacherScope.defaultSection
      : selectedSection;
    const recKey = `${today}_${targetCls}_${targetSec}`;
    const rec = attendanceRecords[recKey];
    if (rec && rec.attendance) return { ...rec.attendance };
    const classStudents = students.filter(s => isMatch(s, targetCls, targetSec) && teacherScope.isStudentAllowed(s));
    const init = {};
    classStudents.forEach(s => {
      const id = s.id || s._docId;
      if (id) init[id] = 'present';
    });
    return init;
  });

  // Reset attendance when class/section/date changes
  const resetToRecord = useCallback((cls, sec, dt) => {
    const key = `${dt}_${cls}_${sec}`;
    const rec = attendanceRecords[key];
    const classStudents = students.filter(s => isMatch(s, cls, sec) && teacherScope.isStudentAllowed(s));
    if (rec && rec.attendance) {
      setAttendance({ ...rec.attendance });
    } else {
      const init = {};
      classStudents.forEach(s => {
        const id = s.id || s._docId;
        if (id) init[id] = 'present';
      });
      setAttendance(init);
    }
    setSaved(false);
  }, [attendanceRecords, students, isMatch, teacherScope]);

  // Keep attendance state synchronized whenever classStudents load or update
  useEffect(() => {
    const classStudentsList = students.filter(s => isMatch(s, activeClass, activeSection) && teacherScope.isStudentAllowed(s));
    if (classStudentsList.length > 0) {
      const key = `${date}_${activeClass}_${activeSection}`;
      const rec = attendanceRecords[key];
      if (rec && rec.attendance) {
        setAttendance({ ...rec.attendance });
      } else {
        setAttendance((prev) => {
          const hasKeys = Object.keys(prev).length > 0;
          const allExist = classStudentsList.every((s) => {
            const id = s.id || s._docId;
            return id && prev[id] !== undefined;
          });
          if (hasKeys && allExist) return prev;
          const updated = { ...prev };
          classStudentsList.forEach((s) => {
            const id = s.id || s._docId;
            if (id && updated[id] === undefined) updated[id] = 'present';
          });
          return updated;
        });
      }
    }
  }, [students, date, activeClass, activeSection, attendanceRecords, isMatch, teacherScope]);

  // Auto-sync active class & section if outside allowed teacher scope
  useEffect(() => {
    if (isTeacher && teacherScope.isRestricted) {
      let nextClass = activeClass;
      let nextSection = activeSection;
      let needsUpdate = false;

      if (teacherScope.allowedClasses.length > 0 && !teacherScope.isClassAllowed(activeClass)) {
        nextClass = teacherScope.defaultClass;
        needsUpdate = true;
      }
      if (teacherScope.allowedSections.length > 0 && !teacherScope.isSectionAllowed(activeSection)) {
        nextSection = teacherScope.defaultSection;
        needsUpdate = true;
      }

      if (needsUpdate) {
        setSelectedClass(nextClass);
        setSelectedSection(nextSection);
        resetToRecord(nextClass, nextSection, date);
      }
    }
  }, [isTeacher, teacherScope, activeClass, activeSection, date, resetToRecord, setSelectedClass, setSelectedSection]);

  const handleClassChange = (cls) => {
    setSelectedClass(cls);
    resetToRecord(cls, activeSection, date);
  };

  const handleSectionChange = (sec) => {
    setSelectedSection(sec);
    resetToRecord(activeClass, sec, date);
  };

  const handleDateChange = (dt) => {
    setDate(dt);
    resetToRecord(activeClass, activeSection, dt);
  };

  const classStudents = useMemo(() =>
    students.filter(s => isMatch(s, activeClass, activeSection) && teacherScope.isStudentAllowed(s))
      .sort((a, b) => String(a.rollNumber || '').localeCompare(String(b.rollNumber || ''), undefined, { numeric: true })),
    [students, activeClass, activeSection, teacherScope, isMatch]
  );

  const filteredStudents = useMemo(() => {
    let list = classStudents;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        String(s.name || '').toLowerCase().includes(q) ||
        String(s.rollNumber || '').includes(q)
      );
    }
    if (filter !== 'all') {
      list = list.filter(s => {
        const id = s.id || s._docId;
        return attendance[id] === filter || (s.id && attendance[s.id] === filter);
      });
    }
    return list;
  }, [classStudents, search, filter, attendance]);

  const stats = useMemo(() => calcAttendanceStats(classStudents, { attendance }),
    [classStudents, attendance]);

  const selectedDateHoliday = useMemo(() => getIndianHoliday(date), [date]);
  const isSunday = useMemo(() => new Date(date + 'T00:00:00').getDay() === 0, [date]);

  const setStatus = useCallback((id, status) => {
    setAttendance(prev => ({ ...prev, [id]: status }));
    setSaved(false);
  }, []);

  const markAll = useCallback((status) => {
    const updated = {};
    classStudents.forEach(s => {
      const id = s.id || s._docId;
      if (id) updated[id] = status;
    });
    setAttendance(updated);
    setSaved(false);
  }, [classStudents]);

  const resetAttendance = useCallback(() => {
    resetToRecord(activeClass, activeSection, date);
  }, [resetToRecord, activeClass, activeSection, date]);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 450));
    try {
      await saveAttendanceRecord(recordKey, {
        date,
        class: activeClass,
        section: activeSection,
        attendance,
        savedAt: new Date().toISOString(),
        markedBy: user?.name || 'Class Teacher',
      });
      setSaved(true);
      addToast(`Attendance for Class ${activeClass}-${activeSection} saved successfully. ✓`, 'success');

      // Automatically send alerts for absent students
      if (settings.enableAutoAlerts) {
        const absentStudents = classStudents.filter(s => {
          const id = s.id || s._docId;
          return attendance[id] === 'absent' || (s.id && attendance[s.id] === 'absent');
        });
        if (absentStudents.length > 0) {
          import('../../utils/notifications').then(({ sendAbsenceAlerts }) => {
            sendAbsenceAlerts(absentStudents, date, settings, addToast);
          });
        }
      }
    } catch (err) {
      console.error('Failed to save attendance:', err);
      addToast('Failed to save attendance record. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = useMemo(() => {
    try {
      return new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return date;
    }
  }, [date]);

  const isEditing = !!existingRecord;
  const isAttendanceTaken = !!existingRecord || saved;

  return (
    <>
      {saving && <LoadingScreen message="Saving attendance..." fullScreen={true} />}
      {/* ── SCREEN DASHBOARD UI (HIDDEN ON PRINT) ── */}
      <div className="no-print w-full space-y-2 sm:space-y-4 animate-fade-in pb-8 sm:pb-10">


      {/* ── 2. ATTENDANCE CONTROL BAR ── */}
      <div className="bg-white dark:bg-[#0B0F19]/80 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-white/10 p-2 sm:p-5 shadow-[0_4px_25px_rgba(0,0,0,0.3)] backdrop-blur-xl relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-1.5 sm:gap-4">
          {/* Left: Class & Section controls - Side-by-side on mobile */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:gap-6">
            {/* Class */}
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">Class</span>
              <div className="inline-flex items-center gap-0.5 sm:gap-1 bg-slate-100 dark:bg-[#111726] p-0.5 sm:p-1 rounded-lg sm:rounded-xl border border-slate-200 dark:border-white/10 w-fit max-w-full">
                {availableClasses.map(cls => {
                  const cleanActive = String(activeClass || '').trim().replace(/^(class|cls)\.?\s*/i, '').replace(/(st|nd|rd|th)$/i, '');
                  const cleanCls = String(cls || '').trim().replace(/^(class|cls)\.?\s*/i, '').replace(/(st|nd|rd|th)$/i, '');
                  const isSelected = cleanActive === cleanCls;
                  return (
                    <button
                      key={cls}
                      onClick={() => handleClassChange(cls)}
                      className={`px-2 py-0.5 sm:px-3.5 sm:py-1.5 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-semibold transition-all duration-150 cursor-pointer active:scale-95 ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.4)] font-bold'
                          : 'bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {cleanCls}th
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section */}
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">Section</span>
              <div className="inline-flex items-center gap-0.5 sm:gap-1 bg-slate-100 dark:bg-[#111726] p-0.5 sm:p-1 rounded-lg sm:rounded-xl border border-slate-200 dark:border-white/10 w-fit max-w-full">
                {availableSections.map(sec => {
                  const isSelected = String(activeSection || '').trim().toUpperCase() === String(sec || '').trim().toUpperCase();
                  return (
                    <button
                      key={sec}
                      onClick={() => handleSectionChange(sec)}
                      className={`px-2 py-0.5 sm:px-3.5 sm:py-1.5 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-semibold transition-all duration-150 cursor-pointer active:scale-95 ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.4)] font-bold'
                          : 'bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {sec}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Date control & Print Button */}
          <div className="flex items-center justify-between md:justify-end gap-1.5 sm:gap-3 pt-1.5 md:pt-0 border-t border-slate-100 dark:border-white/5 md:border-t-0 w-full md:w-auto flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">Date</span>
              <div className="flex items-center gap-1 sm:gap-1.5 flex-1 md:flex-initial">
                <DateNav date={date} onChange={handleDateChange} />
              </div>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-[#161F34] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-xs transition-all no-print cursor-pointer active:scale-95 flex-shrink-0"
              title="Print Attendance Sheet"
            >
              <Printer size={13} className="text-blue-500 dark:text-blue-400" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* ── MOBILE ONLY: UNIFIED ATTENDANCE SUMMARY & QUICK ACTIONS (ULTRA-COMPACT) ── */}
        <div className="lg:hidden mt-2 pt-2 border-t border-slate-100 dark:border-white/10 space-y-1.5">
          {/* Row 1: Mini Ring + Stats & Save CTA */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <ProgressRing percentage={stats.percentage} />
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {stats.total} Students
                </span>
                {isAttendanceTaken ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Recorded
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/25 flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Pending
                  </span>
                )}
              </div>
            </div>

            {/* Compact Save Button */}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={`h-7 px-2.5 sm:px-3 flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold text-white transition-all active:scale-95 cursor-pointer shadow-xs flex-shrink-0 ${
                saved
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-[0_0_10px_rgba(59,130,246,0.25)]'
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  <span>Saving...</span>
                </>
              ) : saved ? (
                <>
                  <CheckCircle2 size={12} />
                  <span>Saved ✓</span>
                </>
              ) : (
                <>
                  <Save size={12} />
                  <span>{isEditing ? 'Update' : 'Save'}</span>
                </>
              )}
            </button>
          </div>

          {/* Row 2: Bulk Actions (All Present, All Absent, Reset) */}
          <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={() => markAll('present')}
              className="h-7 px-1 sm:px-1.5 rounded-lg text-[10px] sm:text-[10.5px] font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center gap-0.5 sm:gap-1 active:scale-95 transition-all cursor-pointer"
              title="Mark all as present"
            >
              <Check size={11} className="stroke-[2.5] flex-shrink-0" />
              <span className="truncate">All Present ({stats.present})</span>
            </button>

            <button
              type="button"
              onClick={() => markAll('absent')}
              className="h-7 px-1 sm:px-1.5 rounded-lg text-[10px] sm:text-[10.5px] font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 flex items-center justify-center gap-0.5 sm:gap-1 active:scale-95 transition-all cursor-pointer"
              title="Mark all as absent"
            >
              <X size={11} className="stroke-[2.5] flex-shrink-0" />
              <span className="truncate">All Absent ({stats.absent})</span>
            </button>

            <button
              type="button"
              onClick={resetAttendance}
              className="h-7 px-1 sm:px-1.5 rounded-lg text-[10px] sm:text-[10.5px] font-semibold text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 flex items-center justify-center gap-0.5 sm:gap-1 active:scale-95 transition-all cursor-pointer"
              title="Reset to saved record"
            >
              <RefreshCw size={11} className="flex-shrink-0" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 3. ATTENDANCE STATUS MESSAGE (PENDING ONLY; AUTOMATICALLY HIDES ONCE ATTENDANCE IS TAKEN) ── */}
      {!isAttendanceTaken && (
        <div className="hidden sm:flex items-center justify-between gap-2 px-3 py-1.5 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs animate-fade-in shadow-xs backdrop-blur-md">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle size={15} className="text-amber-400 flex-shrink-0" />
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-amber-500/20 text-amber-300 border border-amber-500/30 flex-shrink-0">
                Pending
              </span>
              <p className="font-medium text-slate-200 text-xs truncate sm:whitespace-normal">
                No attendance recorded yet for <strong>Class {activeClass}-{activeSection}</strong>.
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center text-[11px] font-semibold text-amber-400 bg-amber-500/15 px-2.5 py-0.5 rounded-md border border-amber-500/20 flex-shrink-0">
            ⏳ Pending
          </span>
        </div>
      )}

      {/* Holiday / Sunday Notices */}
      {selectedDateHoliday && (
        <div className="flex items-center gap-2.5 px-3 py-1.5 sm:px-4 sm:py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-200 text-xs animate-fade-in shadow-xs">
          <span className="text-sm sm:text-base flex-shrink-0">{selectedDateHoliday.icon}</span>
          <p className="font-medium truncate sm:whitespace-normal">
            Official Indian Holiday: <strong>{selectedDateHoliday.name}</strong> ({selectedDateHoliday.type}). School closed.
          </p>
        </div>
      )}

      {!selectedDateHoliday && isSunday && (
        <div className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs animate-fade-in shadow-xs">
          <span className="text-sm">🗓️</span>
          <p className="font-medium">
            Notice: Selected date is a <strong>Sunday</strong> (Weekly School Off).
          </p>
        </div>
      )}

      {/* ── DESKTOP ONLY: MAIN ATTENDANCE SUMMARY & QUICK ACTIONS (SIDE-BY-SIDE) ── */}
      <div className="hidden lg:grid lg:grid-cols-12 gap-4">
        {/* Left Side (Col 1-8): Main Attendance Summary Card */}
        <div className="lg:col-span-8 bg-white dark:bg-[#0B0F19]/80 rounded-2xl border border-slate-200 dark:border-white/10 p-5 shadow-[0_4px_25px_rgba(0,0,0,0.3)] backdrop-blur-xl flex flex-row items-stretch gap-5">
          {/* Circular Progress Ring */}
          <div className="flex items-center justify-center pr-4 border-r border-slate-100 dark:border-white/10 flex-shrink-0">
            <ProgressRing percentage={stats.percentage} />
          </div>

          {/* Right side stats */}
          <div className="flex-1 flex flex-col justify-between w-full min-w-0">
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-base font-bold text-slate-900 dark:text-white truncate">
                    Class {activeClass}-{activeSection}
                  </p>
                  {isAttendanceTaken && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex-shrink-0 animate-fade-in">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Recorded
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#111726] border border-slate-200 dark:border-white/10 px-2 py-0.5 rounded-md flex-shrink-0">
                  {stats.total} Students
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Today's Attendance Overview
              </p>
            </div>

            {/* 2 Stat items */}
            <div className="grid grid-cols-2 gap-2 mt-0">
              {/* Present */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5 text-center transition-all hover:border-emerald-500/40">
                <span className="text-[11px] font-semibold text-emerald-400 block">Present</span>
                <span className="text-xl font-bold text-emerald-300 leading-tight block mt-0.5">
                  {stats.present}
                </span>
              </div>

              {/* Absent */}
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5 text-center transition-all hover:border-rose-500/40">
                <span className="text-[11px] font-semibold text-rose-400 block">Absent</span>
                <span className="text-xl font-bold text-rose-300 leading-tight block mt-0.5">
                  {stats.absent}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side (Col 9-12): Quick Actions & Primary CTA Card */}
        <div className="lg:col-span-4 bg-white dark:bg-[#0B0F19]/80 rounded-2xl border border-slate-200 dark:border-white/10 p-4 shadow-[0_4px_25px_rgba(0,0,0,0.3)] backdrop-blur-xl flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Quick Actions
              </span>
              <span className="text-[10px] text-slate-400">
                Bulk controls
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => markAll('present')}
                className="inline-flex items-center justify-center gap-1 min-h-[38px] px-1.5 rounded-xl text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 active:scale-95 transition-all cursor-pointer"
                title="Mark all as present"
              >
                <Check size={12} className="stroke-[2.5]" />
                <span className="truncate">All Present ({stats.present})</span>
              </button>

              <button
                type="button"
                onClick={() => markAll('absent')}
                className="inline-flex items-center justify-center gap-1 min-h-[38px] px-1.5 rounded-xl text-[11px] font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 active:scale-95 transition-all cursor-pointer"
                title="Mark all as absent"
              >
                <X size={12} className="stroke-[2.5]" />
                <span className="truncate">All Absent ({stats.absent})</span>
              </button>

              <button
                type="button"
                onClick={resetAttendance}
                className="inline-flex items-center justify-center gap-1 min-h-[38px] px-1.5 rounded-xl text-[11px] font-semibold text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 active:scale-95 transition-all cursor-pointer"
                title="Reset to saved record"
              >
                <RefreshCw size={12} />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Primary CTA: Update Attendance */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`w-full h-10 flex items-center justify-center gap-2 px-4 rounded-xl text-sm font-semibold text-white transition-all duration-200 active:scale-[0.98] cursor-pointer shadow-lg ${
              saved
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {saving ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <span>Saving Attendance...</span>
              </>
            ) : saved ? (
              <>
                <CheckCircle2 size={15} />
                <span>Attendance Saved ✓</span>
              </>
            ) : (
              <>
                <Save size={15} />
                <span>{isEditing ? 'Update Attendance' : 'Save Attendance'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── 7. STUDENT LIST SEARCH CONTROLS ── */}
      <div className="flex flex-row items-center justify-between gap-1.5 sm:gap-3 no-print">
        {/* Search */}
        <div className="relative w-full sm:max-w-md">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search student..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-7 sm:pl-8.5 pr-2 sm:pr-3 py-1 sm:py-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-sm bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all shadow-xs"
          />
        </div>
      </div>

      {/* ── 8. MODERN STUDENT ATTENDANCE TABLE ── */}
      <div className="bg-white dark:bg-[#0B0F19]/80 rounded-2xl border border-slate-200 dark:border-white/10 shadow-[0_4px_25px_rgba(0,0,0,0.3)] backdrop-blur-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#111726]/80 border-b border-slate-100 dark:border-white/10 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="text-left px-2 sm:px-4 py-2.5 sm:py-3 w-10 sm:w-16">Roll</th>
                <th className="text-left px-2 sm:px-4 py-2.5 sm:py-3">Student Name</th>
                <th className="text-center px-1 sm:px-4 py-2.5 sm:py-3 w-12 sm:w-28">Status</th>
                <th className="text-center px-2 sm:px-4 py-2.5 sm:py-3 w-20 sm:w-64">
                  <span className="sm:hidden">Mark</span>
                  <span className="hidden sm:inline">Mark Attendance</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]/60 dark:divide-navy-700/60 text-sm">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-[#64748B] text-xs">
                    {search ? 'No students match your search query.' : 'No students found in this class & section.'}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const status = attendance[student.id] || 'present';
                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-white/[0.04] transition-colors"
                    >
                      {/* Roll No */}
                      <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                        <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#111726] border border-slate-200 dark:border-white/10 px-1.5 sm:px-2 py-0.5 rounded-md">
                          {student.rollNumber}
                        </span>
                      </td>

                      {/* Student Name */}
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] sm:text-xs font-bold text-white shadow-xs"
                            style={{ background: `hsl(${(student.rollNumber.charCodeAt(0) * 47) % 360}, 65%, 48%)` }}
                          >
                            {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate">
                              {student.name}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
                              ID: {student.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Current Status Badge */}
                      <td className="px-1 sm:px-4 py-2 sm:py-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center justify-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-xs font-semibold ${
                            status === 'present'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/20'
                              : 'bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/20'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current hidden sm:inline-block mr-1" />
                          <span className="sm:hidden font-bold">{status === 'present' ? 'P' : 'A'}</span>
                          <span className="hidden sm:inline">{status === 'present' ? 'Present' : 'Absent'}</span>
                        </span>
                      </td>

                      {/* Status Buttons */}
                      <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1 sm:gap-1.5 no-print">
                          <StatusButton
                            status="present"
                            current={status}
                            onClick={() => setStatus(student.id, 'present')}
                          />
                          <StatusButton
                            status="absent"
                            current={status}
                            onClick={() => setStatus(student.id, 'absent')}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#111726]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center justify-between sm:justify-start gap-4">
            <span>
              Showing {filteredStudents.length} of {classStudents.length} students
            </span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <strong className="text-slate-900 dark:text-white">{stats.present}</strong> Present
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <strong className="text-slate-900 dark:text-white">{stats.absent}</strong> Absent
              </span>
            </div>
          </div>

          <div className="sm:hidden w-full pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`w-full h-10 flex items-center justify-center gap-2 px-4 rounded-xl text-xs font-semibold text-white transition-all duration-200 active:scale-[0.98] cursor-pointer shadow-md ${
                saved
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {saving ? (
                <span>Saving Attendance...</span>
              ) : saved ? (
                <>
                  <CheckCircle2 size={15} />
                  <span>Attendance Saved ✓</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>{isEditing ? 'Update Attendance' : 'Save Attendance'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      </div>

      {/* ── DEDICATED MULTI-PAGE PRINT ATTENDANCE REGISTER (PRINT ONLY) ── */}
      <div className="print-only p-4 bg-white text-slate-900 font-sans">
        {/* Print Header */}
        <div className="border-b-2 border-slate-900 pb-3 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                {settings.collegeName || settings.schoolName || 'Official Attendance Register'}
              </h1>
              <p className="text-xs font-semibold text-slate-600 mt-0.5">
                Official Student Daily Attendance Register
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 rounded border-2 border-slate-900 text-xs font-extrabold uppercase tracking-wide">
                Class {activeClass} • Division {activeSection}
              </span>
              <p className="text-[11px] text-slate-600 mt-1 font-medium">
                {formattedDate}
              </p>
            </div>
          </div>

          {/* Academic & Teacher Details */}
          <div className="flex items-center justify-between text-xs text-slate-700 mt-3 pt-2 border-t border-slate-200">
            <div>
              <span className="font-bold text-slate-900">Class & Division:</span> Class {activeClass} - Division {activeSection}
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-white">Teacher:</span> {displayName}
            </div>
            <div>
              <span className="font-bold text-slate-900">Academic Year:</span> {settings.academicYear || '2025-2026'}
            </div>
          </div>
        </div>

        {/* Attendance Summary Banner */}
        <div className="grid grid-cols-4 gap-2.5 p-2.5 rounded-lg border border-slate-300 bg-slate-50 mb-4 print-avoid-break">
          <div className="text-center">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-600 block">Total Students</span>
            <span className="text-base font-black text-slate-900">{stats.total}</span>
          </div>
          <div className="text-center border-l border-slate-300">
            <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 block">Present Students</span>
            <span className="text-base font-black text-emerald-700">{stats.present}</span>
          </div>
          <div className="text-center border-l border-slate-300">
            <span className="text-[10px] uppercase tracking-wider font-bold text-rose-700 block">Absent Students</span>
            <span className="text-base font-black text-rose-700">{stats.absent}</span>
          </div>
          <div className="text-center border-l border-slate-300">
            <span className="text-[10px] uppercase tracking-wider font-bold text-blue-700 block">Attendance Rate</span>
            <span className="text-base font-black text-blue-700">{stats.percentage}%</span>
          </div>
        </div>

        {/* Complete Student Attendance Table (Prints all students in class) */}
        <table className="w-full border-collapse border border-slate-300 text-xs">
          <thead>
            <tr className="bg-slate-100 border-b-2 border-slate-300 text-slate-900 font-bold uppercase text-[10px] tracking-wider">
              <th className="border border-slate-300 px-2.5 py-2 text-center w-12">#</th>
              <th className="border border-slate-300 px-2.5 py-2 text-left w-24">Roll No</th>
              <th className="border border-slate-300 px-2.5 py-2 text-left w-24">Student ID</th>
              <th className="border border-slate-300 px-3 py-2 text-left">Student Name</th>
              <th className="border border-slate-300 px-2.5 py-2 text-center w-20">Division</th>
              <th className="border border-slate-300 px-2.5 py-2 text-center w-24">Status</th>
            </tr>
          </thead>
          <tbody>
            {classStudents.map((student, idx) => {
              const status = attendance[student.id] || 'present';
              const isPresent = status === 'present';
              const isAbsent = status === 'absent';
              return (
                <tr
                  key={student.id}
                  className={`border-b border-slate-300 ${idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}`}
                  style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                >
                  <td className="border border-slate-300 px-2.5 py-1.5 text-center text-slate-500 font-mono">
                    {idx + 1}
                  </td>
                  <td className="border border-slate-300 px-2.5 py-1.5 font-semibold font-mono text-slate-800">
                    {student.rollNumber}
                  </td>
                  <td className="border border-slate-300 px-2.5 py-1.5 font-mono text-slate-600">
                    {student.id}
                  </td>
                  <td className="border border-slate-300 px-3 py-1.5 font-semibold text-slate-900">
                    {student.name}
                  </td>
                  <td className="border border-slate-300 px-2.5 py-1.5 text-center text-slate-700">
                    {activeClass}-{activeSection}
                  </td>
                  <td className="border border-slate-300 px-2.5 py-1.5 text-center font-bold">
                    {isPresent ? (
                      <span className="text-emerald-700 font-bold">
                        ✓ Present
                      </span>
                    ) : isAbsent ? (
                      <span className="text-rose-700 font-bold">
                        ✗ Absent
                      </span>
                    ) : (
                      <span className="text-amber-700 font-bold">
                        ⏱ Late
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Print Signatures & Footer */}
        <div className="mt-8 pt-4 border-t border-slate-300 flex items-end justify-between text-xs text-slate-600 print-avoid-break">
          <div>
            <p className="font-semibold text-slate-900">Class Teacher Signature</p>
            <div className="w-48 border-b border-slate-400 mt-8" />
            <p className="text-[10px] text-slate-500 mt-1">{displayName}</p>
          </div>
          <div className="text-center text-[10px] text-slate-400">
            <p>Generated on {new Date().toLocaleDateString('en-IN')} at {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
            <p>Total Students: {classStudents.length} • Present: {stats.present} • Absent: {stats.absent}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-slate-900">Principal / Admin Signature</p>
            <div className="w-48 border-b border-slate-400 mt-8 ml-auto" />
            <p className="text-[10px] text-slate-500 mt-1">Authorized Signatory</p>
          </div>
        </div>
      </div>
    </>
  );
}
