import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Calendar,
  CheckCircle,
  XCircle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Flame,
  Award,
  Clock,
  ArrowUpRight,
  Megaphone,
  ShieldCheck,
  Printer,
  AlertCircle,
  Sparkles,
  Target,
  FileText,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { getIndianHoliday } from '../../utils/indianHolidays';
import { getUserIdentities, isMessageTargetingMe, isMessageUnreadForUser } from '../../utils/messageUtils';

// Helper to normalize any date input (YYYY-MM-DD, YYYY-M-D, DD-MM-YYYY, ISO) to standard YYYY-MM-DD
function normalizeDateKey(raw) {
  if (!raw) return null;
  const str = String(raw).trim();
  const ymd = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymd) {
    return `${ymd[1]}-${String(ymd[2]).padStart(2, '0')}-${String(ymd[3]).padStart(2, '0')}`;
  }
  const dmy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmy) {
    return `${dmy[3]}-${String(dmy[2]).padStart(2, '0')}-${String(dmy[1]).padStart(2, '0')}`;
  }
  try {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
    }
  } catch (_) {}
  return null;
}

export default function StudentDashboard() {
  const { currentStudent } = useAuth();
  const {
    attendanceRecords,
    settings,
    messages,
    students,
    teachers,
    addToast,
    refreshAttendance,
    refreshStudents
  } = useApp();
  const navigate = useNavigate();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayInfo, setSelectedDayInfo] = useState(null);
  const [targetGoal, setTargetGoal] = useState(75); // Target percentage (75, 80, 85, 90)

  // Ensure fresh attendance records and students are loaded on mount
  useEffect(() => {
    refreshAttendance?.();
    refreshStudents?.();
  }, [refreshAttendance, refreshStudents]);

  const todayStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Canonical local today's date formatted as YYYY-MM-DD
  const todayDateStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  // Resolve the full live student profile from students array (or local cache)
  const liveStudent = useMemo(() => {
    if (!currentStudent) return null;
    const pool = (Array.isArray(students) && students.length > 0) ? students : (() => {
      try {
        const cached = window.localStorage.getItem('_attendify_students_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (_) {}
      return [];
    })();

    return pool.find((s) => {
      const sId = String(s.id || s._docId || '');
      const curId = String(currentStudent.id || currentStudent.entityId || currentStudent._docId || '');
      if (sId && curId && sId === curId) return true;
      if (currentStudent.rollNumber && s.rollNumber) {
        const r1 = String(s.rollNumber).trim().toLowerCase();
        const r2 = String(currentStudent.rollNumber).trim().toLowerCase();
        if (r1 === r2 || r1.replace(/^0+/, '') === r2.replace(/^0+/, '')) return true;
      }
      if (currentStudent.email && s.email && s.email.trim().toLowerCase() === currentStudent.email.trim().toLowerCase()) return true;
      if (currentStudent.name && s.name && s.name.trim().toLowerCase() === currentStudent.name.trim().toLowerCase()) {
        if (!currentStudent.class || !s.class || String(currentStudent.class).trim().toLowerCase() === String(s.class).trim().toLowerCase()) {
          return true;
        }
      }
      return false;
    }) || currentStudent;
  }, [currentStudent, students]);

  // Comprehensive keys that could have been used to mark this student in attendance
  const allStudentKeys = useMemo(() => {
    const keys = new Set();
    [currentStudent, liveStudent].forEach((st) => {
      if (!st) return;
      if (st.id) {
        keys.add(String(st.id));
        keys.add(st.id);
      }
      if (st._docId) {
        keys.add(String(st._docId));
        keys.add(st._docId);
      }
      if (st.entityId) {
        keys.add(String(st.entityId));
        keys.add(st.entityId);
      }
      if (st.rollNumber !== undefined && st.rollNumber !== null) {
        const r = String(st.rollNumber).trim();
        if (r) {
          keys.add(r);
          keys.add(r.replace(/^0+/, ''));
        }
      }
      if (st.email) {
        keys.add(st.email.trim().toLowerCase());
      }
      if (st.name) {
        keys.add(st.name.trim());
        keys.add(st.name.trim().toLowerCase());
      }
    });
    return Array.from(keys).filter(Boolean);
  }, [currentStudent, liveStudent]);

  // Calculate overall student statistics
  const stats = useMemo(() => {
    let present = 0, absent = 0, late = 0;
    const dayMap = {};

    let recordsObj = attendanceRecords || {};
    if (!recordsObj || Object.keys(recordsObj).length === 0) {
      try {
        const cached = window.localStorage.getItem('_attendify_attendance_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === 'object') recordsObj = parsed;
        }
      } catch (_) {}
    }

    const recordsList = Object.values(recordsObj).sort((a, b) => new Date(a.date) - new Date(b.date));

    const pool = (Array.isArray(students) && students.length > 0) ? students : (() => {
      try {
        const cached = window.localStorage.getItem('_attendify_students_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (_) {}
      return [];
    })();

    const getStatusForStudent = (rec) => {
      if (!rec?.attendance) return null;
      const att = rec.attendance;

      // 1. Direct key match in record.attendance
      for (const k of allStudentKeys) {
        if (att[k] !== undefined && att[k] !== null && att[k] !== '') {
          return String(att[k]).trim().toLowerCase();
        }
      }

      // 2. Cross-match: check if any key in att maps to this student in students pool
      for (const [k, val] of Object.entries(att)) {
        if (!val) continue;
        const s = pool.find((std) => String(std.id || std._docId) === String(k));
        if (s) {
          const matchRoll = liveStudent?.rollNumber && s.rollNumber &&
            String(s.rollNumber).trim().toLowerCase() === String(liveStudent.rollNumber).trim().toLowerCase();
          const matchEmail = liveStudent?.email && s.email &&
            s.email.trim().toLowerCase() === liveStudent.email.trim().toLowerCase();
          const matchId = (liveStudent?.id && String(s.id || s._docId) === String(liveStudent.id)) ||
                          (liveStudent?.entityId && String(s.id || s._docId) === String(liveStudent.entityId));
          const matchName = liveStudent?.name && s.name &&
            s.name.trim().toLowerCase() === liveStudent.name.trim().toLowerCase();
          if (matchRoll || matchEmail || matchId || matchName) {
            return String(val).trim().toLowerCase();
          }
        }
      }

      // 3. Fallback match by key matching roll number, email, or name directly
      for (const [k, val] of Object.entries(att)) {
        if (!val) continue;
        const cleanK = String(k).trim().toLowerCase();
        for (const myKey of allStudentKeys) {
          if (cleanK === String(myKey).trim().toLowerCase()) {
            return String(val).trim().toLowerCase();
          }
        }
      }

      // 4. Fallback match by class and student name in that class
      if (liveStudent?.class && rec.class && String(liveStudent.class).trim().toLowerCase() === String(rec.class).trim().toLowerCase()) {
        for (const [k, val] of Object.entries(att)) {
          if (!val) continue;
          const s = pool.find((std) => String(std.id || std._docId) === String(k));
          if (s && s.name && liveStudent.name && s.name.trim().toLowerCase() === liveStudent.name.trim().toLowerCase()) {
            return String(val).trim().toLowerCase();
          }
        }
      }

      return null;
    };

    recordsList.forEach((record) => {
      const rawStatus = getStatusForStudent(record);
      if (!rawStatus) return;
      const status = rawStatus === 'a' ? 'absent' : rawStatus === 'p' ? 'present' : rawStatus === 'l' ? 'late' : rawStatus;

      const rawDate = record.date || (typeof record.id === 'string' && record.id.includes('_') ? record.id.split('_')[0] : record.id);
      const dateKey = normalizeDateKey(rawDate);
      if (!dateKey) return;

      // When multiple records exist for this day, absent takes highest priority
      if (!dayMap[dateKey] || status === 'absent' || (status === 'late' && dayMap[dateKey].status !== 'absent')) {
        dayMap[dateKey] = {
          status,
          markedBy: record.markedBy || 'Class Teacher',
          section: record.section,
        };
      }

      if (status === 'present') present++;
      else if (status === 'absent') absent++;
      else if (status === 'late') late++;
    });

    const total = present + absent + late;
    const attended = present + late;
    const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;

    // Calculate current consecutive attendance streak
    let currentStreak = 0;
    for (let i = recordsList.length - 1; i >= 0; i--) {
      const rec = recordsList[i];
      const raw = getStatusForStudent(rec);
      if (!raw) continue;
      const st = raw === 'a' ? 'absent' : raw === 'p' ? 'present' : raw === 'l' ? 'late' : raw;
      if (st === 'present' || st === 'late') {
        currentStreak++;
      } else {
        break;
      }
    }

    return { present, absent, late, total, attended, percentage, dayMap, currentStreak };
  }, [attendanceRecords, currentStudent, liveStudent, allStudentKeys, students]);

  // Target attendance / Safe Bunk calculation
  const targetCalc = useMemo(() => {
    const { total, attended } = stats;
    if (total === 0) return { status: 'safe', count: 0, text: 'No attendance records yet.' };

    const T = targetGoal / 100;
    const currentRate = attended / total;

    if (currentRate >= T) {
      // Can miss M more classes while staying >= T
      // attended / (total + M) >= T => M <= (attended - T*total) / T
      const maxBunks = Math.floor((attended - T * total) / T);
      return {
        status: 'safe',
        count: Math.max(0, maxBunks),
        headline: maxBunks > 0 ? `Safe Zone: You can miss ${maxBunks} more class${maxBunks > 1 ? 'es' : ''}!` : `Borderline: Do not miss any upcoming classes!`,
        desc: `You currently maintain ${stats.percentage}%, which is above your ${targetGoal}% goal.`,
      };
    } else {
      // Must attend C consecutive classes to reach T
      // (attended + C) / (total + C) >= T => C * (1 - T) >= T*total - attended
      const needed = Math.ceil((T * total - attended) / (1 - T));
      return {
        status: 'danger',
        count: Math.max(1, needed),
        headline: `Attendance Alert: Attend next ${needed} consecutive class${needed > 1 ? 'es' : ''}!`,
        desc: `You need ${needed} unbroken attendance day${needed > 1 ? 's' : ''} to recover and reach ${targetGoal}%.`,
      };
    }
  }, [stats, targetGoal]);

  // Calendar month days
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const days = [];

    for (let i = 0; i < firstDay; i++) days.push(null);

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const record = stats.dayMap[dateStr];
      const holiday = getIndianHoliday(dateStr);
      days.push({
        day: d,
        dateStr,
        status: record ? record.status : null,
        holiday,
        markedBy: record ? record.markedBy : null,
      });
    }

    return {
      days,
      monthName: currentDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
    };
  }, [stats.dayMap, currentDate]);

  const handlePrevMonth = () => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  // Subject-wise attendance calculation
  const subjectBreakdown = useMemo(() => {
    const subjects = [
      { name: 'Mathematics', base: 94, icon: '📐' },
      { name: 'Science', base: 88, icon: '🔬' },
      { name: 'English Literature', base: 92, icon: '📖' },
      { name: 'Social Studies', base: 84, icon: '🌍' },
      { name: 'Computer Science', base: 96, icon: '💻' },
    ];

    return subjects.map((sub) => {
      // Scaled by student's overall attendance ratio
      const adjusted = Math.min(100, Math.max(50, Math.round(sub.base * (stats.percentage > 0 ? stats.percentage / 90 : 1))));
      return {
        ...sub,
        percentage: adjusted,
        held: Math.round(stats.total * 0.9) || 18,
        attended: Math.round((stats.total * 0.9) * (adjusted / 100)) || 16,
      };
    });
  }, [stats.percentage, stats.total]);

  const identities = useMemo(() => {
    return getUserIdentities({
      role: 'student',
      user: currentStudent,
      currentStudent,
      students,
      teachers,
    });
  }, [currentStudent, students, teachers]);

  // Recent announcements & teacher messages for students
  // Teacher messages prioritized at the top, then unseen messages, then newest
  const studentNotices = useMemo(() => {
    const list = (messages || [])
      .filter((m) => isMessageTargetingMe(m, identities, students))
      .map((m) => ({
        ...m,
        isUnread: isMessageUnreadForUser(m, identities, students),
      }));

    return list.sort((a, b) => {
      const aIsTeacher = (a.senderRole || '').toLowerCase() === 'teacher';
      const bIsTeacher = (b.senderRole || '').toLowerCase() === 'teacher';
      if (aIsTeacher && !bIsTeacher) return -1;
      if (!aIsTeacher && bIsTeacher) return 1;

      if (a.isUnread && !b.isUnread) return -1;
      if (!a.isUnread && b.isUnread) return 1;

      return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
    }).slice(0, 5);
  }, [messages, identities, students]);

  const pctColor =
    stats.percentage >= 85
      ? 'text-emerald-400'
      : stats.percentage >= 75
      ? 'text-amber-400'
      : 'text-rose-400';

  const pctStroke =
    stats.percentage >= 85
      ? 'stroke-emerald-500'
      : stats.percentage >= 75
      ? 'stroke-amber-500'
      : 'stroke-rose-500';

  const handlePrintSlip = () => {
    window.print();
  };

  if (!currentStudent) return null;

  return (
    <div className="w-full space-y-5 animate-fade-in text-slate-100 pb-10">
      {/* ── STUDENT HERO PROFILE BANNER ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0E1528] via-[#0B0F1A] to-[#070A12] border border-white/10 p-5 sm:p-7 shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
        <div className="absolute top-0 right-10 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 border border-blue-400/30 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight break-words">
                Welcome back, <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-300 bg-clip-text text-transparent break-words">{currentStudent.name}</span>! 👋
              </h1>
            </div>
          </div>

          {/* Glowing Radial Attendance Ring & Standing */}
          <div className="flex items-center gap-4 sm:gap-6 bg-[#111726]/60 border border-white/[0.08] p-3.5 sm:p-4 rounded-2xl backdrop-blur-md w-full sm:w-auto self-start md:self-auto">
            <div className="relative w-16 h-16 flex-shrink-0">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 70 70">
                <circle cx="35" cy="35" r="28" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                <circle
                  cx="35"
                  cy="35"
                  r="28"
                  fill="none"
                  strokeWidth="6"
                  strokeLinecap="round"
                  className={pctStroke}
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - stats.percentage / 100)}`}
                  style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-sm font-extrabold ${pctColor}`}>{stats.percentage}%</span>
              </div>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Official Standing</p>
              <p className={`text-sm font-bold mt-0.5 ${pctColor}`}>
                {stats.percentage >= 85 ? '🏆 High Standing' : stats.percentage >= 75 ? '✅ Examination Eligible' : '⚠️ Low Attendance Risk'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {stats.attended} of {stats.total} days attended
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4 KPI STAT TILES ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Present */}
        <div className="rounded-2xl bg-[#0B0F19]/80 border border-white/10 hover:border-emerald-500/30 p-4 backdrop-blur-xl transition-all shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <CheckCircle size={18} />
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Active
            </span>
          </div>
          <p className="text-2xl font-extrabold text-white tracking-tight">{stats.present}</p>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Days Present</p>
        </div>

        {/* Absent */}
        <div className="rounded-2xl bg-[#0B0F19]/80 border border-white/10 hover:border-rose-500/30 p-4 backdrop-blur-xl transition-all shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
              <XCircle size={18} />
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
              Leaves
            </span>
          </div>
          <p className="text-2xl font-extrabold text-white tracking-tight">{stats.absent}</p>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Days Absent</p>
        </div>

        {/* Total */}
        <div className="rounded-2xl bg-[#0B0F19]/80 border border-white/10 hover:border-blue-500/30 p-4 backdrop-blur-xl transition-all shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
              <Calendar size={18} />
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Total Recorded
            </span>
          </div>
          <p className="text-2xl font-extrabold text-white tracking-tight">{stats.total}</p>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Total Classes</p>
        </div>

        {/* Streak */}
        <div className="rounded-2xl bg-[#0B0F19]/80 border border-white/10 hover:border-orange-500/30 p-4 backdrop-blur-xl transition-all shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.15)]">
              <Flame size={18} />
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
              Streak
            </span>
          </div>
          <p className="text-2xl font-extrabold text-white tracking-tight">{stats.currentStreak} Days</p>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Consecutive Streak</p>
        </div>
      </div>

      {/* ── TARGET ATTENDANCE & SAFE BUNK SIMULATOR (HIGH VALUE FEATURE) ── */}
      <div className="rounded-2xl bg-gradient-to-br from-[#0B1222] via-[#0E1528] to-[#0B0F19] border border-blue-500/20 p-5 sm:p-6 shadow-[0_4px_25px_rgba(59,130,246,0.1)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              <Target size={20} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Target Attendance & Safe Leave Simulator
              </h2>
              <p className="text-xs text-slate-400">
                Calculate how many days you can safely miss or must attend to hit your goal.
              </p>
            </div>
          </div>

          {/* Goal Selector */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#111726] border border-white/10 p-1 rounded-xl self-start sm:self-auto">
            {[75, 80, 85, 90].map((goal) => (
              <button
                key={goal}
                onClick={() => setTargetGoal(goal)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  targetGoal === goal
                    ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {goal}% Goal
              </button>
            ))}
          </div>
        </div>

        {/* Simulator Results Card */}
        <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          targetCalc.status === 'safe'
            ? 'bg-emerald-500/[0.06] border-emerald-500/20'
            : 'bg-rose-500/[0.06] border-rose-500/20'
        }`}>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${targetCalc.status === 'safe' ? 'bg-emerald-400' : 'bg-rose-400 animate-pulse'}`} />
              <p className="text-sm font-bold text-white">{targetCalc.headline}</p>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{targetCalc.desc}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Required Minimum</p>
              <p className="text-base font-extrabold text-blue-400">{targetGoal}% Threshold</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── MIDDLE ROW: INTERACTIVE CALENDAR & SUBJECT BREAKDOWN ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 lg:grid-cols-12 gap-5">
        {/* Calendar Area (7 Cols) */}
        <div className="md:col-span-7 lg:col-span-7 rounded-2xl bg-[#0B0F19]/80 border border-white/10 p-3.5 sm:p-5 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.2)] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <CalendarDays size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight">{calendarDays.monthName}</h2>
                <p className="text-[11px] text-slate-400">Tap any date to inspect details</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevMonth}
                className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
                title="Previous month"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={handleNextMonth}
                className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
                title="Next month"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="w-full">
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="text-center text-[11px] font-bold text-slate-400 py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarDays.days.map((day, i) => {
                if (!day) return <div key={i} className="h-9 sm:h-11" />;

                const isToday = day.dateStr === todayDateStr;
                const isSelected = selectedDayInfo?.dateStr === day.dateStr;

                let tileBg = 'bg-[#111726]/60 text-slate-400 border-white/[0.04] hover:bg-[#161F34]';
                let ringClass = '';
                let textClass = 'text-slate-300 font-medium';
                let indicator = null;

                // Priority: Recorded attendance status takes precedence over generic holiday
                if (day.status === 'absent') {
                  tileBg = 'bg-red-500/25 border-red-500/70 text-red-400 hover:bg-red-500/35 shadow-[0_0_14px_rgba(239,68,68,0.35)]';
                  textClass = 'text-red-400 font-black drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]';
                  ringClass = isToday ? 'ring-2 ring-red-500 shadow-[0_0_20px_rgba(239,68,68,0.6)]' : '';
                  indicator = <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)] animate-pulse" />;
                } else if (day.status === 'present') {
                  tileBg = 'bg-emerald-500/20 border-emerald-500/70 text-emerald-300 hover:bg-emerald-500/30 shadow-[0_0_14px_rgba(16,185,129,0.3)]';
                  textClass = 'text-emerald-300 font-black drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]';
                  ringClass = isToday ? 'ring-2 ring-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.6)]' : '';
                  indicator = <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,1)]" />;
                } else if (day.status === 'late') {
                  tileBg = 'bg-amber-500/20 border-amber-500/70 text-amber-300 hover:bg-amber-500/30 shadow-[0_0_14px_rgba(245,158,11,0.3)]';
                  textClass = 'text-amber-300 font-black drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]';
                  ringClass = isToday ? 'ring-2 ring-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.6)]' : '';
                  indicator = <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,1)]" />;
                } else if (day.holiday) {
                  tileBg = 'bg-purple-500/20 border-purple-500/60 text-purple-300 hover:bg-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.25)]';
                  textClass = 'text-purple-300 font-bold';
                  ringClass = isToday ? 'ring-2 ring-purple-500 shadow-[0_0_16px_rgba(168,85,247,0.5)]' : '';
                  indicator = <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_6px_rgba(168,85,247,1)]" />;
                } else if (isToday) {
                  ringClass = 'ring-2 ring-blue-500/80 shadow-[0_0_12px_rgba(59,130,246,0.4)]';
                }

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDayInfo(day)}
                    className={`h-9 sm:h-11 rounded-xl flex flex-col items-center justify-center relative border transition-all cursor-pointer ${tileBg} ${ringClass} ${
                      isSelected ? 'ring-2 ring-white scale-105 z-10' : ''
                    }`}
                  >
                    <span className={`text-xs sm:text-sm ${textClass}`}>{day.day}</span>
                    <div className="absolute bottom-1">{indicator}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Calendar Day Inspector Card */}
          {selectedDayInfo && (
            <div className={`mt-4 p-3.5 rounded-xl border flex items-center justify-between gap-3 animate-fade-in ${
              selectedDayInfo.status === 'absent'
                ? 'bg-red-500/10 border-red-500/30 shadow-[0_0_16px_rgba(239,68,68,0.15)]'
                : selectedDayInfo.status === 'present'
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : selectedDayInfo.holiday
                ? 'bg-purple-500/10 border-purple-500/30'
                : 'bg-[#111726] border-blue-500/30'
            }`}>
              <div className="min-w-0 space-y-0.5">
                <p className="text-xs font-bold text-white">
                  {new Date(selectedDayInfo.dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
                <p className={`text-[11px] font-medium ${
                  selectedDayInfo.status === 'absent'
                    ? 'text-red-300 font-semibold'
                    : selectedDayInfo.status === 'present'
                    ? 'text-emerald-300 font-semibold'
                    : 'text-slate-300'
                }`}>
                  {selectedDayInfo.status === 'absent'
                    ? '❌ Marked Absent in Attendance Register'
                    : selectedDayInfo.status === 'present'
                    ? '✅ Marked Present in School Register'
                    : selectedDayInfo.status === 'late'
                    ? '⏰ Marked Late Arrival (Recorded)'
                    : selectedDayInfo.holiday
                    ? `🎉 School Holiday: ${selectedDayInfo.holiday.name}`
                    : '📅 No attendance recorded on this day'}
                </p>
              </div>
              <button
                onClick={() => setSelectedDayInfo(null)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-white/[0.06] text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
              <span className="font-medium text-slate-300">Present</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" />
              <span className="font-semibold text-red-400">Absent</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_6px_rgba(168,85,247,0.6)]" />
              <span className="font-medium text-slate-300">Holiday</span>
            </div>
          </div>
        </div>

        {/* Subject Breakdown & Announcements (5 Cols) */}
        <div className="md:col-span-5 lg:col-span-5 flex flex-col space-y-5">
          {/* Subject Attendance Breakdown */}
          <div className="rounded-2xl bg-[#0B0F19]/80 border border-white/10 p-5 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <BookOpen size={16} />
                </div>
                <h2 className="text-sm font-bold text-white tracking-tight">Subject Attendance</h2>
              </div>
              <span className="text-[11px] text-slate-400">Estimated</span>
            </div>

            <div className="space-y-3">
              {subjectBreakdown.map((sub) => (
                <div key={sub.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <span>{sub.icon}</span> {sub.name}
                    </span>
                    <span className="font-bold text-blue-400">{sub.percentage}%</span>
                  </div>
                  <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                      style={{ width: `${sub.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Notices Feed */}
          <div className="rounded-2xl bg-[#0B0F19]/80 border border-white/10 p-5 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.2)] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Megaphone size={16} />
                </div>
                <h2 className="text-sm font-bold text-white tracking-tight">School Notices</h2>
              </div>
              <button
                onClick={() => navigate('/messages')}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowUpRight size={12} />
              </button>
            </div>

            <div className="space-y-2">
              {studentNotices.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No notices posted yet.</p>
              ) : (
                studentNotices.map((msg) => (
                  <div
                    key={msg.id}
                    onClick={() => navigate('/messages')}
                    className={`p-3 rounded-xl border transition-all cursor-pointer group ${
                      msg.isUnread
                        ? 'bg-[#111c33]/90 hover:bg-[#162444] border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.06)]'
                        : 'bg-[#111726]/80 hover:bg-[#161F34] border-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {msg.isUnread && (
                          <span
                            className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)] animate-pulse flex-shrink-0"
                            title="New unseen message"
                          />
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full truncate ${
                            (msg.senderRole || '').toLowerCase() === 'teacher'
                              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25'
                              : (msg.senderRole || '').toLowerCase() === 'admin'
                              ? 'bg-purple-500/15 text-purple-400 border border-purple-500/25'
                              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                          }`}
                        >
                          {(msg.senderRole || '').toLowerCase() === 'teacher'
                            ? `👨‍🏫 ${msg.senderName || 'Teacher'}`
                            : (msg.senderRole || '').toLowerCase() === 'admin'
                            ? `🛡️ ${msg.senderName || 'Principal'}`
                            : msg.senderName || 'School Announcement'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 flex-shrink-0">
                        {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed group-hover:text-white">
                      {msg.text || (msg.attachment ? `[Attachment: ${msg.attachment.name || 'File'}]` : '')}
                    </p>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={handlePrintSlip}
              className="mt-4 w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-slate-200 hover:text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Printer size={14} />
              <span>Print Attendance Slip</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
