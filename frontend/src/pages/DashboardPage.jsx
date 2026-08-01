import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  Wallet,
  HandCoins,
  Users,
  PiggyBank,
  ReceiptText,
  ChevronRight,
  Clock,
  AlertTriangle,
  Plus,
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useCycles, useCycleSummary } from "../hooks/useCycles";
import { useLoans } from "../hooks/useLoans";
import { formatKES, daysHoursUntil } from "../utils/formatters";
import GlassCard from "../components/ui/GlassCard";

function getGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Habari za asubuhi";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** The signature element: a concentric "chama circle" gauge for pool health. */
function CircleGauge({ percent, reduceMotion }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percent));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90" role="img" aria-label={`${clamped}% of this cycle collected`}>
      <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
      <motion.circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke="url(#poolGradient)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={reduceMotion ? { strokeDashoffset: offset } : { strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: "easeOut", delay: 0.25 }}
      />
      <defs>
        <linearGradient id="poolGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--color-plum-400)" />
          <stop offset="100%" stopColor="var(--color-gold-400)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function ProgressBar({ percent, reduceMotion, tone = "gain" }) {
  const clamped = Math.min(100, Math.max(0, percent));
  const color = tone === "gain" ? "var(--color-gain-400)" : "var(--color-gold-400)";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={reduceMotion ? { width: `${clamped}%` } : { width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.9, ease: "easeOut", delay: 0.3 }}
      />
    </div>
  );
}

function QuickAction({ icon: Icon, label, sublabel, tone, onClick, index, reduceMotion }) {
  const toneStyles = {
    plum: "from-[var(--color-plum-500)] to-[var(--color-plum-600)] hover:shadow-[0_12px_36px_-8px_rgba(140,103,224,0.55)]",
    gain: "from-[var(--color-gain-500)] to-[#0e8f63] hover:shadow-[0_12px_36px_-8px_rgba(20,184,127,0.5)]",
    rose: "from-[var(--color-rose-500)] to-[#c53f60] hover:shadow-[0_12px_36px_-8px_rgba(227,87,122,0.5)]",
  };

  const motionProps = reduceMotion
    ? { initial: { opacity: 1, y: 0 }, animate: { opacity: 1, y: 0 } }
    : {
        initial: { opacity: 0, y: 15 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4, delay: index * 0.06 },
      };

  return (
    <motion.button
      {...motionProps}
      whileHover={reduceMotion ? undefined : { scale: 1.02 }}
      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
      type="button"
      onClick={onClick}
      className={`group flex flex-1 items-center gap-4 rounded-2xl bg-gradient-to-br ${toneStyles[tone]} p-5 text-left text-white shadow-lg shadow-black/20 transition-shadow duration-300 focus-visible:outline-offset-4`}
    >
      <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-white/15">
        <Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block font-display text-lg font-semibold leading-tight">{label}</span>
        <span className="block truncate text-sm text-white/75">{sublabel}</span>
      </span>
      <ChevronRight
        className="ml-auto h-5 w-5 flex-none text-white/60 transition-transform duration-300 group-hover:translate-x-1"
        aria-hidden="true"
      />
    </motion.button>
  );
}

export default function DashboardPage() {
  const prefersReducedMotion = useReducedMotion();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isTreasurer = user?.role === "treasurer";

  const { cycles, status: cyclesStatus } = useCycles(user?.group_id);
  const activeCycle = useMemo(() => cycles.find((c) => c.status === "active") ?? cycles[0] ?? null, [cycles]);
  const { summary, status: summaryStatus } = useCycleSummary(user?.group_id, activeCycle?.id);

  const { loans } = useLoans(user?.group_id);
  const myActiveLoan = useMemo(
    () => loans.find((l) => l.member_id === user?.id && ["disbursed", "pending"].includes(l.status)) ?? null,
    [loans, user?.id]
  );
  const { days, hours, isPast } = daysHoursUntil(myActiveLoan?.due_on);

  const myContribution = useMemo(
    () => summary?.members?.find((m) => m.user_id === user?.id) ?? null,
    [summary, user?.id]
  );

  const isLoading = cyclesStatus === "loading" || summaryStatus === "loading";

  return (
    <div className="pb-4">
      <motion.header
        initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-plum-300)]">
          Your circle, at a glance
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold sm:text-4xl">
          {getGreeting()}, {user?.full_name?.split(" ")[0] ?? "there"}
        </h1>
      </motion.header>

      {!activeCycle && cyclesStatus === "idle" ? (
        <GlassCard index={1} className="mt-8 flex flex-col items-center gap-3 py-14 text-center">
          <AlertTriangle className="h-6 w-6 text-[var(--color-gold-300)]" aria-hidden="true" />
          <p className="font-display text-lg font-semibold">No cycle has been opened yet</p>
          <p className="max-w-sm text-sm text-white/55">
            {isTreasurer
              ? "Open this group's first contribution cycle to start tracking savings."
              : "Your treasurer hasn't opened a contribution cycle yet. Check back soon."}
          </p>
          {isTreasurer && (
            <button
              type="button"
              onClick={() => navigate("/cycles/new")}
              className="mt-2 flex items-center gap-1.5 rounded-full bg-[var(--color-plum-500)] px-4 py-2 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Open a cycle
            </button>
          )}
        </GlassCard>
      ) : (
        <>
          {/* Financial snapshot */}
          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
            {/* Card A — Personal contribution this cycle */}
            <GlassCard index={1}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-white/60">This cycle's contribution</p>
                  <p className="mt-2 font-display text-3xl font-semibold tracking-tight">
                    {formatKES(myContribution?.amount_paid ?? 0)}
                  </p>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-gain-500)]/15 text-[var(--color-gain-400)]">
                  <PiggyBank className="h-5 w-5" aria-hidden="true" />
                </span>
              </div>

              <p className="mt-4 text-sm text-white/50">
                of {formatKES(summary?.financial_summary?.expected_per_member ?? 0)} expected
              </p>

              <div className="mt-4">
                <ProgressBar
                  percent={
                    summary?.financial_summary?.expected_per_member
                      ? ((myContribution?.amount_paid ?? 0) / summary.financial_summary.expected_per_member) * 100
                      : 0
                  }
                  reduceMotion={prefersReducedMotion}
                />
              </div>
            </GlassCard>

            {/* Card B — Outstanding loan */}
            <GlassCard index={2}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-white/60">Outstanding loan</p>
                  <p className="mt-2 font-display text-3xl font-semibold tracking-tight">
                    {myActiveLoan ? formatKES(myActiveLoan.remaining_balance) : formatKES(0)}
                  </p>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-rose-500)]/15 text-[var(--color-rose-400)]">
                  <HandCoins className="h-5 w-5" aria-hidden="true" />
                </span>
              </div>

              {myActiveLoan ? (
                <>
                  <p className="mt-4 text-sm text-white/50">of {formatKES(myActiveLoan.principal)} principal borrowed</p>
                  <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2.5">
                    <Clock className="h-4 w-4 flex-none text-[var(--color-gold-300)]" aria-hidden="true" />
                    <p className="text-sm">
                      <span className="font-semibold text-white">
                        {isPast ? "Overdue" : `${days}d ${hours}h`}
                      </span>{" "}
                      <span className="text-white/55">{isPast ? "— contact your treasurer" : "left to repay"}</span>
                    </p>
                  </div>
                </>
              ) : (
                <p className="mt-4 text-sm text-white/45">No active loan right now.</p>
              )}
            </GlassCard>

            {/* Card C — Group pool capital */}
            <GlassCard index={3}>
              <div className="flex items-center gap-5">
                <CircleGauge
                  percent={summary?.financial_summary?.collection_rate_percentage ?? 0}
                  reduceMotion={prefersReducedMotion}
                />
                <div className="min-w-0">
                  <p className="text-sm text-white/60">Group pool, this cycle</p>
                  <p className="mt-1 truncate font-display text-2xl font-semibold tracking-tight">
                    {formatKES(summary?.financial_summary?.total_collected ?? 0)}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-white/50">
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    {summary?.financial_summary?.total_members ?? 0} members ·{" "}
                    {summary?.financial_summary?.collection_rate_percentage ?? 0}% collected
                  </p>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Quick actions */}
          <div className="mt-5 flex flex-col gap-4 sm:flex-row">
            <QuickAction
              icon={Wallet}
              label="Deposit savings"
              sublabel={isTreasurer ? "Record a member's contribution" : "View this cycle's status"}
              tone="plum"
              index={4}
              reduceMotion={prefersReducedMotion}
              onClick={() => navigate(`/cycles/${activeCycle.id}`)}
            />
            <QuickAction
              icon={HandCoins}
              label="Request emergency loan"
              sublabel={isTreasurer ? "Issue a new loan" : "Contact your treasurer"}
              tone="rose"
              index={5}
              reduceMotion={prefersReducedMotion}
              onClick={() => navigate("/loans")}
            />
            <QuickAction
              icon={ReceiptText}
              label="Repay loan"
              sublabel={myActiveLoan ? `${formatKES(myActiveLoan.remaining_balance)} remaining` : "No active loan"}
              tone="gain"
              index={6}
              reduceMotion={prefersReducedMotion}
              onClick={() => (myActiveLoan ? navigate(`/loans/${myActiveLoan.id}`) : navigate("/loans"))}
            />
          </div>

          {/* Defaulters (treasurer only) */}
          {isTreasurer && summary?.defaulters?.length > 0 && (
            <GlassCard index={7} className="mt-5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4.5 w-4.5 text-[var(--color-rose-400)]" aria-hidden="true" />
                <h2 className="font-display text-lg font-semibold">
                  {summary.defaulters.length} member{summary.defaulters.length === 1 ? "" : "s"} yet to contribute
                </h2>
              </div>
              <ul className="mt-4 flex flex-wrap gap-2">
                {summary.defaulters.map((d) => (
                  <li key={d.user_id} className="rounded-full bg-white/5 px-3 py-1.5 text-sm text-white/70">
                    {d.full_name}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => navigate(`/cycles/${activeCycle.id}`)}
                className="mt-4 flex items-center gap-1 text-sm font-medium text-[var(--color-plum-300)] hover:text-white"
              >
                View full breakdown
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </GlassCard>
          )}

          {isLoading && <p className="mt-6 text-sm text-white/40">Loading the latest figures…</p>}
        </>
      )}
    </div>
  );
}