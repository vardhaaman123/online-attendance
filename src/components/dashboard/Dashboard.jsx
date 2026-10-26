import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  ChevronRight,
  BookOpen,
  AlertTriangle,
  Calendar,
  Sparkles,
  Megaphone,
  Download,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  MessageSquare,
  ClipboardCheck,
  BarChart3,
  Lock,
  History,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUserIdentities, isMessageUnreadForUser } from '../../utils/messageUtils';
import { useApp } from '../../context/AppContext';
import { getTeacherScope } from '../../utils/teacherScope';
import {
  getTodayStats,
  getLowAttendanceStudents,
  getWeeklyData,
  getClassComparison,
  getStudentStatusFromRecord,
} from '../../utils/attendanceCalc';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

function CustomDarkTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    return (
      <div className="bg-[#0E1422] border border-white/15 rounded-xl shadow-2xl p-3 backdrop-blur-xl">
        <p className="text-xs font-semibold text-slate-300 mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
          <p className="text-sm font-bold text-white">{val}% Attendance</p>
        </div>
        {payload[0].payload?.present !== undefined && (
          <p className="text-[11px] text-slate-400 mt-1">
            {payload[0].payload.present} present out of {payload[0].payload.total}
          </p>
        )}
      </div>
    );
  }
  return null;
}

export default function Dashboard() {
  const { role, user } = useAuth();
  const {
    students = [],
    teachers = [],
    attendanceRecords = {},
    setSelectedClass,
    setSelectedSection,
    messages = [],
    addToast,
    settings = {},
    refreshStudents,
    refreshTeachers,
  } = useApp();
  const navigate = useNavigate();

  const rawCollegeName = user?.collegeName || settings?.collegeName || settings?.schoolName || 'Attendify Institute';
  const collegeName = useMemo(() => {
    if (!rawCollegeName) return 'Attendify Institute';
    const minorWords = new Set(['of', 'and', 'in', 'for', 'the', 'at', 'on', 'by', '&']);
    return rawCollegeName
      .trim()
      .split(/\s+/)
      .map((word, index) => {
        const lower = word.toLowerCase();
        if (index > 0 && minorWords.has(lower)) {
          return lower;
        }
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      })
      .join(' ');
  }, [rawCollegeName]);

  const teacherScope = useMemo(() => getTeacherScope(user, role), [user, role]);

  // Scoped students for teachers
  const scopedStudents = useMemo(() => {
    if (role === 'teacher' && teacherScope.isRestricted) {
      return teacherScope.filterStudents(students);
    }
    return students;
  }, [students, role, teacherScope]);

  // Filter by class pill (null = All Classes)
  const [filterClass, setFilterClass] = useState(() => {
    if (role === 'teacher' && teacherScope.allowedClasses.length > 0) {
      return teacherScope.defaultClass;
    }
    return 'all';
  });
  const [chartView, setChartView] = useState('weekly'); // 'weekly' | 'classes'
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 640 : false));

  useEffect(() => {
    if (role === 'teacher' && teacherScope.isRestricted) {
      if (teacherScope.allowedClasses.length > 0 && filterClass !== 'all' && !teacherScope.isClassAllowed(filterClass)) {
        setFilterClass(teacherScope.defaultClass);
      }
    }
  }, [role, teacherScope, filterClass]);

  // Auto-fetch data without requiring full page reload
  useEffect(() => {
    if (students.length === 0 && refreshStudents) refreshStudents();
    if (teachers.length === 0 && refreshTeachers) refreshTeachers();
  }, [students.length, teachers.length, refreshStudents, refreshTeachers]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filter students based on selected class
  const activeStudents = useMemo(() => {
    if (filterClass === 'all') return scopedStudents;
    const cleanFilter = String(filterClass || '').trim().replace(/^(class|cls)\.?\s*/i, '').replace(/(st|nd|rd|th)$/i, '');
    return scopedStudents.filter((s) => {
      const cleanS = String(s.class || '').trim().replace(/^(class|cls)\.?\s*/i, '').replace(/(st|nd|rd|th)$/i, '');
      return cleanS === cleanFilter;
    });
  }, [scopedStudents, filterClass]);

  const todayStats = useMemo(() => getTodayStats(activeStudents, attendanceRecords), [activeStudents, attendanceRecords]);
  const weeklyData = useMemo(() => getWeeklyData(activeStudents, attendanceRecords), [activeStudents, attendanceRecords]);
  const classComparison = useMemo(() => getClassComparison(scopedStudents, attendanceRecords), [scopedStudents, attendanceRecords]);
  const lowAttendance = useMemo(() => getLowAttendanceStudents(activeStudents, attendanceRecords), [activeStudents, attendanceRecords]);

  // Yesterday rate calculation for trend
  const yesterday = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const ds = d.toISOString().split('T')[0];
    let p = 0, t = 0;
    activeStudents.forEach((s) => {
      const key = `${ds}_${s.class}_${s.section}`;
      const record = attendanceRecords[key];
      const status = getStudentStatusFromRecord(record, s);
      if (status) {
        t++;
        if (status !== 'absent') p++;
      }
    });
    return t > 0 ? Math.round((p / t) * 100) : 0;
  }, [activeStudents, attendanceRecords]);

  const trend = todayStats.percentage - yesterday;

  const identities = useMemo(() => {
    return getUserIdentities({ role, user, teachers, students });
  }, [role, user, teachers, students]);

  // Recent announcements preview
  const recentAnnouncements = useMemo(() => {
    return (messages || [])
      .filter((m) => m.targetId === 'all' || m.targetRole === 'all')
      .slice(-4)
      .reverse()
      .map((m) => ({
        ...m,
        isUnread: isMessageUnreadForUser(m, identities, students),
      }));
  }, [messages, identities, students]);


  // Export today's attendance CSV
  const handleExportCSV = () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const rows = [
        ['Student Name', 'Roll Number', 'Class', 'Section', 'Status', 'Date'],
      ];

      activeStudents.forEach((s) => {
        const key = `${today}_${s.class}_${s.section}`;
        const record = attendanceRecords[key];
        const status = getStudentStatusFromRecord(record, s) || 'Not Marked';
        rows.push([s.name, s.rollNumber || '—', s.class, s.section, status, today]);
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Attendance_Summary_${today}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addToast?.('Attendance CSV report downloaded successfully', 'success');
    } catch {
      addToast?.('Failed to export CSV', 'error');
    }
  };

  const handleClassSelect = (cls, sec) => {
    setSelectedClass(cls);
    setSelectedSection(sec);
    if (role === 'teacher') {
      navigate('/attendance');
    } else {
      navigate('/history');
    }
  };

  return (
    <div className="w-full space-y-4 sm:space-y-6 pb-8 animate-fade-in text-slate-100">
      {/* ── TOP HERO COMMAND BANNER (Apple Liquid Glass) ── */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white/80 dark:bg-[#0B0F19]/80 border border-slate-200/80 dark:border-white/10 p-4 sm:p-6 backdrop-blur-2xl shadow-sm dark:shadow-[0_4px_30px_rgba(0,0,0,0.3)] space-y-4 sm:space-y-5">
        {/* Top Row: School Name & Quick Action Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25 border border-white/15 flex-shrink-0">
                <GraduationCap size={19} className="sm:w-5 sm:h-5" />
              </span>
              <span className="truncate">{collegeName}</span>
            </h1>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap sm:flex-nowrap">
            {role === 'teacher' && (
              <button
                type="button"
                onClick={() => navigate('/attendance')}
                className="btn-primary h-9 sm:h-10 px-3.5 sm:px-4 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer flex-1 sm:flex-initial shadow-xs"
              >
                <ClipboardCheck size={16} />
                <span>Take Attendance</span>
              </button>
            )}
            {role === 'admin' && (
              <button
                type="button"
                onClick={() => navigate('/history')}
                className="btn-primary h-9 sm:h-10 px-3.5 sm:px-4 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer flex-1 sm:flex-initial shadow-xs"
              >
                <History size={16} />
                <span>Attendance History</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/messages')}
              className="btn-secondary h-9 sm:h-10 px-3.5 sm:px-4 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer flex-1 sm:flex-initial"
            >
              <Megaphone size={16} className="text-blue-500 dark:text-blue-400" />
              <span>Broadcast</span>
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="btn-glass h-9 sm:h-10 px-3 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 hover:text-emerald-500 dark:hover:text-emerald-400"
              title="Download Today's Attendance CSV"
              aria-label="Download Today's Attendance CSV"
            >
              <Download size={15} />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>

        {/* Bottom Row: Apple Segmented Class Filter & Live Status */}
        <div className="pt-2.5 sm:pt-3 border-t border-slate-100 dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-2.5">
          {/* Segmented Class Filter Pills */}
          <div className="inline-flex items-center w-fit self-start shrink-0 p-1 rounded-xl bg-slate-100/90 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 backdrop-blur-xl gap-1 overflow-x-auto no-scrollbar">
            {(role === 'teacher' && teacherScope.isRestricted && teacherScope.allowedClasses.length > 0
              ? (teacherScope.allowedClasses.length > 1
                  ? [{ id: 'all', label: 'All My Classes' }, ...teacherScope.allowedClasses.map(c => ({ id: c, label: `Class ${c}` }))]
                  : teacherScope.allowedClasses.map(c => ({ id: c, label: `Class ${c}` }))
                )
              : [
                  { id: 'all', label: 'All Classes' },
                  ...Array.from(new Set([...students.map(s => s.class), '8', '9', '10'])).filter(Boolean).sort((a,b)=>a.localeCompare(b, undefined, {numeric: true})).map(c => ({ id: c, label: `Class ${c}` }))
                ]
            ).map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setFilterClass(pill.id)}
                className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  filterClass === pill.id
                    ? 'bg-blue-600 text-white shadow-[0_1px_8px_rgba(37,99,235,0.4)]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.06]'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Live Attendance Metric Pill */}
          <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span>{todayStats.total > 0 ? `${todayStats.percentage}% Present Today` : 'Live Sync Active'}</span>
            {todayStats.total > 0 && (
              <>
                <span className="text-slate-300 dark:text-white/20">•</span>
                <span className="text-slate-500 dark:text-slate-400 font-normal">{todayStats.present}/{todayStats.total} checked in</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── 4 KPI STAT CARDS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Students */}
        <div className="relative group overflow-hidden rounded-xl sm:rounded-2xl bg-[#0B0F19]/80 border border-white/10 hover:border-blue-500/30 p-2.5 sm:p-5 backdrop-blur-xl transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.25)] hover:shadow-[0_4px_25px_rgba(59,130,246,0.1)]">
          <div className="flex items-start justify-between mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
              <Users size={16} className="sm:w-5 sm:h-5" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-400 border border-white/[0.06] truncate max-w-[85px]">
              <span className="hidden sm:inline">{filterClass === 'all' ? '6 Sections' : `Class ${filterClass}`}</span>
              <span className="sm:hidden">{filterClass === 'all' ? '6 Secs' : `Cl. ${filterClass}`}</span>
            </span>
          </div>
          <p className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">{todayStats.total}</p>
          <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0.5 truncate">Total Enrolled</p>
          <div className="mt-3 pt-3 border-t border-white/[0.06] hidden sm:flex items-center justify-between text-[11px] text-slate-400">
            <span>Active Roster</span>
            <span className="text-blue-400 font-semibold">100% Registered</span>
          </div>
        </div>

        {/* Present Today */}
        <div className="relative group overflow-hidden rounded-xl sm:rounded-2xl bg-[#0B0F19]/80 border border-white/10 hover:border-emerald-500/30 p-2.5 sm:p-5 backdrop-blur-xl transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.25)] hover:shadow-[0_4px_25px_rgba(16,185,129,0.1)]">
          <div className="flex items-start justify-between mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <UserCheck size={16} className="sm:w-5 sm:h-5" />
            </div>
            {trend !== 0 && (
              <span className={`text-[10px] sm:text-[11px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full border ${
                trend > 0
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}>
                {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%<span className="hidden sm:inline"> vs yest.</span>
              </span>
            )}
          </div>
          <p className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">{todayStats.present}</p>
          <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0.5 truncate">Present Today</p>
          <div className="mt-3 pt-3 border-t border-white/[0.06] hidden sm:flex items-center justify-between text-[11px] text-slate-400">
            <span>Absent check-ins:</span>
            <span className="text-rose-400 font-semibold">{todayStats.absent} students</span>
          </div>
        </div>

        {/* Absent Today */}
        <div className="relative group overflow-hidden rounded-xl sm:rounded-2xl bg-[#0B0F19]/80 border border-white/10 hover:border-rose-500/30 p-2.5 sm:p-5 backdrop-blur-xl transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.25)] hover:shadow-[0_4px_25px_rgba(244,63,94,0.1)]">
          <div className="flex items-start justify-between mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
              <UserX size={16} className="sm:w-5 sm:h-5" />
            </div>
            <span className={`text-[10px] sm:text-[11px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full border ${
              todayStats.absent > 10
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                : 'bg-white/[0.04] text-slate-400 border-white/[0.06]'
            }`}>
              {todayStats.absent > 0 ? 'Absence' : 'All In'}
            </span>
          </div>
          <p className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">{todayStats.absent}</p>
          <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0.5 truncate">Absent Today</p>
          <div className="mt-3 pt-3 border-t border-white/[0.06] hidden sm:flex items-center justify-between text-[11px] text-slate-400">
            <span>Absenteeism:</span>
            <span className="text-rose-400 font-semibold">
              {todayStats.total > 0 ? Math.round((todayStats.absent / todayStats.total) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="relative group overflow-hidden rounded-xl sm:rounded-2xl bg-[#0B0F19]/80 border border-white/10 hover:border-amber-500/30 p-2.5 sm:p-5 backdrop-blur-xl transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.25)] hover:shadow-[0_4px_25px_rgba(245,158,11,0.1)]">
          <div className="flex items-start justify-between mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
              <TrendingUp size={16} className="sm:w-5 sm:h-5" />
            </div>
            <span className={`text-[10px] sm:text-[11px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full border ${
              todayStats.percentage >= 85
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : todayStats.percentage >= 75
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}>
              {todayStats.percentage >= 85 ? 'Optimal' : todayStats.percentage >= 75 ? 'Moderate' : 'Low'}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">{todayStats.percentage}%</p>
          </div>
          <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0.5 truncate">Overall Turnout</p>
          <div className="mt-3 pt-3 border-t border-white/[0.06] hidden sm:block">
            <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  todayStats.percentage >= 85 ? 'bg-emerald-500' : todayStats.percentage >= 75 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${todayStats.percentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── MIDDLE ROW: CLASSES STATUS & ANALYTICS VISUALIZER ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 lg:grid-cols-12 gap-5">
        {/* Classes & Sections Live Status (5 Cols) */}
        <div className="md:col-span-5 lg:col-span-5 flex flex-col space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 tracking-tight">
              <BookOpen size={16} className="text-blue-400" />
              Classes & Sections Overview
            </h2>
            <span className="text-[11px] text-slate-400">Live Status</span>
          </div>

          <div className="space-y-3">
            {(role === 'teacher' && teacherScope.isRestricted && teacherScope.allowedClasses.length > 0
              ? teacherScope.allowedClasses
              : Array.from(new Set([...students.map(s => String(s.class || '').trim()), '8', '9', '10'])).filter(Boolean).sort((a,b)=>a.localeCompare(b, undefined, {numeric: true}))
            ).map((cls) => {
              const cleanCls = String(cls).trim().replace(/^(class|cls)\.?\s*/i, '').replace(/(st|nd|rd|th)$/i, '');
              const classStudents = scopedStudents.filter((s) => {
                const sCls = String(s.class || '').trim().replace(/^(class|cls)\.?\s*/i, '').replace(/(st|nd|rd|th)$/i, '');
                return sCls === cleanCls;
              });

              const availableSecs = (role === 'teacher' && teacherScope.isRestricted && teacherScope.allowedSections.length > 0)
                ? teacherScope.allowedSections
                : Array.from(new Set([...classStudents.map(s => String(s.section || '').trim().toUpperCase()), 'A', 'B'])).filter(Boolean).sort();

              const sectionStats = availableSecs.map((section) => {
                const secStudents = classStudents.filter((s) => String(s.section || '').trim().toUpperCase() === String(section).trim().toUpperCase());
                const today = new Date().toISOString().split('T')[0];
                const key = `${today}_${cleanCls}_${section}`;
                const record = attendanceRecords[key];
                const isMarked = !!record;
                const present = record
                  ? Object.values(record.attendance || {}).filter((v) => v === 'present' || v === 'late').length
                  : null;
                const pct = present !== null && secStudents.length > 0 ? Math.round((present / secStudents.length) * 100) : null;
                return { section, total: secStudents.length, present, isMarked, pct };
              });

              const isClassLocked = false;

              return (
                <div
                  key={cls}
                  className={`rounded-2xl ${isClassLocked ? 'bg-[#0B0F19]/40 opacity-75 grayscale-[30%]' : 'bg-[#0B0F19]/80'} border border-white/10 p-3 sm:p-4 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.2)] ${!isClassLocked && 'hover:border-blue-500/30'} transition-all group`}
                >
                  <div className="flex items-center justify-between mb-2.5 sm:mb-3">
                    <div className="flex items-center gap-2 sm:gap-2.5">
                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl ${isClassLocked ? 'bg-slate-500/10 border-slate-500/20 text-slate-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'} border flex items-center justify-center font-bold text-xs`}>
                        {cls}th
                      </div>
                      <div>
                        <h3 className={`text-xs sm:text-sm font-bold text-white ${!isClassLocked && 'group-hover:text-blue-400'} transition-colors flex items-center gap-1.5 sm:gap-2`}>
                          Class {cls} {isClassLocked && <Lock size={12} className="text-slate-500" />}
                        </h3>
                        <p className="text-[10px] sm:text-[11px] text-slate-400">{classStudents.length} Students registered</p>
                      </div>
                    </div>
                    {isClassLocked ? (
                      <button
                        onClick={() => handleClassSelect(cls, 'A')}
                        className="px-2 sm:px-2.5 py-1 rounded-lg bg-white/[0.02] text-slate-500 border border-white/[0.04] text-[11px] sm:text-xs font-semibold flex items-center gap-1 cursor-not-allowed"
                        title="Restricted Access"
                      >
                        <Lock size={12} />
                        <span>Locked</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleClassSelect(cls, 'A')}
                        className="px-2 sm:px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-blue-600/20 text-slate-300 hover:text-blue-400 border border-white/[0.06] hover:border-blue-500/30 text-[11px] sm:text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <span>{role === 'teacher' ? 'Take' : 'View'}</span>
                        <ArrowUpRight size={13} />
                      </button>
                    )}
                  </div>

                  {/* Sections Breakdown */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {sectionStats.map((sec) => {
                      const isSectionLocked = false;
                      return (
                      <div
                        key={sec.section}
                        onClick={() => handleClassSelect(cls, sec.section)}
                        className={`p-2 sm:p-2.5 rounded-xl ${isSectionLocked ? 'bg-[#0E131F]/50 border-white/[0.03] cursor-not-allowed grayscale-[30%]' : 'bg-[#111726]/80 hover:bg-[#161F34] border-white/[0.06] hover:border-blue-500/20 cursor-pointer'} border transition-all`}
                      >
                        <div className="flex items-center justify-between mb-1 sm:mb-1.5">
                          <span className={`text-[11px] sm:text-xs font-semibold ${isSectionLocked ? 'text-slate-500' : 'text-slate-200'} flex items-center gap-1`}>
                            Sec {sec.section} {isSectionLocked && <Lock size={10} className="text-slate-600" />}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-semibold border ${
                              isSectionLocked
                                ? 'bg-slate-500/5 text-slate-500 border-slate-500/10'
                                : sec.isMarked
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}
                          >
                            {sec.isMarked ? `${sec.present}/${sec.total}` : 'Pending'}
                          </span>
                        </div>
                        <div className="w-full bg-white/[0.06] rounded-full h-1 overflow-hidden mb-1">
                          <div
                            className={`h-full rounded-full ${isSectionLocked ? 'bg-slate-600/40' : sec.isMarked ? 'bg-emerald-500' : 'bg-amber-500/40'}`}
                            style={{ width: `${sec.pct ?? 0}%` }}
                          />
                        </div>
                        <p className={`text-[9px] sm:text-[10px] ${isSectionLocked ? 'text-slate-500' : 'text-slate-400'} text-right`}>
                          {sec.pct !== null ? `${sec.pct}% Present` : 'Not marked'}
                        </p>
                      </div>
                    )})}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Interactive Analytics Visualizer (7 Cols) */}
        <div className="md:col-span-7 lg:col-span-7 flex flex-col rounded-2xl bg-[#0B0F19]/80 border border-white/10 p-3.5 sm:p-5 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.2)] min-w-0 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 mb-2.5 sm:mb-6">
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 sm:gap-2 tracking-tight">
                <BarChart3 size={15} className="text-blue-400" />
                Attendance Telemetry & Analytics
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">
                {chartView === 'weekly' ? 'Daily turnout trend over the past 5 school days' : 'Comparative turnout across grade tiers'}
              </p>
            </div>

            {/* View switcher */}
            <div className="flex items-center gap-1 bg-[#111726] border border-white/10 rounded-xl p-0.5 sm:p-1 self-start sm:self-auto">
              <button
                onClick={() => setChartView('weekly')}
                className={`px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
                  chartView === 'weekly'
                    ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Weekly Trend
              </button>
              <button
                onClick={() => setChartView('classes')}
                className={`px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
                  chartView === 'classes'
                    ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Class Comparison
              </button>
            </div>
          </div>

          <div className="h-[150px] sm:h-[260px] w-full min-w-0 overflow-hidden">
            {chartView === 'weekly' ? (
              weeklyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={isMobile ? 150 : 260}>
                  <AreaChart data={weeklyData} margin={{ top: isMobile ? 5 : 10, right: 10, left: isMobile ? -25 : -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: isMobile ? 10 : 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[50, 100]} tick={{ fontSize: isMobile ? 10 : 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                    <Tooltip content={<CustomDarkTooltip />} />
                    <Area type="monotone" dataKey="percentage" stroke="#3B82F6" strokeWidth={isMobile ? 2.5 : 3} fillOpacity={1} fill="url(#areaGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">No weekly data recorded yet</div>
              )
            ) : (
              <ResponsiveContainer width="100%" height={isMobile ? 150 : 260}>
                <BarChart data={classComparison} barSize={isMobile ? 22 : 42} margin={{ top: isMobile ? 5 : 10, right: 10, left: isMobile ? -25 : -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="class" tick={{ fontSize: isMobile ? 10 : 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[50, 100]} tick={{ fontSize: isMobile ? 10 : 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip content={<CustomDarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 8 }} />
                  <Bar dataKey="percentage" fill="#6366F1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-2.5 sm:mt-4 pt-2 sm:pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] sm:text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-blue-500 animate-pulse" />
              Live Telemetry<span className="hidden sm:inline"> Updated</span>
            </span>
            <button onClick={() => navigate('/reports')} className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer">
              View Detailed Analytics <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ── LOWER ROW: WATCHLIST + NOTICEBOARD + QUICK COMMANDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
        {/* Low Attendance Watchlist */}
        <div className="rounded-2xl bg-[#0B0F19]/80 border border-white/10 p-3 sm:p-5 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.2)] flex flex-col">
          <div className="flex items-center justify-between mb-2.5 sm:mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <AlertTriangle size={13} className="sm:w-3.5 sm:h-3.5" />
              </div>
              <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight">Defaulter Watchlist</h2>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
              Below 75%
            </span>
          </div>

          <div className="flex-1 space-y-2">
            {lowAttendance.length === 0 ? (
              <div className="flex items-center gap-2.5 p-2.5 sm:p-5 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/10 sm:bg-transparent sm:border-0 sm:flex-col sm:text-center">
                <div className="w-7 h-7 sm:w-11 sm:h-11 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0 sm:mx-auto sm:mb-2 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
                  <CheckCircle2 size={16} className="sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-200">All students in good standing!</p>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">No attendance default alerts today.</p>
                </div>
              </div>
            ) : (
              lowAttendance.slice(0, 4).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-2 sm:p-2.5 rounded-xl bg-[#111726]/80 border border-white/[0.06] hover:border-rose-500/30 transition-all"
                >
                  <div className="min-w-0 flex items-center gap-2 sm:gap-2.5">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-300 font-bold text-xs flex-shrink-0">
                      {s.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{s.name}</p>
                      <p className="text-[10px] text-slate-400">Class {s.class}-{s.section}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-bold text-rose-400">{s.percentage}%</span>
                    <button
                      onClick={() => navigate('/messages')}
                      className="p-1 rounded-lg bg-white/[0.04] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                      title="Send alert notice"
                    >
                      <MessageSquare size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {lowAttendance.length > 4 && (
            <button
              onClick={() => navigate('/reports')}
              className="w-full mt-2 sm:mt-3 pt-2 text-xs text-center text-blue-400 hover:text-blue-300 border-t border-white/[0.06] font-medium cursor-pointer"
            >
              +{lowAttendance.length - 4} more students on watchlist
            </button>
          )}
        </div>

        {/* Live School Noticeboard Widget */}
        <div className="rounded-2xl bg-[#0B0F19]/80 border border-white/10 p-3 sm:p-5 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.2)] flex flex-col">
          <div className="flex items-center justify-between mb-2.5 sm:mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Megaphone size={13} className="sm:w-3.5 sm:h-3.5" />
              </div>
              <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight">Notice Board</h2>
            </div>
            <button
              onClick={() => navigate('/messages')}
              className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>Hub</span>
              <ArrowUpRight size={12} />
            </button>
          </div>

          <div className="flex-1 space-y-2 sm:space-y-2.5">
            {recentAnnouncements.length === 0 ? (
              <div className="flex items-center justify-between p-2.5 sm:p-5 rounded-xl bg-white/[0.02] border border-white/[0.05] sm:bg-transparent sm:border-0 sm:block sm:text-center">
                <div className="min-w-0">
                  <p className="text-xs text-slate-300 font-medium">No recent announcements</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 sm:hidden">Updates will appear here</p>
                </div>
                <button
                  onClick={() => navigate('/messages')}
                  className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-all cursor-pointer flex-shrink-0 sm:mt-2 sm:inline-block sm:border-0 sm:bg-transparent sm:p-0 sm:hover:underline"
                >
                  Post notice
                </button>
              </div>
            ) : (
              recentAnnouncements.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => navigate('/messages')}
                  className="p-2.5 sm:p-3 rounded-xl bg-[#111726]/80 hover:bg-[#161F34] border border-white/[0.06] transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {msg.isUnread && (
                        <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)] animate-pulse flex-shrink-0" title="New notice" />
                      )}
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 truncate">
                        {msg.senderName || 'Principal'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed group-hover:text-white transition-colors">
                    {msg.text}
                  </p>
                </div>
              ))
            )}
          </div>

          <button
            onClick={() => navigate('/messages')}
            className={`w-full mt-2 sm:mt-3 py-1.5 sm:py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[11px] sm:text-xs font-semibold text-slate-300 hover:text-white transition-all text-center cursor-pointer ${recentAnnouncements.length === 0 ? 'hidden sm:block' : ''}`}
          >
            Open Messaging Center
          </button>
        </div>

        {/* Quick Command Center */}
        <div className="rounded-2xl bg-[#0B0F19]/80 border border-white/10 p-3 sm:p-5 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.2)] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Sparkles size={13} className="sm:w-3.5 sm:h-3.5" />
              </div>
              <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight">Quick Commands</h2>
            </div>

            <div className="space-y-2">
              {role === 'teacher' ? (
                <button
                  onClick={() => navigate('/attendance')}
                  className="w-full p-2.5 rounded-xl bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600/30 hover:to-indigo-600/30 border border-blue-500/30 text-white flex items-center justify-between text-xs font-semibold transition-all group cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <ClipboardCheck size={15} className="text-blue-400" />
                    Take Today's Attendance
                  </span>
                  <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                </button>
              ) : (
                <button
                  onClick={() => navigate('/history')}
                  className="w-full p-2.5 rounded-xl bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600/30 hover:to-indigo-600/30 border border-blue-500/30 text-white flex items-center justify-between text-xs font-semibold transition-all group cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <History size={15} className="text-blue-400" />
                    View Attendance History
                  </span>
                  <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                </button>
              )}

              {role === 'admin' && (
                <>
                  <button
                    onClick={() => navigate('/students')}
                    className="w-full p-2.5 rounded-xl bg-[#111726]/80 hover:bg-[#161F34] border border-white/[0.06] text-slate-300 hover:text-white flex items-center justify-between text-xs font-semibold transition-all group cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Users size={15} className="text-emerald-400" />
                      Manage Students Roster
                    </span>
                    <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button
                    onClick={() => navigate('/teachers')}
                    className="w-full p-2.5 rounded-xl bg-[#111726]/80 hover:bg-[#161F34] border border-white/[0.06] text-slate-300 hover:text-white flex items-center justify-between text-xs font-semibold transition-all group cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <ShieldCheck size={15} className="text-purple-400" />
                      Faculty Management
                    </span>
                    <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </button>
                </>
              )}

              <button
                onClick={() => navigate('/reports')}
                className="w-full p-2.5 rounded-xl bg-[#111726]/80 hover:bg-[#161F34] border border-white/[0.06] text-slate-300 hover:text-white flex items-center justify-between text-xs font-semibold transition-all group cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <BarChart3 size={15} className="text-cyan-400" />
                  Generate Attendance Reports
                </span>
                <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] text-[11px] text-slate-400 flex items-center justify-between">
            <span>Data Sync Status</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Real-time
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
