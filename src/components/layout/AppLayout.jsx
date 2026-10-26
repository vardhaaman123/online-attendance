import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar, MobileDrawer } from './Sidebar';
import Header from './Header';
import ToastContainer from '../ui/ToastContainer';
import AnimatedBackground from '../ui/AnimatedBackground';
export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [userCollapsed, setUserCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Automatically collapse the sidebar on messages page to give full room,
  // but preserve the user's collapse preference across other pages
  useEffect(() => {
    if (location.pathname === '/messages') {
      setCollapsed(true);
    } else {
      setCollapsed(userCollapsed);
    }
    setMobileOpen(false);
  }, [location.pathname, userCollapsed]);

  const handleToggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      setUserCollapsed(next);
      return next;
    });
  };

  // Prevent back-forward cache (bfcache) from exposing protected screens after logout
  useEffect(() => {
    const handlePageShow = (event) => {
      if (event.persisted) {
        const token = sessionStorage.getItem('_attendify_sk');
        if (!token) {
          window.location.replace('/');
        }
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  return (
    <div className="relative flex h-dvh bg-[#06080E] overflow-hidden text-slate-100 max-w-full selection:bg-blue-500/30 selection:text-white">
      {/* Liquid Glass Ambient Background Canvas */}
      <AnimatedBackground />

      {/* Desktop Sidebar */}
      <Sidebar collapsed={collapsed} onToggle={handleToggleCollapse} />

      {/* Mobile Drawer */}
      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden min-h-0 relative z-10">
        <Header onMenuOpen={() => setMobileOpen(true)} />
        <main className={`flex-1 min-h-0 w-full max-w-full min-w-0 relative z-0 ${location.pathname === '/messages' ? 'overflow-hidden p-0 flex flex-col' : 'overflow-y-auto overflow-x-hidden p-3 sm:p-5 lg:py-5 lg:px-8'}`}>
          <div key={location.pathname} className="w-full min-h-0 flex-1 flex flex-col animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}
