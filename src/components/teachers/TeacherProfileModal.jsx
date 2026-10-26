import { useState } from 'react';
import { Phone, Mail, BookOpen, Award, Edit2, Key, Eye, EyeOff, Copy, Check } from 'lucide-react';
import Modal from '../ui/Modal';
import { useApp } from '../../context/AppContext';
import { getTeacherScope } from '../../utils/teacherScope';

export default function TeacherProfileModal({ open, teacher, onClose, onEdit }) {
  const { students, teachers } = useApp();
  const [showPassword, setShowPassword] = useState(false);
  const [copiedPw, setCopiedPw] = useState(false);

  if (!teacher) return null;

  // Resolve live teacher record from AppContext so updates in real-time
  const liveTeacher =
    (teachers || []).find(
      (t) =>
        (t.id && (t.id === teacher.id || t._docId === teacher.id)) ||
        (t.email && teacher.email && t.email.trim().toLowerCase() === teacher.email.trim().toLowerCase())
    ) || teacher;

  const initials = (liveTeacher.name || 'T').split(' ').map(n => n[0]).join('').slice(0, 2);
  const avatarHue = ((liveTeacher.name || 'T').charCodeAt(0) * 53) % 360;
  const currentPassword = liveTeacher.password || 'teacher123';

  const teacherScope = getTeacherScope(liveTeacher, 'teacher');
  const assignedStudents = teacherScope.filterStudents(students || []);

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(currentPassword);
    setCopiedPw(true);
    setTimeout(() => setCopiedPw(false), 2000);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Teacher Details"
      maxWidth="max-w-md"
      footer={
        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs cursor-pointer"
          >
            Close
          </button>
          {onEdit && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(liveTeacher);
              }}
              className="btn-primary text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-500/20"
            >
              <Edit2 size={13} />
              <span>Edit Teacher</span>
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4 sm:space-y-5">
        {/* Header with Avatar, Name, ID, and Status */}
        <div className="flex items-center gap-3.5 p-3.5 sm:p-4 bg-slate-50 dark:bg-[#111726] border border-slate-200/80 dark:border-white/10 rounded-2xl">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-base font-bold flex-shrink-0 shadow-md"
            style={{ background: `hsl(${avatarHue}, 65%, 48%)` }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">{liveTeacher.name}</h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Active
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{liveTeacher.id}</p>
          </div>
        </div>

        {/* Assigned Class & Subject Info Pills */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
            <span className="text-[10px] font-semibold uppercase text-blue-400 block">Assigned Class</span>
            <span className="text-sm sm:text-base font-bold text-blue-300 block mt-0.5">
              Class {liveTeacher.class}-{liveTeacher.section}
            </span>
          </div>

          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-center">
            <span className="text-[10px] font-semibold uppercase text-purple-400 block">Subject</span>
            <span className="text-sm sm:text-base font-bold text-purple-300 block mt-0.5 truncate">
              {liveTeacher.subject || 'General'}
            </span>
          </div>
        </div>

        {/* Live-Synced Password Box */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/25 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0">
              <Key size={15} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Login Password</span>
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                  Live Synced
                </span>
              </div>
              <p className="text-sm font-mono font-bold text-slate-900 dark:text-white tracking-wider mt-0.5">
                {showPassword ? currentPassword : '••••••••'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
            <button
              type="button"
              onClick={handleCopyPassword}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Copy password"
            >
              {copiedPw ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
            </button>
          </div>
        </div>

        {/* Detailed Info List Box */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#111726] border border-slate-200/80 dark:border-white/10 space-y-2">
          {[
            [Mail, 'Email Address', liveTeacher.email],
            [Phone, 'Contact Number', liveTeacher.contact || 'Not provided'],
            [BookOpen, 'Assigned Division', `Class ${liveTeacher.class} - Section ${liveTeacher.section}`],
            [Award, 'Students in Assigned Class', `${assignedStudents.length} Students`],
          ].map(([Icon, label, val]) => (
            <div key={label} className="flex items-center gap-3 p-2 rounded-xl bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/50 dark:border-white/5">
              <div className="w-7 h-7 rounded-lg bg-white dark:bg-white/5 border border-slate-200/50 dark:border-white/10 flex items-center justify-center flex-shrink-0 text-slate-500 dark:text-slate-400">
                <Icon size={13} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">{label}</p>
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{val || '—'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
