import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, ChevronDown, LayoutGrid, RefreshCw, LogOut, Users, HandCoins, CircleDollarSign } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";

const NAV_LINKS = [
  { to: "/", label: "Dashboard", icon: LayoutGrid, end: true },
  { to: "/members", label: "Members", icon: Users },
  { to: "/loans", label: "Loans", icon: HandCoins },
];

const linkClasses = ({ isActive }) =>
  `flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
    isActive ? "bg-white/10 text-white" : "text-white/55 hover:text-white"
  }`;

export default function Navbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[var(--color-ink-950)]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8 lg:px-10">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2 font-display text-lg font-semibold text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-plum-400)] to-[var(--color-plum-600)]">
              <CircleDollarSign className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            ChamaLedger
          </span>

          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
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

        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-10 w-10 items-center justify-center rounded-full glass-panel text-white/80 transition-colors hover:text-white"
          >
            <Bell className="h-4.5 w-4.5" aria-hidden="true" />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex items-center gap-2 rounded-full glass-panel py-1.5 pl-1.5 pr-3 text-left"
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-plum-400)] to-[var(--color-plum-600)] font-display text-sm font-semibold"
                aria-hidden="true"
              >
                {user?.full_name?.charAt(0) ?? "?"}
              </span>
              <span className="hidden leading-tight sm:block">
                <span className="block text-sm font-semibold text-white">{user?.full_name ?? "Member"}</span>
                <span className="block text-xs capitalize text-[var(--color-gold-300)]">{user?.role}</span>
              </span>
              <ChevronDown className="h-4 w-4 text-white/50" aria-hidden="true" />
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  role="menu"
                  className="absolute right-0 mt-2 w-44 overflow-hidden rounded-2xl glass-panel p-1 shadow-xl shadow-black/40"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Log out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      <nav aria-label="Primary" className="flex items-center gap-1 overflow-x-auto px-5 pb-3 md:hidden">
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
    </header>
  );
}