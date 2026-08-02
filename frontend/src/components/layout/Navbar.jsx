import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, ChevronDown, LayoutGrid, RefreshCw, LogOut, Users, HandCoins, CircleDollarSign, Menu, X } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";

const NAV_LINKS = [
  { to: "/", label: "Dashboard", icon: LayoutGrid, end: true },
  { to: "/members", label: "Members", icon: Users },
  { to: "/loans", label: "Loans", icon: HandCoins },
];

const linkClasses = ({ isActive }) => {
  const base = "flex items-center gap-2.5 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200";
  return isActive 
    ? `${base} bg-emerald-500/10 text-emerald-400 border border-emerald-500/20` 
    : `${base} text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border border-transparent`;
};

export default function Navbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleLogout = () => {
    setMenuOpen(false);
    setMobileNavOpen(false);
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-950/75 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        
        {/* Left Side: Brand & Desktop Navigation */}
        <div className="flex items-center gap-8">
          <span className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 shadow-md shadow-emerald-900/20">
              <CircleDollarSign className="h-4.5 w-4.5 text-zinc-950" aria-hidden="true" />
            </span>
            ChamaLedger
          </span>

          <nav aria-label="Desktop Primary" className="hidden items-center gap-1.5 md:flex">
            {NAV_LINKS.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={linkClasses}>
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </NavLink>
            ))}
            {user?.role === "treasurer" && (
              <NavLink to="/reconcile" className={linkClasses}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Reconcile
              </NavLink>
            )}
          </nav>
        </div>

        {/* Right Side: Quick Tools & Profile Dropdowns */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/50 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
          </button>

          {/* User Account Controls */}
          <div className="relative hidden sm:block">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex items-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900/40 py-1 pl-1 pr-3 text-left transition-colors hover:bg-zinc-900/80"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 font-medium text-xs text-zinc-200">
                {user?.full_name?.charAt(0) ?? "?"}
              </span>
              <span className="leading-tight">
                <span className="block text-xs font-medium text-zinc-200">{user?.full_name ?? "Member"}</span>
                <span className="block text-[10px] uppercase tracking-wider text-blue-600 font-semibold">{user?.role}</span>
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 4 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  role="menu"
                  className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 p-1.5 shadow-xl shadow-black/50"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Log out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile Hambuger Button */}
          <button
            type="button"
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label="Toggle Menu"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/50 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 md:hidden"
          >
            {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Flyout Panel Overlay */}
      <AnimatePresence>
        {mobileNavOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="border-t border-zinc-800 bg-zinc-950 px-4 py-4 md:hidden overflow-hidden"
          >
            <nav aria-label="Mobile Primary" className="flex flex-col gap-1.5">
              {NAV_LINKS.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end} onClick={() => setMobileNavOpen(false)} className={linkClasses}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </NavLink>
              ))}
              {user?.role === "treasurer" && (
                <NavLink to="/reconcile" onClick={() => setMobileNavOpen(false)} className={linkClasses}>
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Reconcile
                </NavLink>
              )}
              <div className="h-px bg-zinc-800 my-2" />
              <div className="flex items-center gap-3 px-3 py-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 font-medium text-xs text-zinc-200">
                  {user?.full_name?.charAt(0) ?? "?"}
                </span>
                <div className="leading-tight flex-1">
                  <span className="block text-sm font-medium text-zinc-200">{user?.full_name ?? "Member"}</span>
                  <span className="block text-xs uppercase text-blue-600 font-semibold">{user?.role}</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                  aria-label="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
