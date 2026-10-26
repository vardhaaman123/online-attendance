import { useState } from 'react';
import {
  GraduationCap,
  Printer,
  Copy,
  Check,
  ShieldCheck,
  Key,
  User,
  Sparkles,
} from 'lucide-react';
import Modal from '../ui/Modal';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

export default function CredentialSlipModal({ open, student, onClose }) {
  const { settings, students } = useApp();
  const { user, role } = useAuth();
  const [copied, setCopied] = useState(false);

  if (!student) return null;

  const liveStudent = (students || []).find((s) => {
    const sId = s.id || s._docId;
    if (student.id && (sId === student.id || s._docId === student.id)) return true;
    if (student.rollNumber && s.rollNumber && String(s.rollNumber).trim().toLowerCase() === String(student.rollNumber).trim().toLowerCase()) return true;
    if (student.email && s.email && s.email.trim().toLowerCase() === student.email.trim().toLowerCase()) return true;
    return false;
  }) || student;

  const collegeName =
    settings.collegeName ||
    settings.schoolName ||
    user?.collegeName ||
    liveStudent.collegeName ||
    'Institution';

  const loginId = liveStudent.rollNumber || liveStudent.email || liveStudent.id;
  const password = liveStudent.password || '1234';
  const portalUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/student-login`
      : 'https://attendify.netlify.app/student-login';

  const issuerName =
    role === 'teacher'
      ? user?.name || 'Class Teacher'
      : user?.principleName || user?.name || 'Principal / Administrator';

  const handleCopy = () => {
    const text = `🎓 *STUDENT LOGIN CREDENTIALS*
━━━━━━━━━━━━━━━━━━━━
🏫 *College:* ${collegeName}
👤 *Student Name:* ${liveStudent.name}
📚 *Class & Section:* Class ${liveStudent.class}-${liveStudent.section}
🆔 *Login ID / Roll No:* ${loginId}
🔑 *Password:* ${password}
🌐 *Student Portal:* ${portalUrl}
━━━━━━━━━━━━━━━━━━━━
⚠️ *Important:* Change your password after your first login.`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    // Create an isolated hidden iframe for clean, instant, full-card printing without clipping
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
          <title>Student Login Credential Slip - ${liveStudent.name}</title>
          <style>
            @page { size: auto; margin: 12mm; }
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            body { background: #fff; color: #0f172a; padding: 20px; display: flex; justify-content: center; }
            .slip-card {
              width: 100%;
              max-width: 480px;
              border: 2px solid #059669;
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
              width: 42px; height: 42px; border-radius: 12px; background: #059669;
              display: flex; align-items: center; justify-content: center; color: white; font-size: 22px;
            }
            .college-name { font-size: 17px; font-weight: 800; color: #0f172a; }
            .sub-badge { font-size: 10px; font-weight: 700; color: #059669; text-transform: uppercase; letter-spacing: 0.5px; }
            .verified { font-size: 11px; font-weight: 700; color: #059669; border: 1.5px solid #059669; padding: 3px 10px; border-radius: 9999px; background: #ecfdf5; }
            .row {
              display: flex; justify-content: space-between; align-items: center;
              padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0;
              border-radius: 10px; margin-bottom: 10px; font-size: 13px;
            }
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
            .grid-box {
              padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0;
              border-radius: 10px; font-size: 13px;
            }
            .label { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-bottom: 4px; }
            .val { font-size: 14px; font-weight: 700; color: #0f172a; }
            .highlight-val { color: #059669; }
            .pwd-row {
              display: flex; justify-content: space-between; align-items: center;
              padding: 12px 14px; background: #ecfdf5; border: 1.5px solid #10b981;
              border-radius: 10px; margin-bottom: 10px;
            }
            .pwd-label { font-weight: 700; color: #065f46; font-size: 13px; }
            .pwd-val {
              font-family: monospace; font-size: 16px; font-weight: 800;
              background: #ffffff; padding: 4px 12px; border-radius: 6px;
              border: 1px solid #a7f3d0; color: #0f172a;
            }
            .email-row { font-size: 11px; color: #64748b; padding: 2px 4px 10px; display: flex; justify-content: space-between; }
            .footer {
              border-top: 1.5px solid #e2e8f0; padding-top: 12px; margin-top: 6px;
              display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748b;
            }
            .portal { font-size: 10px; color: #059669; font-weight: 600; margin-top: 2px; }
            .note { font-size: 10px; font-style: italic; color: #b45309; }
          </style>
        </head>
        <body>
          <div class="slip-card">
            <div class="header">
              <div class="title-area">
                <div class="icon-box">🎓</div>
                <div>
                  <div class="college-name">${collegeName}</div>
                  <div class="sub-badge">Official Student Portal Login Slip</div>
                </div>
              </div>
              <div class="verified">✓ Verified</div>
            </div>

            <div class="row">
              <span style="color:#64748b;">👤 Student Name:</span>
              <span class="val">${liveStudent.name}</span>
            </div>

            <div class="grid-2">
              <div class="grid-box">
                <div class="label">Class & Section</div>
                <div class="val highlight-val">Class ${liveStudent.class}-${liveStudent.section}</div>
              </div>
              <div class="grid-box">
                <div class="label">Roll / USN (Login ID)</div>
                <div class="val" style="font-family:monospace;">${loginId}</div>
              </div>
            </div>

            <div class="pwd-row">
              <span class="pwd-label">🔑 Login Password:</span>
              <span class="pwd-val">${password}</span>
            </div>

            ${liveStudent.email ? `
            <div class="email-row">
              <span>Registered Email:</span>
              <span style="font-family:monospace; color:#334155;">${liveStudent.email}</span>
            </div>` : ''}

            <div class="footer">
              <div>
                <div>Issued By: <strong style="color:#0f172a;">${issuerName}</strong></div>
                <div class="portal">Portal: ${portalUrl}</div>
              </div>
              <div class="note">* Please change password upon 1st login</div>
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
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    }, 250);
  };

  const modalFooter = (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full min-w-0">
      <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 min-w-0">
        <Sparkles size={13} className="text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
        <span className="truncate">Share with student or parent to allow immediate login.</span>
      </p>

      <div className="flex items-center gap-2.5 w-full sm:w-auto flex-shrink-0 justify-end">
        <button
          type="button"
          onClick={handleCopy}
          className="btn-secondary flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs py-2 px-3.5 whitespace-nowrap cursor-pointer flex-shrink-0"
        >
          {copied ? (
            <>
              <Check size={14} className="text-emerald-500" />
              <span className="text-emerald-500 font-semibold">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Copy Details</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="btn-primary flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs py-2 px-3.5 whitespace-nowrap cursor-pointer bg-emerald-600 hover:bg-emerald-500 border-emerald-500 shadow-md shadow-emerald-600/20 flex-shrink-0"
        >
          <Printer size={14} />
          <span>Print Slip</span>
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Student Login Credential Slip"
      maxWidth="max-w-lg sm:max-w-xl"
      footer={modalFooter}
    >
      <div className="space-y-4">
        {/* Printable Card Area */}
        <div
          id="printable-slip"
          className="relative bg-gradient-to-br from-[#0c1220] via-[#10172a] to-[#0b101d] border-2 border-emerald-500/40 rounded-2xl p-4 sm:p-5 shadow-xl text-slate-100 overflow-hidden"
        >
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 flex-shrink-0">
                <GraduationCap size={22} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-white truncate">
                  {collegeName}
                </h3>
                <p className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase">
                  Official Student Portal Login Slip
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
              <ShieldCheck size={12} /> Verified
            </span>
          </div>

          {/* Credentials Grid */}
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <span className="text-slate-400 flex items-center gap-2">
                <User size={14} className="text-emerald-400" /> Student Name:
              </span>
              <span className="font-bold text-white text-sm">
                {liveStudent.name}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-0.5">
                  Class & Section
                </span>
                <span className="font-bold text-emerald-300 text-sm">
                  Class {liveStudent.class}-{liveStudent.section}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-0.5">
                  Roll / USN (Login ID)
                </span>
                <span className="font-bold text-white text-sm font-mono">
                  {liveStudent.rollNumber || '01'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <span className="text-emerald-300 font-semibold flex items-center gap-2">
                <Key size={14} className="text-emerald-400" /> Login Password:
              </span>
              <span className="font-mono font-extrabold text-white bg-black/40 px-2.5 py-1 rounded-lg border border-white/10 text-sm">
                {password}
              </span>
            </div>

            {liveStudent.email && (
              <div className="flex items-center justify-between px-2.5 py-1 text-[11px] text-slate-400">
                <span>Registered Email:</span>
                <span className="text-slate-300 font-mono">{liveStudent.email}</span>
              </div>
            )}
          </div>

          {/* Footer of the Slip */}
          <div className="mt-3.5 pt-2.5 border-t border-white/10 text-[10px] text-slate-400 flex items-center justify-between">
            <div>
              <p>
                Issued By: <span className="font-semibold text-slate-200">{issuerName}</span>
              </p>
              <p className="text-[9px] text-slate-500">Portal: {portalUrl}</p>
            </div>
            <p className="text-right italic text-[9px] text-amber-400">
              * Please change password upon 1st login
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
