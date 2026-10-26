import { useState } from 'react';
import { GraduationCap, Users, ShieldCheck, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AnimatedBackground from '../ui/AnimatedBackground';

const roles = [
  {
    id: 'student',
    icon: GraduationCap,
    title: 'Student Portal',
    badge: 'Student',
    desc: 'View your attendance records, profile & calendar',
    path: '/student-login',
    accentText: 'text-emerald-400',
    hoverText: 'text-emerald-300',
    descHover: 'text-emerald-100/90',
    cardActive: 'border-emerald-500/80 shadow-[0_0_35px_rgba(16,185,129,0.3)] bg-gradient-to-b from-emerald-950/70 via-[#0C101A] to-[#0C101A]',
    hoverClasses: 'hover:border-emerald-500/80 hover:shadow-[0_0_35px_rgba(16,185,129,0.3)] hover:bg-gradient-to-b hover:from-emerald-950/70 hover:via-[#0C101A] hover:to-[#0C101A]',
    iconGlow: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.12)]',
    iconHover: 'bg-emerald-500/25 text-emerald-300 border-emerald-400/50 shadow-[0_0_24px_rgba(16,185,129,0.4)]',
    bottomGradient: 'from-emerald-500 to-teal-400',
    bottomShadow: 'shadow-[0_0_15px_rgba(16,185,129,0.8)]',
    chip: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25',
    chipHover: 'bg-emerald-500/30 text-emerald-200 border-emerald-400/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]',
    arrowHover: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]',
  },
  {
    id: 'teacher',
    icon: Users,
    title: 'Teacher Portal',
    badge: 'Teacher',
    desc: 'Mark daily attendance, manage classes & view reports',
    path: '/teacher-login',
    accentText: 'text-blue-400',
    hoverText: 'text-blue-300',
    descHover: 'text-blue-100/90',
    cardActive: 'border-blue-500/80 shadow-[0_0_35px_rgba(59,130,246,0.3)] bg-gradient-to-b from-blue-950/70 via-[#0C101A] to-[#0C101A]',
    hoverClasses: 'hover:border-blue-500/80 hover:shadow-[0_0_35px_rgba(59,130,246,0.3)] hover:bg-gradient-to-b hover:from-blue-950/70 hover:via-[#0C101A] hover:to-[#0C101A]',
    iconGlow: 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.12)]',
    iconHover: 'bg-blue-500/25 text-blue-300 border-blue-400/50 shadow-[0_0_24px_rgba(59,130,246,0.4)]',
    bottomGradient: 'from-blue-500 to-indigo-400',
    bottomShadow: 'shadow-[0_0_15px_rgba(59,130,246,0.8)]',
    chip: 'bg-blue-500/10 text-blue-400 border border-blue-500/25',
    chipHover: 'bg-blue-500/30 text-blue-200 border-blue-400/50 shadow-[0_0_12px_rgba(59,130,246,0.3)]',
    arrowHover: 'bg-blue-500/20 border-blue-500/40 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.3)]',
  },
  {
    id: 'admin',
    icon: ShieldCheck,
    title: 'Admin Console',
    badge: 'Admin',
    desc: 'Full access — manage teachers, students, settings & reports',
    path: '/admin-login',
    accentText: 'text-purple-400',
    hoverText: 'text-purple-300',
    descHover: 'text-purple-100/90',
    cardActive: 'border-purple-500/80 shadow-[0_0_35px_rgba(168,85,247,0.3)] bg-gradient-to-b from-purple-950/70 via-[#0C101A] to-[#0C101A]',
    hoverClasses: 'hover:border-purple-500/80 hover:shadow-[0_0_35px_rgba(168,85,247,0.3)] hover:bg-gradient-to-b hover:from-purple-950/70 hover:via-[#0C101A] hover:to-[#0C101A]',
    iconGlow: 'bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.12)]',
    iconHover: 'bg-purple-500/25 text-purple-300 border-purple-400/50 shadow-[0_0_24px_rgba(168,85,247,0.4)]',
    bottomGradient: 'from-purple-500 to-fuchsia-400',
    bottomShadow: 'shadow-[0_0_15px_rgba(168,85,247,0.8)]',
    chip: 'bg-purple-500/10 text-purple-400 border border-purple-500/25',
    chipHover: 'bg-purple-500/30 text-purple-200 border-purple-400/50 shadow-[0_0_12px_rgba(168,85,247,0.3)]',
    arrowHover: 'bg-purple-500/20 border-purple-500/40 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]',
  },
];

const defaultBadge = {
  text: 'Choose your role to continue',
  dotColor: 'bg-blue-500',
  dotShadow: 'shadow-[0_0_8px_rgba(59,130,246,0.8)]',
  textColor: 'text-white',
  borderColor: 'border-white/10',
  glowBg: 'bg-[#06080E]/70',
};

const roleBadgeMap = {
  student: {
    text: 'Student Portal',
    dotColor: 'bg-emerald-400',
    dotShadow: 'shadow-[0_0_10px_rgba(16,185,129,0.9)]',
    textColor: 'text-emerald-300',
    borderColor: 'border-emerald-500/40',
    glowBg: 'bg-emerald-950/40',
  },
  teacher: {
    text: 'Teacher Portal',
    dotColor: 'bg-blue-400',
    dotShadow: 'shadow-[0_0_10px_rgba(59,130,246,0.9)]',
    textColor: 'text-blue-300',
    borderColor: 'border-blue-500/40',
    glowBg: 'bg-blue-950/40',
  },
  admin: {
    text: 'Admin Console',
    dotColor: 'bg-purple-400',
    dotShadow: 'shadow-[0_0_10px_rgba(168,85,247,0.9)]',
    textColor: 'text-purple-300',
    borderColor: 'border-purple-500/40',
    glowBg: 'bg-purple-950/40',
  },
};

export default function RoleSelectorPage() {
  const navigate = useNavigate();
  const [hoveredRole, setHoveredRole] = useState(null);

  // When no section is hovered/held, default to "Choose your role to continue"
  const currentBadge = hoveredRole ? roleBadgeMap[hoveredRole.id] : defaultBadge;

  const handleRoleClick = (role) => {
    navigate(role.path);
  };

  return (
    <div className="min-h-screen text-slate-100 flex flex-col items-center justify-center px-4 py-6 sm:py-10 relative overflow-hidden selection:bg-blue-500/30">
      {/* Clean static background */}
      <AnimatedBackground />

      {/* Top Brand Header */}
      <header className="relative z-10 flex flex-col items-center text-center mt-2 sm:mt-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 p-[1px] shadow-md flex items-center justify-center">
            <div className="w-full h-full bg-[#0A0E18] rounded-2xl flex items-center justify-center">
              <GraduationCap className="text-blue-400" size={24} />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-1.5 drop-shadow-lg">
            Attendify
          </h1>
        </div>

        {/* Role Badge: Shows "Choose your role to continue" by default; changes when cursor/touch is held on a card */}
        <div
          className={`mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-full ${currentBadge.glowBg} border ${currentBadge.borderColor} backdrop-blur-md shadow-lg transition-all duration-200`}
        >
          <span
            className={`w-2 h-2 rounded-full ${currentBadge.dotColor} animate-pulse ${currentBadge.dotShadow} transition-all duration-200`}
          />
          <span
            className={`text-xs font-semibold ${currentBadge.textColor} tracking-wide transition-all duration-200`}
          >
            {currentBadge.text}
          </span>
        </div>
      </header>

      {/* Main Role Selection Grid - Fully Responsive for Mobile & Desktop */}
      <main className="relative z-10 w-full max-w-md sm:max-w-4xl my-6 sm:my-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
          {roles.map((r) => {
            const Icon = r.icon;
            const isHovered = hoveredRole?.id === r.id;

            return (
              <button
                key={r.id}
                onClick={() => handleRoleClick(r)}
                onPointerEnter={() => setHoveredRole(r)}
                onPointerLeave={() => setHoveredRole(null)}
                onMouseEnter={() => setHoveredRole(r)}
                onMouseLeave={() => setHoveredRole(null)}
                onPointerDown={() => setHoveredRole(r)}
                onTouchStart={() => setHoveredRole(r)}
                onFocus={() => setHoveredRole(r)}
                onBlur={() => setHoveredRole(null)}
                className={`group relative flex flex-row sm:flex-col items-center sm:text-center text-left gap-3.5 sm:gap-4 p-4 sm:p-7 rounded-2xl sm:rounded-3xl border transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-xl ${
                  isHovered
                    ? `${r.cardActive} -translate-y-0.5 sm:-translate-y-1`
                    : `bg-[#0C101A]/95 ${r.hoverClasses} hover:-translate-y-0.5 sm:hover:-translate-y-1 border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.5)]`
                } active:scale-[0.98]`}
              >
                {/* Subtle top inner glow */}
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.12] to-transparent pointer-events-none" />

                {/* Role Icon */}
                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    isHovered ? `${r.iconHover} scale-110` : `${r.iconGlow} group-hover:scale-110`
                  }`}
                >
                  <Icon size={24} className="sm:w-7 sm:h-7" />
                </div>

                {/* Role Text Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center sm:justify-center gap-2 mb-1 sm:mb-1.5">
                    <h2
                      className={`text-base sm:text-lg font-bold tracking-tight transition-colors duration-300 ${
                        isHovered ? r.hoverText : 'text-white'
                      }`}
                    >
                      {r.title}
                    </h2>
                    <span
                      className={`sm:hidden text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all duration-300 ${
                        isHovered ? r.chipHover : r.chip
                      }`}
                    >
                      {r.badge}
                    </span>
                  </div>
                  <p
                    className={`text-xs leading-snug line-clamp-2 sm:line-clamp-none transition-colors duration-300 ${
                      isHovered ? r.descHover : 'text-slate-400'
                    }`}
                  >
                    {r.desc}
                  </p>
                </div>

                {/* Mobile Chevron Arrow */}
                <div
                  className={`sm:hidden w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
                    isHovered
                      ? `${r.arrowHover} translate-x-1`
                      : 'bg-white/[0.03] border-white/[0.06] text-slate-500'
                  }`}
                >
                  <ChevronRight size={16} />
                </div>

                {/* Hover / Active Accent Underline */}
                <div
                  className={`absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-gradient-to-r ${r.bottomGradient} transition-all duration-300 ${
                    isHovered ? `opacity-100 ${r.bottomShadow} h-[3px]` : 'opacity-0'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center pb-2 flex flex-col items-center gap-1">
        <p className="text-[#64748B] text-[11px] sm:text-xs tracking-wide">
          © 2026 Attendify • Smart School Attendance Management
        </p>
        <p className="text-[#64748B] text-[10.5px] sm:text-[11px] tracking-wide">
          Developed by <span className="text-slate-400 font-medium">Vardhaman Ainapure</span>
        </p>
      </footer>
    </div>
  );
}
