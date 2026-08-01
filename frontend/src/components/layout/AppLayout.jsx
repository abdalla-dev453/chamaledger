import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

/** Shared chrome for every authenticated screen: nav bar + themed page canvas. */
export default function AppLayout() {
  return (
    <div className="thread-glow min-h-screen bg-[var(--color-ink-950)] text-white">
      <Navbar />
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10">
        <Outlet />
      </main>
    </div>
  );
}