import { UserCircle, Phone, Mail, Hash, BookOpen, Users, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';

export default function StudentProfile() {
  const { currentStudent } = useAuth();
  const { settings } = useApp();

  if (!currentStudent) return null;

  const fields = [
    { icon: Hash,       label: 'Roll Number',       value: currentStudent.rollNumber || '01' },
    { icon: BookOpen,   label: 'Class & Section',   value: `Class ${currentStudent.class} - Section ${currentStudent.section}` },
    { icon: Users,      label: 'Institution',       value: settings.collegeName || settings.schoolName || 'Institution' },
    { icon: UserCircle, label: 'Parent / Guardian', value: currentStudent.parentName || '—' },
    { icon: Phone,      label: "Parent's Contact",  value: currentStudent.contact || '—' },
    { icon: Mail,       label: "Parent's Email",    value: currentStudent.email || '—' },
  ];

  return (
    <div className="w-full max-w-2xl sm:max-w-3xl mx-auto space-y-5 animate-fade-in text-slate-100 pb-10">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Student Profile</h1>
        <p className="text-xs text-slate-400 mt-0.5">Verified academic and personal records on file.</p>
      </div>

      {/* Avatar card */}
      <div className="rounded-2xl bg-[#0B0F19]/80 border border-white/10 p-5 backdrop-blur-xl shadow-[0_4px_25px_rgba(0,0,0,0.3)] flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 border border-blue-400/30 flex items-center justify-center text-2xl font-extrabold text-white flex-shrink-0 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
          {currentStudent.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white truncate">{currentStudent.name}</h2>
            <ShieldCheck size={16} className="text-blue-400 flex-shrink-0" />
          </div>
          <p className="text-xs text-slate-400">Class {currentStudent.class}-{currentStudent.section} Student</p>
          <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            currentStudent.status === 'active'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}>
            {currentStudent.status === 'active' ? '✅ Active Enrolled Student' : '⚠️ Inactive'}
          </span>
        </div>
      </div>

      {/* Details List */}
      <div className="rounded-2xl bg-[#0B0F19]/80 border border-white/10 p-0 backdrop-blur-xl shadow-[0_4px_25px_rgba(0,0,0,0.3)] overflow-hidden">
        {fields.map(({ icon: Icon, label, value }, i) => (
          <div
            key={label}
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3 px-4 sm:px-5 py-3 sm:py-3.5 ${
              i < fields.length - 1 ? 'border-b border-white/[0.06]' : ''
            }`}
          >
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
                <Icon size={15} />
              </div>
              <span className="text-xs text-slate-400 sm:w-36 flex-shrink-0 font-medium">{label}</span>
            </div>
            <span className="text-xs sm:text-sm font-semibold text-slate-200 sm:text-right flex-1 min-w-0 break-words pl-10 sm:pl-0 pr-2">
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
