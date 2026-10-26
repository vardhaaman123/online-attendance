import { useState, useEffect } from 'react';
import { Eye, EyeOff, ShieldCheck, ShieldAlert } from 'lucide-react';
import Modal from '../ui/Modal';
import CustomSelect from '../ui/CustomSelect';
import { useApp } from '../../context/AppContext';
import { getUserLookup } from '../../services/firestoreService';
import PasswordRequirements, { validatePasswordRules } from '../ui/PasswordRequirements';

const defaultForm = {
  name: '',
  email: '',
  class: '10',
  section: 'A',
  subject: '',
  contact: '',
  status: 'active',
  password: 'teacher123',
};

export default function AddEditTeacherModal({ open, teacher, onClose }) {
  const { teachers, addTeacher, updateTeacher, addToast, students } = useApp();
  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const liveTeacher = teacher
    ? (teachers || []).find(
        (t) =>
          (t.id && (t.id === teacher.id || t._docId === teacher.id)) ||
          (teacher.email && t.email && t.email.trim().toLowerCase() === teacher.email.trim().toLowerCase()) ||
          (teacher.name && t.name && t.name.trim().toLowerCase() === teacher.name.trim().toLowerCase())
      ) || teacher
    : null;

  useEffect(() => {
    if (liveTeacher) {
      const cleanEmail = liveTeacher.email ? liveTeacher.email.trim().toLowerCase() : '';
      const initialPw = liveTeacher.password || 'teacher123';
      setForm({ ...defaultForm, ...liveTeacher, password: initialPw });
      if (cleanEmail) {
        getUserLookup(cleanEmail)
          .then((lookup) => {
            if (lookup?.password) {
              setForm((prev) => ({ ...prev, password: lookup.password }));
            }
          })
          .catch(() => {});
      }
    } else {
      setForm(defaultForm);
    }
    setErrors({});
  }, [teacher, liveTeacher?.id, liveTeacher?.password, open]);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: '' }));
  };

  const [saving, setSaving] = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.name || !form.name.trim()) errs.name = 'Full name is required';
    const cleanEmail = (form.email || '').trim().toLowerCase();
    if (!cleanEmail) {
      errs.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(cleanEmail)) {
      errs.email = 'Enter a valid email address';
    } else {
      // Check duplicate email (excluding current teacher if editing)
      const currentTeacherId = teacher?.id || teacher?._docId;
      const existing = (teachers || []).find(
        t => t.email && t.email.toLowerCase().trim() === cleanEmail && (t.id || t._docId) !== currentTeacherId
      );
      if (existing) {
        errs.email = 'A teacher with this email already exists';
      }
    }
    if (!form.class || !String(form.class).trim()) errs.class = 'Class is required';
    if (!form.section || !String(form.section).trim()) errs.section = 'Division / Section is required';

    // Password conditions check
    const trimmedPw = (form.password || '').trim();
    if (!trimmedPw) {
      errs.password = 'Password cannot be empty. Use teacher123 for default or enter a secure password.';
    } else if (trimmedPw !== 'teacher123') {
      const pwCheck = validatePasswordRules(trimmedPw);
      if (!pwCheck.allSatisfied) {
        errs.password = `Password rejected: Must satisfy all security conditions (${pwCheck.firstMissing?.label?.toLowerCase() || 'missing requirements'}).`;
      }
    }

    return errs;
  };

  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      if (errs.password) {
        addToast(errs.password, 'error');
      }
      return;
    }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      class: String(form.class).trim(),
      section: form.section.trim().toUpperCase(),
      subject: (form.subject || '').trim(),
      contact: (form.contact || '').trim(),
      status: form.status || 'active',
      password: (form.password || 'teacher123').trim(),
    };

    setSaving(true);
    try {
      if (teacher) {
        await updateTeacher(teacher.id || teacher._docId, payload);
        addToast(`Teacher ${payload.name} updated successfully.`, 'success');
      } else {
        await addTeacher(payload);
        addToast(`Teacher ${payload.name} registered successfully.`, 'success');
      }
      onClose();
    } catch (err) {
      console.error('[AddEditTeacherModal] Save error:', err);
      addToast('Error saving teacher. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={teacher ? 'Edit Teacher Details' : 'Add New Teacher'}
      maxWidth="max-w-xl sm:max-w-2xl"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary px-6 py-2.5 text-xs font-semibold cursor-pointer shadow-lg shadow-blue-500/25"
          >
            {saving ? 'Saving...' : teacher ? 'Update Teacher' : 'Add Teacher'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Uniform 8-Box 2-Column Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 1. Full Name */}
          <div className="flex flex-col">
            <div className="h-5 flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Full Name <span className="text-rose-400">*</span>
              </label>
            </div>
            <input
              className={`input-field h-11 ${errors.name ? 'border-red-400 focus:border-red-500' : ''}`}
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Mrs. Priya Sharma"
            />
            {errors.name && <p className="text-[11px] text-red-400 mt-1">{errors.name}</p>}
          </div>

          {/* 2. Email */}
          <div className="flex flex-col">
            <div className="h-5 flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Email Address <span className="text-rose-400">*</span>
              </label>
            </div>
            <input
              type="email"
              className={`input-field h-11 ${errors.email ? 'border-red-400 focus:border-red-500' : ''}`}
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="priya.sharma@school.edu"
            />
            {errors.email && <p className="text-[11px] text-red-400 mt-1">{errors.email}</p>}
          </div>

          {/* 3. Assigned Class */}
          <div className="flex flex-col">
            <div className="h-5 flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Assigned Class <span className="text-rose-400">*</span>
              </label>
            </div>
            <input
              list="teacher-class-options"
              className={`input-field h-11 ${errors.class ? 'border-red-400 focus:border-red-500' : ''}`}
              value={form.class}
              onChange={e => set('class', e.target.value)}
              placeholder="e.g. 10"
            />
            <datalist id="teacher-class-options">
              {Array.from(new Set([...(students || []).map(s => s.class), '8', '9', '10'])).sort((a,b)=>a.localeCompare(b, undefined, {numeric: true})).map(c => <option key={c} value={c} />)}
            </datalist>
            {errors.class && <p className="text-[11px] text-red-400 mt-1">{errors.class}</p>}
          </div>

          {/* 4. Division / Section */}
          <div className="flex flex-col">
            <div className="h-5 flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Division / Section <span className="text-rose-400">*</span>
              </label>
            </div>
            <input
              list="teacher-section-options"
              className={`input-field h-11 ${errors.section ? 'border-red-400 focus:border-red-500' : ''}`}
              value={form.section}
              onChange={e => set('section', e.target.value)}
              placeholder="e.g. A"
            />
            <datalist id="teacher-section-options">
              {Array.from(new Set([...(students || []).map(s => s.section), 'A', 'B'])).sort().map(s => <option key={s} value={s} />)}
            </datalist>
            {errors.section && <p className="text-[11px] text-red-400 mt-1">{errors.section}</p>}
          </div>

          {/* 5. Subject */}
          <div className="flex flex-col">
            <div className="h-5 flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Subject (Optional)
              </label>
            </div>
            <input
              className="input-field h-11"
              value={form.subject}
              onChange={e => set('subject', e.target.value)}
              placeholder="e.g. Mathematics"
            />
          </div>

          {/* 6. Contact Number */}
          <div className="flex flex-col">
            <div className="h-5 flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Contact Number (Optional)
              </label>
            </div>
            <input
              className="input-field h-11"
              value={form.contact}
              onChange={e => set('contact', e.target.value)}
              placeholder="e.g. 9876543210"
            />
          </div>

          {/* 7. Teacher Login Password */}
          <div className="flex flex-col">
            <div className="h-5 flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Teacher Login Password
              </label>
              {form.password?.trim() === 'teacher123' ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Default (teacher123)
                </span>
              ) : form.password ? (
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors ${
                    validatePasswordRules(form.password).allSatisfied
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-red-500/15 text-red-400 border border-red-500/30'
                  }`}
                >
                  {validatePasswordRules(form.password).allSatisfied ? (
                    <>
                      <ShieldCheck size={11} className="text-emerald-400" />
                      <span>Allowed</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert size={11} className="text-red-400" />
                      <span>Rejected</span>
                    </>
                  )}
                </span>
              ) : null}
            </div>

            <div className="relative">
              <input
                className={`input-field h-11 font-mono pr-10 transition-colors ${
                  errors.password
                    ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/30'
                    : form.password && form.password.trim() !== 'teacher123'
                    ? validatePasswordRules(form.password).allSatisfied
                      ? 'border-emerald-500 focus:border-emerald-500 ring-1 ring-emerald-500/20'
                      : 'border-red-400/80 focus:border-red-500 ring-1 ring-red-500/20'
                    : ''
                }`}
                type={showPassword ? 'text' : 'password'}
                value={form.password || ''}
                onChange={e => set('password', e.target.value)}
                placeholder="teacher123"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-[11px] text-red-400 font-medium mt-1 flex items-center gap-1">
                <ShieldAlert size={12} className="shrink-0 text-red-400" />
                <span>{errors.password}</span>
              </p>
            )}
          </div>

          {/* 8. Account Status */}
          <div className="flex flex-col">
            <div className="h-5 flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Account Status
              </label>
            </div>
            <select
              className="input-field h-11 cursor-pointer bg-[#0B0F1A]"
              value={form.status || 'active'}
              onChange={e => set('status', e.target.value)}
            >
              <option value="active">Active Faculty Member</option>
              <option value="on-leave">On Leave / Extended Absence</option>
              <option value="inactive">Inactive / Suspended</option>
            </select>
          </div>
        </div>

        {/* Security Rule / Hint Banner */}
        {form.password?.trim() === 'teacher123' ? (
          <p className="text-[11px] text-slate-400 mt-1">
            Teacher uses this to log in to their portal. Default credentials: <span className="font-mono text-blue-400 font-semibold">teacher123</span>
          </p>
        ) : (
          <div className="mt-2.5 p-3 rounded-2xl bg-white/[0.02] border border-white/10">
            <PasswordRequirements password={form.password || ''} showHeader={true} />
          </div>
        )}
      </div>
    </Modal>
  );
}
