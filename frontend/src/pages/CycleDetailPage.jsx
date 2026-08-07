import { useState } from "react";
import { useNavigate, useParams } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronDown, 
  Lock, 
  Plus, 
  Wallet, 
  AlertCircle, 
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  X,
  Save,
  Clock,
  TrendingUp,
  PieChart
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useCycles, useCycleSummary } from "../hooks/useCycles";
import { api, ApiError } from "../services/api";
import { formatKES, formatDate } from "../utils/formatters";
import GlassCard from "../components/ui/GlassCard";
import StatusChip from "../components/ui/StatusChip";
import Table from "../components/ui/Table";

const inputClasses =
  "w-full rounded-xl border border-slate-700/80 bg-slate-950/80 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-all duration-200 focus:border-emerald-500/80 focus:ring-2 focus:ring-emerald-500/20";

/** Shown when the treasurer navigates here to open the group's first cycle. */
function CreateCycleForm({ groupId, onCreated }) {
  const { createCycle } = useCycles(groupId);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    try {
      const cycle = await createCycle({
        period_start: form.get("period_start"),
        period_end: form.get("period_end"),
      });
      onCreated(cycle.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the cycle.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-[80vh] flex items-center justify-center p-4">
      <div className="pointer-events-none absolute h-96 w-96 rounded-full bg-emerald-500/10 blur-[140px]" />
      
      <GlassCard index={0} className="w-full max-w-md border-slate-800/80 bg-slate-900/80 p-8 backdrop-blur-xl relative z-10 shadow-2xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 mb-4">
          <Calendar className="h-3.5 w-3.5" /> Cycle Setup
        </div>
        <h1 className="font-display text-2xl font-black text-white tracking-tight">Open New Cycle</h1>
        <p className="mt-1 text-xs text-slate-400 font-medium leading-relaxed">
          Specify start and end dates. Members will submit contributions against this target window.
        </p>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }} 
            animate={{ opacity: 1, y: 0 }} 
            role="alert" 
            className="mt-4 flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-medium text-rose-300"
          >
            <AlertCircle className="h-4 w-4 flex-none text-rose-400" aria-hidden="true" />
            <span>{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="period_start" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
              Period Start
            </label>
            <input id="period_start" name="period_start" type="date" required className={inputClasses} />
          </div>
          <div>
            <label htmlFor="period_end" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
              Period End
            </label>
            <input id="period_end" name="period_end" type="date" required className={inputClasses} />
          </div>
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition-all hover:brightness-110 disabled:opacity-50"
          >
            {submitting ? "Initializing Cycle…" : "Open Cycle"}
          </motion.button>
        </form>
      </GlassCard>
    </div>
  );
}

function RecordContributionRow({ groupId, cycleId, member, onRecorded }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
 try {
      await api.contributions.record(groupId, cycleId, {
        member_id: member.user_id,
        amount: Number(form.get("amount")),
        method: form.get("method"),
      });
      setOpen(false);
      onRecorded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not record this contribution.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400 transition-all hover:bg-emerald-500/20 hover:border-emerald-500/50"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        Record
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-center justify-end">
      <input
        name="amount"
        type="number"
        min="1"
        step="1"
        placeholder="Amount"
        required
        autoFocus
        className="w-28 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
      />
      <select
        name="method"
        defaultValue="cash"
        className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-emerald-500"
      >
        <option value="cash">Cash</option>
        <option value="bank_transfer">Bank Transfer</option>
        <option value="mpesa">M-Pesa</option>
      </select>
      <div className="flex gap-1.5">
        <button 
          type="submit" 
          disabled={submitting} 
          className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
        >
          <Save className="h-3 w-3" />
          {submitting ? "..." : "Save"}
        </button>
        <button 
          type="button" 
          onClick={() => setOpen(false)} 
          className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      {error && <span className="text-xs text-rose-400 font-medium">{error}</span>}
    </form>
  );
}

export default function CycleDetailPage() {
  const { cycleId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isTreasurer = user?.role === "treasurer";

  const { cycles, closeCycle } = useCycles(user?.group_id);
  const { summary, status, error, refetch } = useCycleSummary(user?.group_id, cycleId === "new" ? null : cycleId);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  if (cycleId === "new") {
    return <CreateCycleForm groupId={user?.group_id} onCreated={(id) => navigate(`/cycles/${id}`, { replace: true })} />;
  }

  async function handleClose() {
    setClosing(true);
    try {
      await closeCycle(cycleId);
      await refetch();
    } finally {
      setClosing(false);
    }
  }

  const columns = [
    {
      key: "member",
      header: "Member Profile",
      render: (row) => (
        <div className="flex items-center gap-3 py-0.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200">
            {row.full_name?.substring(0, 2).toUpperCase() || "MB"}
          </div>
          <div>
            <p className="font-bold text-slate-100">{row.full_name}</p>
            <p className="text-xs font-mono text-slate-400">{row.phone_number}</p>
          </div>
        </div>
      ),
    },
    { 
      key: "amount_paid", 
      header: "Paid", 
      align: "right", 
      render: (row) => <span className="font-bold text-emerald-400">{formatKES(row.amount_paid)}</span> 
    },
    { 
      key: "balance_due", 
      header: "Balance", 
      align: "right", 
      render: (row) => (
        <span className={`font-medium ${row.balance_due > 0 ? "text-amber-400" : "text-slate-400"}`}>
          {formatKES(row.balance_due)}
        </span>
      )
    },
    { 
      key: "status", 
      header: "Status", 
      align: "right", 
      render: (row) => <StatusChip status={row.status} /> 
    },
    ...(isTreasurer
      ? [
          {
            key: "actions",
            header: "Quick Action",
            align: "right",
            render: (row) => (
              <RecordContributionRow groupId={user.group_id} cycleId={cycleId} member={row} onRecorded={refetch} />
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="relative min-h-screen text-slate-100 pb-12">
      {/* Visual Ambient Glow */}
      <div className="pointer-events-none absolute -top-10 left-10 h-96 w-96 rounded-full bg-emerald-500/10 blur-[140px]" />
      <div className="pointer-events-none absolute top-1/2 right-10 h-80 w-80 rounded-full bg-cyan-500/10 blur-[120px]" />

      {/* Header Bar */}
      <div className="border-b border-slate-800 pb-6 relative z-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 mb-2">
            <Layers className="h-3.5 w-3.5" /> Cycle Analytics
          </div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-black text-white sm:text-3xl tracking-tight">
              {summary ? `${formatDate(summary.cycle.period_start)} — ${formatDate(summary.cycle.period_end)}` : "Loading cycle..."}
            </h1>
            {summary && <StatusChip status={summary.cycle.status} />}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setSwitcherOpen((v) => !v)}
              className="flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/80 px-4 py-2.5 text-xs font-bold text-slate-200 transition-all hover:bg-slate-800 hover:border-slate-600 shadow-md"
            >
              Switch Cycle
              <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
            </button>
            <AnimatePresence>
              {switcherOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-2xl backdrop-blur-xl"
                >
                  {cycles.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSwitcherOpen(false);
                        navigate(`/cycles/${c.id}`);
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                      <span>{formatDate(c.period_start)}</span>
                      <StatusChip status={c.status} />
                    </button>
                  ))}
                  {isTreasurer && (
                    <button
                      type="button"
                      onClick={() => {
                        setSwitcherOpen(false);
                        navigate("/cycles/new");
                      }}
                      className="flex w-full items-center gap-2 rounded-lg border-t border-slate-800 mt-1 px-3 py-2 text-left text-xs font-bold text-emerald-400 hover:bg-emerald-500/10"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      Open New Cycle
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {isTreasurer && summary?.cycle.status === "active" && (
            <button
              type="button"
              onClick={handleClose}
              disabled={closing}
              className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-bold text-rose-300 transition-all hover:bg-rose-500/20 disabled:opacity-50"
            >
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              {closing ? "Closing..." : "Close Cycle"}
            </button>
          )}
        </div>
      </div>

      {/* Global Errors */}
      {error && (
        <div role="alert" className="mt-6 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-medium text-rose-300">
          <AlertCircle className="h-4 w-4 flex-none text-rose-400" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {summary && (
        <>
          {/* Summary Metric Grid */}
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 relative z-10">
            {[
              { label: "Expected Target", value: summary.financial_summary.total_expected, color: "text-slate-100", border: "border-slate-800" },
              { label: "Total Collected", value: summary.financial_summary.total_collected, color: "text-emerald-400", border: "border-emerald-500/30 bg-emerald-950/10" },
              { label: "Outstanding Deficit", value: summary.financial_summary.total_deficit, color: "text-amber-400", border: "border-amber-500/20" },
              { label: "Target Per Member", value: summary.financial_summary.expected_per_member, color: "text-cyan-400", border: "border-slate-800" },
            ].map((stat, i) => (
              <GlassCard key={stat.label} index={i} className={`p-5 border-slate-800/80 bg-slate-900/60 backdrop-blur-xl ${stat.border}`}>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{stat.label}</p>
                <p className={`mt-2 font-display text-2xl font-black ${stat.color}`}>{formatKES(stat.value)}</p>
              </GlassCard>
            ))}
          </div>

          {/* Member Status Breakdown Pill Row */}
          <div className="mt-6 flex flex-wrap gap-3 text-xs font-bold relative z-10">
            <span className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {summary.breakdown.paid_in_full} Paid In Full
            </span>
            <span className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-amber-300">
              <Wallet className="h-4 w-4" aria-hidden="true" />
              {summary.breakdown.partial_payment} Partial Payment
            </span>
            <span className="flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-rose-400">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              {summary.breakdown.unpaid} Unpaid
            </span>
          </div>

          {/* Member Breakdown Table */}
          <GlassCard index={4} className="mt-8 border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-xl relative z-10 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
              <div>
                <h2 className="font-display text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-emerald-400" /> Member Ledger Roster
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Individual payment metrics and balance tracking for this contribution window.
                </p>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <Table
                columns={columns}
                rows={summary.members}
                caption="Every member's contribution status for this cycle"
                isLoading={status === "loading"}
              />
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
}