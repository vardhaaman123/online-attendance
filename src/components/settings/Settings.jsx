import { useState, useEffect } from 'react';
import { Save, Bell, ArrowRight, Building2, ShieldCheck, Lock, Eye, EyeOff, AlertCircle, KeyRound, CheckCircle, LogOut } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Modal from '../ui/Modal';
import PasswordRequirements, { validatePasswordRules } from '../ui/PasswordRequirements';

export default function Settings() {
  const { settings, saveSettings, addToast } = useApp();
  const { logout, user, verifyAdminPassword, changeAdminPassword, updateAdminProfile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getEffectiveCollege = () => {
    if (user?.collegeName && user.collegeName.trim()) return user.collegeName.trim();
    if (settings?.collegeName && settings.collegeName.trim()) return settings.collegeName.trim();
    if (settings?.schoolName && settings.schoolName.trim() && settings.schoolName !== 'Delhi Public School') {
      return settings.schoolName.trim();
    }
    if (user?.email && user.email.toLowerCase().includes('adaepublic')) {
      return 'ADAE Public College';
    }
    return 'College / Institution';
  };

  const getEffectivePrincipal = () => {
    if (user?.principleName && user.principleName.trim()) return user.principleName.trim();
    if (user?.name && user.name.trim() && user.name !== 'Administrator') return user.name.trim();
    if (settings?.principleName && settings.principleName.trim()) return settings.principleName.trim();
    if (settings?.teacherName && settings.teacherName.trim()) return settings.teacherName.trim();
    return 'Principal';
  };

  const adminEmail = user?.email || settings.adminEmail || '';
  const effectiveCollege = getEffectiveCollege();
  const effectivePrincipal = getEffectivePrincipal();

  // Editable Institution Profile state
  const [profileCollege, setProfileCollege] = useState(effectiveCollege);
  const [profilePrincipal, setProfilePrincipal] = useState(effectivePrincipal);
  const [profileEmail, setProfileEmail] = useState(adminEmail);

  const hasProfileChanges =
    profileCollege.trim() !== effectiveCollege.trim() ||
    profilePrincipal.trim() !== effectivePrincipal.trim() ||
    profileEmail.trim().toLowerCase() !== adminEmail.trim().toLowerCase();

  useEffect(() => {
    if (!hasProfileChanges) {
      setProfileCollege(getEffectiveCollege());
      setProfilePrincipal(getEffectivePrincipal());
      setProfileEmail(user?.email || settings.adminEmail || '');
    }
  }, [user, settings, hasProfileChanges]);

  // Institution password confirmation modal states
  const [institutionModalOpen, setInstitutionModalOpen] = useState(false);
  const [institutionPassword, setInstitutionPassword] = useState('');
  const [showInstitutionPw, setShowInstitutionPw] = useState(false);
  const [institutionError, setInstitutionError] = useState('');
  const [savingInstitution, setSavingInstitution] = useState(false);

  const handleOpenInstitutionModal = (e) => {
    if (e) e.preventDefault();
    setInstitutionPassword('');
    setInstitutionError('');
    setShowInstitutionPw(false);
    setInstitutionModalOpen(true);
  };

  const handleConfirmSaveInstitution = async (e) => {
    if (e) e.preventDefault();
    setInstitutionError('');

    if (!institutionPassword) {
      setInstitutionError('Please enter your administrator password.');
      return;
    }

    setSavingInstitution(true);
    try {
      const res = await updateAdminProfile({
        collegeName: profileCollege,
        principleName: profilePrincipal,
        email: profileEmail,
        password: institutionPassword,
      });

      if (res?.success) {
        // Also save other form settings
        saveSettings({
          ...settings,
          ...form,
          schoolName: profileCollege.trim(),
          collegeName: profileCollege.trim(),
          teacherName: profilePrincipal.trim(),
          principleName: profilePrincipal.trim(),
          adminEmail: profileEmail.trim().toLowerCase(),
        });
        addToast('Institution & administrator details updated successfully!', 'success');
        setInstitutionModalOpen(false);
        setInstitutionPassword('');
      } else {
        setInstitutionError(res?.error || 'Failed to update institution details.');
      }
    } catch (err) {
      console.error('Update institution error:', err);
      setInstitutionError('An unexpected error occurred. Please try again.');
    } finally {
      setSavingInstitution(false);
    }
  };

  const [form, setForm] = useState({
    notifications: settings.notifications !== false,
    enableAutoAlerts: settings.enableAutoAlerts || false,
    emailjsServiceId: settings.emailjsServiceId || '',
    emailjsTemplateId: settings.emailjsTemplateId || '',
    emailjsPublicKey: settings.emailjsPublicKey || '',
    teacherPassword: settings.teacherPassword || 'teacher123',
  });

  useEffect(() => {
    setForm((f) => ({
      ...f,
      notifications: settings.notifications !== false,
      enableAutoAlerts: settings.enableAutoAlerts || false,
      emailjsServiceId: settings.emailjsServiceId || f.emailjsServiceId,
      emailjsTemplateId: settings.emailjsTemplateId || f.emailjsTemplateId,
      emailjsPublicKey: settings.emailjsPublicKey || f.emailjsPublicKey,
    }));
  }, [settings]);
  // Admin password change states
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);

    if (!currentPw) {
      setPwError('Please enter your current administrator password.');
      return;
    }
    if (!newPw) {
      setPwError('Please enter a new password.');
      return;
    }
    const pwCheck = validatePasswordRules(newPw);
    if (!pwCheck.allSatisfied) {
      setPwError(`New password must satisfy all requirements: missing ${pwCheck.firstMissing?.label?.toLowerCase() || 'requirements'}.`);
      return;
    }
    if (newPw !== confirmPw) {
      setPwError('Passwords do not match. Please verify your confirm password.');
      return;
    }
    if (newPw === currentPw) {
      setPwError('New password must be different from current password.');
      return;
    }

    setSavingPw(true);
    try {
      const res = await changeAdminPassword(currentPw, newPw);
      if (res?.success) {
        setPwSuccess(true);
        setCurrentPw('');
        setNewPw('');
        setConfirmPw('');
        addToast('Administrator password updated successfully!', 'success');
        setTimeout(() => setPwSuccess(false), 5000);
      } else {
        setPwError(res?.error || 'Failed to update password. Please check your current password.');
      }
    } catch (err) {
      console.error('Password change error:', err);
      setPwError('An unexpected error occurred. Please try again.');
    } finally {
      setSavingPw(false);
    }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (hasProfileChanges) {
      handleOpenInstitutionModal();
      return;
    }

    saveSettings({
      ...settings,
      ...form,
      schoolName: profileCollege.trim() || effectiveCollege,
      collegeName: profileCollege.trim() || effectiveCollege,
      teacherName: profilePrincipal.trim() || effectivePrincipal,
      principleName: profilePrincipal.trim() || effectivePrincipal,
      adminEmail: profileEmail.trim().toLowerCase() || adminEmail,
    });

    addToast('Settings saved successfully.', 'success');
  };

  return (
    <div className="w-full space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Settings</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configure your institution profile, alert automations, and visual preferences.</p>
      </div>

      {/* Administrator Profile Card */}
      <div className="rounded-2xl bg-white dark:bg-[#0B0F19]/80 border border-slate-200/80 dark:border-white/10 p-4 sm:p-5 backdrop-blur-xl shadow-sm dark:shadow-[0_4px_25px_rgba(0,0,0,0.3)] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-bold text-base sm:text-lg flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.35)] border border-violet-400/30 flex-shrink-0">
            {(effectivePrincipal || 'V').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">{effectivePrincipal}</h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/25">
                <ShieldCheck size={12} /> Admin
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {effectiveCollege} {adminEmail ? `• ${adminEmail}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Verified Administrator
          </span>
        </div>
      </div>

      {/* 2-Column Responsive Settings Grid for Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Institution & Administrator Information */}
        <div className="rounded-2xl bg-white dark:bg-[#0B0F19]/80 border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 backdrop-blur-xl shadow-sm dark:shadow-[0_4px_25px_rgba(0,0,0,0.3)] space-y-5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 dark:text-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.15)]">
              <Building2 size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Institution & Administrator Details</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Password protected institution & login profile</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-semibold">
            <KeyRound size={11} /> Password Protected
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                College Name
              </label>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium bg-slate-100 dark:bg-white/[0.05] px-2 py-0.5 rounded-md border border-slate-200 dark:border-white/10">
                Editable (Requires Admin Password)
              </span>
            </div>
            <input
              className="input-field w-full text-slate-900 dark:text-white font-medium"
              value={profileCollege}
              onChange={(e) => setProfileCollege(e.target.value)}
              placeholder="Enter College Name"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                Principle Name
              </label>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium bg-slate-100 dark:bg-white/[0.05] px-2 py-0.5 rounded-md border border-slate-200 dark:border-white/10">
                Editable (Requires Admin Password)
              </span>
            </div>
            <input
              className="input-field w-full text-slate-900 dark:text-white font-medium"
              value={profilePrincipal}
              onChange={(e) => setProfilePrincipal(e.target.value)}
              placeholder="Enter Principle Name"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                Admin Email ID (Registered Login Account)
              </label>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium bg-slate-100 dark:bg-white/[0.05] px-2 py-0.5 rounded-md border border-slate-200 dark:border-white/10">
                Editable (Requires Admin Password)
              </span>
            </div>
            <input
              className="input-field w-full text-slate-900 dark:text-white font-medium"
              value={profileEmail}
              onChange={(e) => setProfileEmail(e.target.value)}
              placeholder="Enter Admin Email ID"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-white/10">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Lock size={12} className="text-amber-500 dark:text-amber-400" />
            Any changes require administrator password verification.
          </p>
          <button
            type="button"
            onClick={handleOpenInstitutionModal}
            disabled={!hasProfileChanges}
            className="btn-primary text-xs py-2 px-4 self-end sm:self-auto disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldCheck size={14} />
            Save Institution Details
          </button>
        </div>

        <div className="p-4 bg-blue-50/50 dark:bg-blue-500/[0.06] border border-blue-200/60 dark:border-blue-500/20 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <p className="text-xs font-semibold text-blue-950 dark:text-blue-200">Teacher Account Management</p>
            <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 mt-0.5">
              Teachers log in with their Email ID and Password. You can add, edit, and assign teachers in the dedicated Teachers section.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/teachers')}
            className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 shrink-0 self-start sm:self-auto min-h-[36px] cursor-pointer"
          >
            Go to Teachers <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* Administrator Password & Security */}
      <div className="rounded-2xl bg-white dark:bg-[#0B0F19]/80 border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 backdrop-blur-xl shadow-sm dark:shadow-[0_4px_25px_rgba(0,0,0,0.3)] space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 dark:text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
              <KeyRound size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Admin Password & Security</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Update your administrator account password</p>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-semibold">
            <Lock size={12} /> Security Credentials
          </span>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4 pt-1">
          {/* Current Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Current Password *
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type={showCurrentPw ? 'text' : 'password'}
                value={currentPw}
                onChange={(e) => { setCurrentPw(e.target.value); setPwError(''); setPwSuccess(false); }}
                placeholder="Enter current password"
                className="input-field pl-10 pr-10 w-full"
                disabled={savingPw}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPw((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                {showCurrentPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                New Password *
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPw}
                  onChange={(e) => { setNewPw(e.target.value); setPwError(''); setPwSuccess(false); }}
                  placeholder="Min. 6 characters"
                  className="input-field pl-10 pr-10 w-full"
                  disabled={savingPw}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              <PasswordRequirements password={newPw} />
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Confirm New Password *
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  value={confirmPw}
                  onChange={(e) => { setConfirmPw(e.target.value); setPwError(''); setPwSuccess(false); }}
                  placeholder="Re-enter new password"
                  className="input-field pl-10 pr-10 w-full"
                  disabled={savingPw}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  {showConfirmPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {confirmPw && newPw && (
                <p className={`text-[11px] mt-1.5 font-semibold ${confirmPw === newPw ? 'text-emerald-500' : 'text-rose-400'}`}>
                  {confirmPw === newPw ? '✓ Passwords match' : '✗ Passwords do not match'}
                </p>
              )}
            </div>
          </div>

          {/* Error Message */}
          {pwError && (
            <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2.5 text-xs text-rose-500 dark:text-rose-400">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{pwError}</span>
            </div>
          )}

          {/* Success Message */}
          {pwSuccess && (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle size={14} className="flex-shrink-0" />
              <span>Administrator password updated successfully! Changes apply across all devices.</span>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={savingPw || !currentPw || !newPw || !confirmPw}
              className="btn-primary text-xs disabled:opacity-50"
            >
              <ShieldCheck size={14} />
              {savingPw ? 'Updating Password...' : 'Update Admin Password'}
            </button>
          </div>
        </form>
      </div>

      {/* Automated Alerts (EmailJS) */}
      <div className="rounded-2xl bg-white dark:bg-[#0B0F19]/80 border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 backdrop-blur-xl shadow-sm dark:shadow-[0_4px_25px_rgba(0,0,0,0.3)] space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 dark:text-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.15)]">
            <Bell size={16} />
          </div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Automated Absent Alerts</h2>
        </div>

        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">Auto-Send Email & SMS</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Automatically notify parents when a student is marked absent.</p>
          </div>
          <button
            onClick={() => set('enableAutoAlerts', !form.enableAutoAlerts)}
            className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${form.enableAutoAlerts ? 'bg-gradient-to-r from-blue-600 to-cyan-500 shadow-[0_0_12px_rgba(59,130,246,0.3)]' : 'bg-slate-200 dark:bg-white/10'}`}
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${form.enableAutoAlerts ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {form.enableAutoAlerts && (
          <div className="space-y-4 animate-slide-up">
            <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 p-3.5 rounded-xl">
              To send automated emails, create a free account at <a href="https://emailjs.com" target="_blank" rel="noreferrer" className="text-blue-500 underline font-semibold">emailjs.com</a>. SMS notification uses simulated parent delivery.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">EmailJS Service ID</label>
              <input
                className="input-field"
                value={form.emailjsServiceId}
                onChange={e => set('emailjsServiceId', e.target.value)}
                placeholder="service_xxxxx"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">EmailJS Template ID</label>
              <input
                className="input-field"
                value={form.emailjsTemplateId}
                onChange={e => set('emailjsTemplateId', e.target.value)}
                placeholder="template_xxxxx"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">EmailJS Public Key</label>
              <input
                className="input-field"
                value={form.emailjsPublicKey}
                onChange={e => set('emailjsPublicKey', e.target.value)}
                placeholder="public_key_xxxxx"
              />
            </div>
          </div>
        )}
      </div>

      {/* System Preferences & Notifications */}
      <div className="rounded-2xl bg-white dark:bg-[#0B0F19]/80 border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 backdrop-blur-xl shadow-sm dark:shadow-[0_4px_25px_rgba(0,0,0,0.3)] space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 dark:text-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.15)]">
            <Bell size={16} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">System Preferences & Notifications</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Application visual appearance & notification settings</p>
          </div>
        </div>

        <div className="space-y-4 divide-y divide-slate-100 dark:divide-white/5">
          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">Dark Obsidian Theme</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Permanent high-contrast dark theme active across all devices</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold">
              ✓ Active
            </span>
          </div>

          <div className="flex items-center justify-between pt-4">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">Toast Notifications</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Show confirmation popups for user actions</p>
            </div>
            <button
              onClick={() => set('notifications', !form.notifications)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${form.notifications ? 'bg-gradient-to-r from-blue-600 to-cyan-500 shadow-[0_0_12px_rgba(59,130,246,0.3)]' : 'bg-slate-200 dark:bg-white/10'}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${form.notifications ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>
      </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-1">
        <button onClick={handleSave} className="btn-primary w-full sm:w-auto text-sm py-2.5 px-6 shadow-md shadow-blue-500/20 cursor-pointer">
          <Save size={16} /> Save All Changes
        </button>
      </div>

      {/* Account Session & Sign Out */}
      <div className="rounded-2xl bg-white dark:bg-[#0B0F19]/80 border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 backdrop-blur-xl shadow-sm dark:shadow-[0_4px_25px_rgba(0,0,0,0.3)] space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.15)]">
            <LogOut size={16} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Account Session</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Sign out of your active administrator account</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">Active Session</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Currently logged in as <span className="font-semibold text-slate-700 dark:text-slate-200">{adminEmail || effectivePrincipal || 'Administrator'}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-500 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 transition-all duration-200 cursor-pointer shadow-xs active:scale-95 shrink-0"
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </div>


      {/* Institution Details Password Confirmation Modal */}
      <Modal
        open={institutionModalOpen}
        onClose={() => !savingInstitution && setInstitutionModalOpen(false)}
        title="Verify Password to Save Changes"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleConfirmSaveInstitution} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-start gap-2.5">
            <KeyRound size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-amber-700 dark:text-amber-300">Administrator Authorization Required</p>
              <p className="leading-relaxed">
                You are updating institution and administrator profile details. Enter your administrator password to authorize and apply these changes.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Admin Password *
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type={showInstitutionPw ? 'text' : 'password'}
                value={institutionPassword}
                onChange={(e) => { setInstitutionPassword(e.target.value); setInstitutionError(''); }}
                placeholder="Enter your admin password"
                className="input-field pl-10 pr-10 w-full"
                disabled={savingInstitution}
                autoFocus
                required
              />
              <button
                type="button"
                onClick={() => setShowInstitutionPw((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                {showInstitutionPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {institutionError && (
            <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2.5 text-xs text-rose-500 dark:text-rose-400">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{institutionError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-white/10">
            <button
              type="button"
              disabled={savingInstitution}
              onClick={() => setInstitutionModalOpen(false)}
              className="btn-secondary text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingInstitution || !institutionPassword.trim()}
              className="btn-primary text-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck size={14} />
              {savingInstitution ? 'Verifying & Saving...' : 'Verify & Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
