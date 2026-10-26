import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { getUserIdentities, isMessageTargetingMe, isMessageUnreadForUser, getUnreadMessagesCountForUser } from '../../utils/messageUtils';

function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const dateStr = time.toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  const timeStr = time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="hidden sm:flex flex-col items-end select-none">
      <span className="text-xs font-semibold text-white tracking-tight font-mono">{timeStr}</span>
      <span className="text-[10px] text-slate-400 font-medium">{dateStr}</span>
    </div>
  );
}

export default function Header({ onMenuOpen }) {
  const { user, role, currentStudent } = useAuth();
  const { messages = [], teachers = [], students = [] } = useApp();
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();

  // Close notifications on Escape key press
  useEffect(() => {
    if (!notifOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setNotifOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [notifOpen]);

  const identities = useMemo(() => {
    return getUserIdentities({ role, user, currentStudent, teachers, students });
  }, [role, user, currentStudent, teachers, students]);

  const notifications = useMemo(() => {
    return (messages || [])
      .filter((m) => isMessageTargetingMe(m, identities, students))
      .map((m) => {
        const isUnread = isMessageUnreadForUser(m, identities, students);
        const prefix = m.senderName ? `${m.senderName}: ` : '';
        const body = m.text || (m.attachment ? `[Attachment: ${m.attachment.name || 'File'}]` : 'Announcement');
        return {
          id: m.id,
          msg: `${prefix}${body}`,
          time: m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
          unread: isUnread,
          isTeacher: (m.senderRole || '').toLowerCase() === 'teacher',
          timestamp: m.timestamp,
        };
      })
      .sort((a, b) => {
        if (role === 'student') {
          if (a.isTeacher && !b.isTeacher) return -1;
          if (!a.isTeacher && b.isTeacher) return 1;
        }
        if (a.unread && !b.unread) return -1;
        if (!a.unread && b.unread) return 1;
        return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
      })
      .slice(0, 7);
  }, [messages, identities, students, role]);

  const unreadCount = useMemo(() => {
    return getUnreadMessagesCountForUser(messages, identities, students);
  }, [messages, identities, students]);

  return (
    <header className="h-16 w-full max-w-full bg-[#0B0F1A]/70 backdrop-blur-2xl border-b border-white/10 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 no-print flex-shrink-0 relative z-40 shadow-[0_4px_24px_rgba(0,0,0,0.3)] select-none">
      {/* Mobile menu button */}
      <button
        type="button"
        onClick={onMenuOpen}
        className="lg:hidden w-10 h-10 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-300 hover:text-white transition-all duration-200 cursor-pointer flex items-center justify-center flex-shrink-0 active:scale-95 backdrop-blur-md shadow-sm"
        aria-label="Open navigation menu"
      >
        <Menu size={19} />
      </button>

      {/* Spacer */}
      <div className="flex-1 min-w-0" />

      {/* Right controls */}
      <div className="flex items-center gap-2 sm:gap-3.5 flex-shrink-0">
        <Clock />

        {/* Notifications Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen((o) => !o)}
            className="relative w-10 h-10 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-300 hover:text-white transition-all duration-200 cursor-pointer flex items-center justify-center active:scale-95 backdrop-blur-md shadow-sm"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-[#0B0F1A] shadow-[0_0_10px_rgba(239,68,68,0.8)] leading-none select-none pointer-events-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 top-full mt-2.5 w-[min(calc(100vw-1.5rem),340px)] bg-[#0B0F1A]/95 rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.12)] border border-white/15 z-50 overflow-hidden animate-popover-in backdrop-blur-3xl">
                <div className="px-4 py-3.5 border-b border-white/10 flex items-center justify-between">
                  <p className="text-xs font-semibold text-white tracking-wide">Notifications</p>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25 flex items-center gap-1.5 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      {unreadCount} unread
                    </span>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-xs text-slate-400">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          setNotifOpen(false);
                          navigate('/messages');
                        }}
                        className={`px-4 py-3 border-b border-white/[0.05] last:border-0 cursor-pointer hover:bg-white/[0.05] transition-all duration-150 flex items-start gap-2.5 ${
                          n.unread ? 'bg-red-500/[0.08]' : ''
                        }`}
                      >
                        {n.unread && (
                          <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.9)] animate-pulse flex-shrink-0 mt-1" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-200 font-medium break-words leading-relaxed">{n.msg}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{n.time}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-2 border-t border-white/10 bg-white/[0.02]">
                  <button
                    onClick={() => {
                      setNotifOpen(false);
                      navigate('/messages');
                    }}
                    className="w-full py-2 text-center text-xs text-blue-400 hover:text-blue-300 font-semibold rounded-xl hover:bg-white/[0.04] transition-colors"
                  >
                    Open Messages Center →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
