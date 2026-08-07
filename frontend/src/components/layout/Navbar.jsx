import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bell, 
  ChevronDown, 
  LayoutGrid, 
  RefreshCw, 
  LogOut, 
  Users, 
  HandCoins, 
  CircleDollarSign, 
  Menu, 
  X,
  ShieldCheck
} from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import ThemeToggle from "../layout/ThemeToggle";

const NAV_LINKS = [
  { to: "/", label: "Dashboard", icon: LayoutGrid, end: true },
  { to: "/members", label: "Members", icon: Users },
  { to: "/loans", label: "Loans", icon: HandCoins },
];

const linkClasses = ({ isActive }) => {
  const base = "flex items-center gap-2.5 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200";
  return isActive 
    ? `${base} bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10` 
    : `${base} text-slate-400 hover:bg-slate-800/60 hover:text-slate-100 border border-transparent`;
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
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        
        {/* Left Side: Brand & Desktop Navigation */}
        <div className="flex items-center gap-8">
          <NavLink to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-200">
              <CircleDollarSign className="h-5 w-5 stroke-[2.5]" aria-hidden="true" />
            </div>
            <span className="font-display text-lg font-black tracking-tight text-white group-hover:text-emerald-400 transition-colors">
              ChamaLedger
            </span>
          </NavLink>

          <nav aria-label="Desktop Primary" className="hidden items-center gap-1 md:flex">
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

        {/* Right Side: Theme Switcher, Quick Tools & Profile Dropdowns */}
        <div className="flex items-center gap-3">
          {/* Desktop Theme Switcher */}
          <div className="hidden lg:block">
            <ThemeToggle />
          </div>

          {/* Notifications Button */}
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 text-slate-400 transition-all hover:border-slate-700 hover:bg-slate-800 hover:text-slate-100"
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
          </button>

          {/* Desktop Account Controls */}
          <div className="relative hidden sm:block">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/60 p-1.5 pr-3 text-left transition-all hover:border-slate-700 hover:bg-slate-900"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-600 font-bold text-xs text-slate-200 shadow-inner">
                {user?.full_name?.charAt(0) ?? "?"}
              </div>
              <div className="leading-tight">
                <span className="block text-xs font-bold text-slate-100 max-w-[110px] truncate">
                  {user?.full_name ?? "Member"}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-extrabold tracking-wider text-emerald-400">
                  {user?.role === "treasurer" && <ShieldCheck className="h-2.5 w-2.5" />}
                  {user?.role ?? "member"}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 6 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  role="menu"
                  className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-1.5 shadow-2xl backdrop-blur-xl z-50"
                >
                  <div className="px-3 py-2 border-b border-slate-800/80 mb-1">
                    <p className="text-xs font-bold text-slate-200 truncate">{user?.full_name}</p>
                    <p className="text-[10px] font-mono text-slate-400 truncate">{user?.phone_number || "No contact"}</p>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-rose-400 transition-colors hover:bg-rose-500/10"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Sign out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label="Toggle Menu"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100 md:hidden"
          >
            {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      <AnimatePresence>
        {mobileNavOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="border-t border-slate-800 bg-slate-950 px-4 py-4 md:hidden overflow-hidden"
          >
            <nav aria-label="Mobile Primary" className="flex flex-col gap-2">
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

              {/* Mobile Theme Switcher */}
              <div className="pt-2">
                <div className="text-[10px] uppercase font-bold text-slate-500 mb-1.5 px-1">Theme</div>
                <ThemeToggle />
              </div>
              
              <div className="h-px bg-slate-800/80 my-2" />
              
              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 font-bold text-xs text-slate-200">
                    {user?.full_name?.charAt(0) ?? "?"}
                  </div>
                  <div className="leading-tight">
                    <span className="block text-xs font-bold text-slate-100">{user?.full_name ?? "Member"}</span>
                    <span className="block text-[10px] uppercase font-extrabold text-emerald-400 tracking-wider">{user?.role}</span>
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
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