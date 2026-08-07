import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

/** Shared chrome for every authenticated screen: nav bar + themed page canvas. */
export default function AppLayout() {
  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-emerald-500 selection:text-slate-950">
      {/* Background Gradient / Glow Accents */}
      <div 
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" 
        aria-hidden="true"
      >
        <div className="absolute -top-40 left-1/2 -z-10 h-[500px] w-[1000px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-emerald-500/10 to-cyan-500/5 blur-3xl" />
        <div className="absolute top-1/3 -left-48 -z-10 h-96 w-96 rounded-full bg-emerald-600/5 blur-3xl" />
      </div>

      {/* Main Navigation Bar */}
      <Navbar />

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}