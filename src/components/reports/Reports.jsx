import { useMemo } from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, BarChart2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  getWeeklyData, getMonthlyData, getClassComparison, getLowAttendanceStudents
} from '../../utils/attendanceCalc';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 dark:bg-[#0E1422]/95 border border-slate-200 dark:border-white/15 rounded-xl shadow-2xl px-3.5 py-2 backdrop-blur-2xl">
        <p className="text-xs font-semibold text-slate-800 dark:text-white mb-1">{label}</p>
        {payload.map(p => (
          <p key={p.name} className="text-xs font-bold flex items-center gap-1.5" style={{ color: p.color }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
            {p.name}: {p.value}%
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Reports() {
  const { students, attendanceRecords } = useApp();

  const weeklyData = useMemo(() => getWeeklyData(students, attendanceRecords), [students, attendanceRecords]);
  const monthlyData = useMemo(() => getMonthlyData(students, attendanceRecords), [students, attendanceRecords]);
  const classComparison = useMemo(() => getClassComparison(students, attendanceRecords), [students, attendanceRecords]);
  const lowAttendance = useMemo(() => getLowAttendanceStudents(students, attendanceRecords), [students, attendanceRecords]);

  const avgWeekly = weeklyData.length > 0
    ? Math.round(weeklyData.reduce((a, b) => a + b.percentage, 0) / weeklyData.length)
    : 0;

  const avgMonthly = monthlyData.length > 0
    ? Math.round(monthlyData.reduce((a, b) => a + b.percentage, 0) / monthlyData.length)
    : 0;

  return (
    <div className="w-full space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Reports & Analytics</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Comprehensive attendance insights, metrics and historical trends.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Weekly Avg', value: `${avgWeekly}%`, sub: 'Last 5 working days', color: 'text-blue-600 dark:text-blue-400', glow: 'dark:shadow-[0_0_20px_rgba(59,130,246,0.1)]' },
          { label: 'Monthly Avg', value: `${avgMonthly}%`, sub: 'Last 6 months', color: 'text-emerald-600 dark:text-emerald-400', glow: 'dark:shadow-[0_0_20px_rgba(16,185,129,0.1)]' },
          { label: 'Low Attendance', value: lowAttendance.length, sub: 'Below 75% threshold', color: 'text-rose-600 dark:text-rose-400', glow: 'dark:shadow-[0_0_20px_rgba(244,63,94,0.1)]' },
          { label: 'Total Records', value: Object.keys(attendanceRecords || {}).length, sub: 'Saved sessions', color: 'text-amber-600 dark:text-amber-400', glow: 'dark:shadow-[0_0_20px_rgba(245,158,11,0.1)]' },
        ].map(({ label, value, sub, color, glow }) => (
          <div key={label} className={`rounded-2xl bg-white dark:bg-[#0B0F19]/80 border border-slate-200/80 dark:border-white/10 p-5 backdrop-blur-xl shadow-sm dark:shadow-[0_4px_25px_rgba(0,0,0,0.3)] ${glow} relative overflow-hidden group hover:scale-[1.02] transition-all duration-300`}>
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent dark:via-blue-400/40 opacity-0 group-hover:opacity-100 transition-opacity" />
            <p className={`text-2xl sm:text-3xl font-bold ${color} mb-1 tracking-tight`}>{value}</p>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Weekly */}
        <div className="rounded-2xl bg-white dark:bg-[#0B0F19]/80 border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 backdrop-blur-xl shadow-sm dark:shadow-[0_4px_25px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Weekly Attendance</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Last 5 working days</p>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-xl border ${
              avgWeekly >= 85 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
            }`}>
              {avgWeekly >= 85 ? <TrendingUp size={13} className="inline mr-1" /> : <TrendingDown size={13} className="inline mr-1" />}
              {avgWeekly}% avg
            </span>
          </div>
          {weeklyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis domain={[60, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.08)', radius: 6 }} />
                <Bar dataKey="percentage" name="Attendance" fill="#3B82F6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">No attendance data yet</div>
          )}
        </div>

        {/* Monthly trend */}
        <div className="rounded-2xl bg-white dark:bg-[#0B0F19]/80 border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 backdrop-blur-xl shadow-sm dark:shadow-[0_4px_25px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Monthly Trend</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Last 6 months</p>
            </div>
          </div>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis domain={[60, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="percentage"
                  name="Attendance"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  dot={{ fill: '#3B82F6', r: 4, strokeWidth: 2, stroke: '#0B0F19' }}
                  activeDot={{ r: 6, fill: '#60A5FA', stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">No trend data yet</div>
          )}
        </div>
      </div>

      {/* Class comparison + Low attendance */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Class comparison */}
        <div className="rounded-2xl bg-white dark:bg-[#0B0F19]/80 border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 backdrop-blur-xl shadow-sm dark:shadow-[0_4px_25px_rgba(0,0,0,0.3)]">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-0.5">Class Comparison</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Overall attendance percentage by class</p>
          {classComparison.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={classComparison} layout="vertical" barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="class" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={60} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }} />
                <Bar dataKey="percentage" name="Attendance" radius={[0, 6, 6, 0]}>
                  {classComparison.map((entry, i) => (
                    <rect key={i} fill={['#3B82F6', '#10B981', '#F59E0B'][i % 3]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">No data yet</div>
          )}

          {/* Detailed bars */}
          <div className="mt-4 space-y-3 pt-3 border-t border-slate-100 dark:border-white/5">
            {classComparison.map((c, i) => {
              const gradients = [
                'from-blue-600 to-cyan-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]',
                'from-emerald-600 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]',
                'from-amber-500 to-yellow-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
              ];
              const pct = c.percentage;
              return (
                <div key={c.class} className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-800 dark:text-white w-16">{c.class}</span>
                  <div className="flex-1 h-2 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${gradients[i % 3]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white w-10 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Low attendance */}
        <div className="rounded-2xl bg-white dark:bg-[#0B0F19]/80 border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 backdrop-blur-xl shadow-sm dark:shadow-[0_4px_25px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20">
                <AlertTriangle size={15} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Low Attendance Students</h3>
                <p className="text-[11px] text-slate-400">Students requiring intervention (&lt;75%)</p>
              </div>
            </div>
            <span className="text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-semibold px-2.5 py-1 rounded-full">
              {lowAttendance.length} students
            </span>
          </div>

          {lowAttendance.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-2 text-emerald-500">
                <TrendingUp size={22} />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">All students above 75%!</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Outstanding consistency across all classrooms.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {lowAttendance.map(s => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-rose-500/20 bg-rose-500/[0.04] hover:bg-rose-500/[0.08] transition-colors">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm"
                    style={{ background: `hsl(${(s.rollNumber?.charCodeAt(0)||65) * 47 % 360}, 60%, 50%)` }}>
                    {s.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{s.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Class {s.class}-{s.section}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-rose-600 dark:text-rose-400">{s.percentage}%</p>
                    <p className="text-[10px] text-slate-400">{s.absent}A / {s.total}D</p>
                  </div>
                  <div className="w-12 sm:w-16 flex-shrink-0">
                    <div className="h-1.5 bg-rose-100 dark:bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.4)]" style={{ width: `${s.percentage}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
