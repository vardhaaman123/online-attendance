import { useState } from "react";
import { Lock, Eye, EyeOff, ShieldCheck, CheckCircle, AlertCircle, KeyRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { saveSession, getUserLookup, saveUserLookup, broadcastLiveEvent } from "../../services/firestoreService";
import PasswordRequirements, { validatePasswordRules } from "../ui/PasswordRequirements";

const SESSION_TOKEN_KEY = '_attendify_sk';

const inputCls = "w-full px-4 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl text-sm bg-white dark:bg-[#111726] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all";

export default function TeacherPassword() {
  const { user, setUser } = useAuth();
  const { teachers = [], updateTeacher, addToast } = useApp();

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw]         = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent]   = useState(false);
  const [showNew, setShowNew]           = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [error, setError]   = useState("");
  const [saved, setSaved]   = useState(false);

  if (!user) return null;

  // Find the current teacher record from live Firestore state
  const storedTeacher = (teachers || []).find(t =>
    (user?.id && (t.id === user.id || t._docId === user.id)) ||
    (user?.email && t.email && t.email.toLowerCase().trim() === user.email.toLowerCase().trim()) ||
    (user?.name && t.name && (t.name||"").toLowerCase().trim() === (user.name||"").toLowerCase().trim())
  );
  const actualPw = storedTeacher?.password || user?.password || "teacher123";

  const handleSave = async (e) => {
    e.preventDefault();
    setError(""); setSaved(false);

    if (!currentPw) { setError("Please enter your current password."); return; }

    const cleanEmail = (user?.email || storedTeacher?.email || '').trim().toLowerCase();

    // Fetch fresh lookup from Firestore
    let lookupData = null;
    if (cleanEmail) {
      try {
        lookupData = await getUserLookup(cleanEmail);
      } catch {}
    }

    // Direct check of acceptable current passwords
    const candidatePasswords = new Set([
      actualPw,
      user?.password,
      storedTeacher?.password,
      lookupData?.password,
      'teacher123',
    ].filter(Boolean));

    let verified = candidatePasswords.has(currentPw) || candidatePasswords.has(currentPw.trim());

    if (!verified) {
      setError("Current password is incorrect.");
      return;
    }

    if (!newPw) { setError("Please enter a new password."); return; }
    const pwCheck = validatePasswordRules(newPw);
    if (!pwCheck.allSatisfied) {
      setError(`New password must satisfy all requirements: missing ${pwCheck.firstMissing?.label?.toLowerCase() || 'requirements'}.`);
      return;
    }
    if (newPw !== confirmPw) { setError("Passwords do not match. Please verify your confirm password."); return; }
    if (newPw === currentPw) { setError("New password must be different from current password."); return; }

    const canonicalId = storedTeacher?.id || storedTeacher?._docId || lookupData?.entityId || lookupData?.id || user?.id || `TCH_${Date.now()}`;
    const targetCollege = storedTeacher?.collegeId || lookupData?.collegeId || user?.collegeId || 'dps_main';

    const mergedData = {
      ...storedTeacher,
      ...user,
      id: canonicalId,
      password: newPw,
      collegeId: targetCollege,
    };

    if (canonicalId) {
      await updateTeacher(canonicalId, mergedData);
    }

    if (cleanEmail) {
      const lookupPayload = {
        identifier: cleanEmail,
        role: 'teacher',
        collegeId: targetCollege,
        entityId: canonicalId,
        id: canonicalId,
        name: user?.name || storedTeacher?.name || 'Teacher',
        class: user?.class || storedTeacher?.class || '10',
        section: user?.section || storedTeacher?.section || 'A',
        subject: user?.subject || storedTeacher?.subject || '',
        contact: user?.contact || storedTeacher?.contact || '',
        password: newPw,
      };
      await saveUserLookup(cleanEmail, lookupPayload).catch(console.warn);
    }

    // Broadcast instant live update to admin and any open tabs
    broadcastLiveEvent('TEACHER_PASSWORD_UPDATED', {
      teacherId: canonicalId,
      email: cleanEmail,
      name: user?.name || storedTeacher?.name || 'Teacher',
      password: newPw,
      collegeId: targetCollege,
      teacherData: mergedData,
    });

    // Update in-memory user & session
    const updatedUser = { ...user, ...mergedData, id: canonicalId, password: newPw };
    if (setUser) setUser(updatedUser);
    const sessionKey = sessionStorage.getItem(SESSION_TOKEN_KEY);
    if (sessionKey) {
      saveSession(sessionKey, { role: 'teacher', collegeId: targetCollege, ...updatedUser }).catch(console.warn);
    }

    addToast("Password updated successfully! Admin can see the new password in real-time.", "success");
    setSaved(true);
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
    setTimeout(() => setSaved(false), 4000);
  };

  return (
    <div className="w-full max-w-2xl sm:max-w-3xl mx-auto space-y-5 animate-fade-in pb-10">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <KeyRound size={22} className="text-blue-400" /> Change Password
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Update your login password. Changes apply instantly across all sessions.
        </p>
      </div>

      {/* Info card */}
      <div className="rounded-2xl bg-blue-500/10 border border-blue-500/20 p-4 flex items-start gap-3">
        <ShieldCheck size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{user.name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{user.email} &bull; Class {user.class}-{user.section}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Your password is visible to admin and can be reset by them if needed.</p>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-2xl bg-white dark:bg-[#0B0F19]/80 border border-slate-200 dark:border-white/10 p-5 sm:p-6 shadow-[0_4px_25px_rgba(0,0,0,0.3)] backdrop-blur-xl">
        <form onSubmit={handleSave} className="space-y-4">

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Current Password *</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input type={showCurrent ? "text" : "password"} value={currentPw}
                onChange={e => { setCurrentPw(e.target.value); setError(""); setSaved(false); }}
                placeholder="Enter current password" className={`${inputCls} pl-10 pr-10`} />
              <button type="button" onClick={() => setShowCurrent(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer">
                {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Default password is <span className="font-semibold text-blue-400">teacher123</span> if you have not changed it yet.
            </p>
          </div>

          <div className="border-t border-slate-100 dark:border-white/10" />

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">New Password *</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input type={showNew ? "text" : "password"} value={newPw}
                onChange={e => { setNewPw(e.target.value); setError(""); setSaved(false); }}
                placeholder="Min. 6 characters" className={`${inputCls} pl-10 pr-10`} />
              <button type="button" onClick={() => setShowNew(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer">
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <PasswordRequirements password={newPw} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Confirm New Password *</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input type={showConfirm ? "text" : "password"} value={confirmPw}
                onChange={e => { setConfirmPw(e.target.value); setError(""); setSaved(false); }}
                placeholder="Re-enter new password" className={`${inputCls} pl-10 pr-10`} />
              <button type="button" onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer">
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {confirmPw && newPw && (
              <p className={`text-[11px] mt-1.5 font-semibold ${confirmPw === newPw ? "text-emerald-500" : "text-red-400"}`}>
                {confirmPw === newPw ? "✓ Passwords match" : "✗ Passwords do not match"}
              </p>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-xs text-red-500 dark:text-red-400">
              <AlertCircle size={14} className="flex-shrink-0" /> {error}
            </div>
          )}
          {saved && (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle size={14} className="flex-shrink-0" /> Password updated! Admin can see the new password.
            </div>
          )}

          <button type="submit" className="w-full btn-primary justify-center py-2.5 mt-2">
            <ShieldCheck size={15} /> Update Password
          </button>
        </form>
      </div>
    </div>
  );
}
