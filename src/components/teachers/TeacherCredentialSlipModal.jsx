import { useState } from 'react';
import {
  GraduationCap,
  Printer,
  Copy,
  Check,
  ShieldCheck,
  Key,
  Mail,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';
import Modal from '../ui/Modal';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

export default function TeacherCredentialSlipModal({ open, teacher, onClose }) {
  const { settings, teachers } = useApp();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(true);

  if (!teacher) return null;

  // Live teacher resolution so modal updates instantly when teacher changes password in real-time
  const liveTeacher =
    (teachers || []).find(
      (t) =>
        (t.id && (t.id === teacher.id || t._docId === teacher.id)) ||
        (t.email && teacher.email && t.email.trim().toLowerCase() === teacher.email.trim().toLowerCase())
    ) || teacher;

  const collegeName =
    settings.collegeName ||
    settings.schoolName ||
    user?.collegeName ||
    liveTeacher.collegeName ||
    'Institution';

  const loginEmail = liveTeacher.email || `${(liveTeacher.name || 'teacher').toLowerCase().replace(/\s+/g, '.')}@school.edu`;
  const password = liveTeacher.password || 'teacher123';
  const portalUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/teacher-login`
      : 'https://attendify.netlify.app/teacher-login';

  const issuerName =
    user?.principleName || user?.name || 'School Principal / Administrator';

  const handleCopy = () => {
    const text = `👨‍🏫 *FACULTY LOGIN CREDENTIALS*
━━━━━━━━━━━━━━━━━━━━
🏫 *College / School:* ${collegeName}
👤 *Teacher Name:* ${liveTeacher.name}
🆔 *Teacher ID:* ${liveTeacher.id || 'N/A'}
📚 *Assigned Class & Division:* Class ${liveTeacher.class}-${liveTeacher.section}
📖 *Subject:* ${liveTeacher.subject || 'General'}
📧 *Login Email:* ${loginEmail}
🔑 *Password:* ${password}
🌐 *Teacher Portal:* ${portalUrl}
━━━━━━━━━━━━━━━━━━━━
⚡ *Live Synced:* Updated automatically across all sessions.`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Faculty Login Credential Slip - ${liveTeacher.name}</title>
          <style>
            @page { size: auto; margin: 12mm; }
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            body { background: #fff; color: #0f172a; padding: 20px; display: flex; justify-content: center; }
            .slip-card {
              width: 100%;
              max-width: 480px;
              border: 2px solid #2563eb;
              border-radius: 16px;
              padding: 24px;
              background: #ffffff;
              box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            }
            .header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 1.5px solid #e2e8f0;
              padding-bottom: 14px;
              margin-bottom: 16px;
            }
            .title-area { display: flex; align-items: center; gap: 12px; }
            .icon-box {
              width: 42px; height: 42px; border-radius: 12px; background: #2563eb;
              color: white; display: flex; align-items: center; justify-content: center;
              font-size: 20px;
            }
            .college-name { font-size: 16px; font-weight: 800; color: #0f172a; line-height: 1.2; }
            .slip-type { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #2563eb; letter-spacing: 0.5px; }
            .badge {
              font-size: 10px; font-weight: 700; background: #eff6ff; color: #1d4ed8;
              border: 1px solid #bfdbfe; padding: 4px 8px; border-radius: 20px; text-transform: uppercase;
            }
            .student-info { margin-bottom: 16px; }
            .name { font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
            .class-sec { font-size: 13px; font-weight: 600; color: #475569; }
            .cred-box {
              background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 12px;
              padding: 14px; margin-bottom: 16px;
            }
            .cred-row {
              display: flex; justify-content: space-between; align-items: center; padding: 6px 0;
            }
            .cred-row:not(:last-child) { border-bottom: 1px solid #e2e8f0; }
            .cred-label { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; }
            .cred-val { font-size: 15px; font-weight: 700; font-family: monospace; color: #0f172a; }
            .cred-val.pass { color: #2563eb; letter-spacing: 1px; font-size: 16px; }
            .portal-info {
              background: #f1f5f9; border-radius: 8px; padding: 10px; font-size: 11px;
              color: #334155; line-height: 1.5; margin-bottom: 16px;
            }
            .footer {
              display: flex; justify-content: space-between; align-items: flex-end;
              border-top: 1.5px solid #e2e8f0; padding-top: 14px; font-size: 11px; color: #64748b;
            }
            .sig-line { border-bottom: 1px solid #94a3b8; width: 140px; margin-bottom: 4px; }
          </style>
        </head>
        <body>
          <div class="slip-card">
            <div class="header">
              <div class="title-area">
                <div class="icon-box">👨‍🏫</div>
                <div>
                  <div class="college-name">${collegeName}</div>
                  <div class="slip-type">Faculty Login Credentials</div>
                </div>
              </div>
              <div class="badge">Active Faculty</div>
            </div>

            <div class="student-info">
              <div class="name">${liveTeacher.name}</div>
              <div class="class-sec">Class ${liveTeacher.class} - Section ${liveTeacher.section} | Subject: ${liveTeacher.subject || 'General'}</div>
            </div>

            <div class="cred-box">
              <div class="cred-row">
                <span class="cred-label">Login Email</span>
                <span class="cred-val">${loginEmail}</span>
              </div>
              <div class="cred-row">
                <span class="cred-label">Password</span>
                <span class="cred-val pass">${password}</span>
              </div>
              <div class="cred-row">
                <span class="cred-label">Teacher ID</span>
                <span class="cred-val">${liveTeacher.id || 'N/A'}</span>
              </div>
            </div>

            <div class="portal-info">
              <strong>Portal Link:</strong> ${portalUrl}<br />
              Teacher can sign in to mark attendance, post announcements, record exam marks, and manage their class.
            </div>

            <div class="footer">
              <div>
                <div>Issued on: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                <div style="font-size: 9px; margin-top: 2px;">Attendify Smart Attendance System</div>
              </div>
              <div style="text-align: right;">
                <div class="sig-line"></div>
                <div>${issuerName}</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 2000);
    }, 500);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Faculty Login Credentials"
      maxWidth="max-w-md sm:max-w-lg"
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 w-full min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs px-3.5 cursor-pointer w-full sm:w-auto"
          >
            Close
          </button>
          <div className="flex items-center gap-2 w-full sm:w-auto flex-shrink-0 justify-end">
            <button
              type="button"
              onClick={handleCopy}
              className="btn-secondary text-xs flex-1 sm:flex-initial flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap flex-shrink-0"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? 'Copied!' : 'Copy Credentials'}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="btn-primary text-xs flex-1 sm:flex-initial flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap bg-blue-600 hover:bg-blue-500 border-blue-500 shadow-md shadow-blue-600/20 flex-shrink-0"
            >
              <Printer size={14} />
              <span>Print Slip</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Printable/Preview Slip Card */}
        <div className="relative rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-[#111726] dark:to-[#0C101A] border-2 border-blue-500/30 p-5 shadow-lg overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Slip Header */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3 mb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <GraduationCap size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                  {collegeName}
                </h4>
                <p className="text-[10px] font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider">
                  Faculty Credential Slip
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                Live Synced
              </span>
            </div>
          </div>

          {/* Teacher Info */}
          <div className="mb-3.5">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
              {liveTeacher.name}
            </h3>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-0.5 flex items-center gap-2">
              <span className="text-brand-blue">Class {liveTeacher.class}-{liveTeacher.section}</span>
              <span>•</span>
              <span className="text-purple-400">{liveTeacher.subject || 'General'}</span>
            </p>
          </div>

          {/* Credentials Display Box */}
          <div className="rounded-xl bg-white dark:bg-[#070B14] border border-slate-200/80 dark:border-white/10 p-3.5 space-y-2.5 shadow-inner">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5">
                <Mail size={13} className="text-slate-400" />
                Login Email
              </span>
              <span className="font-mono font-bold text-slate-900 dark:text-white break-all">
                {loginEmail}
              </span>
            </div>

            <div className="border-t border-slate-100 dark:border-white/5 pt-2 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5">
                <Key size={13} className="text-blue-400" />
                Password
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-blue-500 dark:text-blue-400 tracking-wider">
                  {showPassword ? password : '••••••••'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-white/5 pt-2 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">
                Teacher ID
              </span>
              <span className="font-mono text-slate-600 dark:text-slate-300 text-[11px]">
                {liveTeacher.id || 'N/A'}
              </span>
            </div>
          </div>

          {/* Portal instructions */}
          <div className="mt-3 p-2.5 rounded-xl bg-blue-500/5 border border-blue-500/10 text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-2">
            <ShieldCheck size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <span>
              Teacher can log in at <span className="font-mono text-blue-400 break-all">{portalUrl}</span> to take attendance and manage class activities.
            </span>
          </div>

          {/* Footer date & issuer */}
          <div className="mt-3.5 pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-[10px] text-slate-400">
            <span>Issued by: {issuerName}</span>
            <span className="flex items-center gap-1">
              <Sparkles size={11} className="text-amber-400" />
              Live cloud synced
            </span>
          </div>
        </div>

      </div>
    </Modal>
  );
}
