import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronDown, Lock, Plus, Wallet, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useCycles, useCycleSummary } from "../hooks/useCycles";
import { api, ApiError } from "../services/api";
import { formatKES, formatDate } from "../utils/formatters";
import GlassCard from "../components/ui/GlassCard";
import StatusChip from "../components/ui/StatusChip";
import Table from "../components/ui/Table";

const inputClasses =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-[var(--color-plum-400)] focus:bg-white/[0.07]";

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
    <GlassCard index={0} className="mx-auto mt-8 max-w-md">
      <h1 className="font-display text-2xl font-semibold">Open a new cycle</h1>
      <p className="mt-1 text-sm text-white/55">Members will contribute toward this cycle's target.</p>

      {error && (
        <div role="alert" className="mt-4 flex items-center gap-2 rounded-xl bg-[var(--color-rose-500)]/15 px-3.5 py-3 text-sm text-[var(--color-rose-300)]">
          <AlertCircle className="h-4 w-4 flex-none" aria-hidden="true" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label htmlFor="period_start" className="mb-1.5 block text-sm font-medium text-white/70">Start date</label>
          <input id="period_start" name="period_start" type="date" required className={inputClasses} />
        </div>
        <div>
          <label htmlFor="period_end" className="mb-1.5 block text-sm font-medium text-white/70">End date</label>
          <input id="period_end" name="period_end" type="date" required className={inputClasses} />
        </div>
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-gradient-to-br from-[var(--color-plum-400)] to-[var(--color-plum-600)] py-3 text-sm font-semibold text-white shadow-lg shadow-black/30 disabled:opacity-60"
        >
          {submitting ? "Opening cycle…" : "Open cycle"}
        </motion.button>
      </form>
    </GlassCard>
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
        className="flex items-center gap-1 rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        Record
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input
        name="amount"
        type="number"
        min="1"
        step="1"
        placeholder="Amount"
        required
        autoFocus
        className="w-24 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white outline-none focus:border-[var(--color-plum-400)]"
      />
      <select
        name="method"
        defaultValue="cash"
        className="rounded-lg border border-white/10 bg-[var(--color-ink-900)] px-2 py-1.5 text-xs text-white outline-none focus:border-[var(--color-plum-400)]"
      >
        <option value="cash">Cash</option>
        <option value="bank_transfer">Bank transfer</option>
        <option value="mpesa">M-Pesa</option>
      </select>
      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className="rounded-lg bg-[var(--color-gain-500)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
          {submitting ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/70">
          Cancel
        </button>
      </div>
      {error && <span className="text-xs text-[var(--color-rose-300)]">{error}</span>}
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
      header: "Member",
      render: (row) => (
        <div>
          <p className="font-medium text-white">{row.full_name}</p>
          <p className="text-xs text-white/45">{row.phone_number}</p>
        </div>
      ),
    },
    { key: "amount_paid", header: "Paid", align: "right", render: (row) => formatKES(row.amount_paid) },
    { key: "balance_due", header: "Balance", align: "right", render: (row) => formatKES(row.balance_due) },
    { key: "status", header: "Status", align: "right", render: (row) => <StatusChip status={row.status} /> },
    ...(isTreasurer
      ? [
          {
            key: "actions",
            header: "",
            align: "right",
            render: (row) => (
              <RecordContributionRow groupId={user.group_id} cycleId={cycleId} member={row} onRecorded={refetch} />
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="pb-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-plum-300)]">Cycle detail</p>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="font-display text-3xl font-semibold">
              {summary ? `${formatDate(summary.cycle.period_start)} — ${formatDate(summary.cycle.period_end)}` : "…"}
            </h1>
            {summary && <StatusChip status={summary.cycle.status} />}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setSwitcherOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full glass-panel px-4 py-2 text-sm font-medium text-white/80"
            >
              Switch cycle
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </button>
            {switcherOpen && (
              <div className="absolute right-0 z-10 mt-2 w-56 overflow-hidden rounded-2xl glass-panel p-1">
                {cycles.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSwitcherOpen(false);
                      navigate(`/cycles/${c.id}`);
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-white/80 hover:bg-white/10 hover:text-white"
                  >
                    {formatDate(c.period_start)}
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
                    className="flex w-full items-center gap-1.5 rounded-xl px-3 py-2 text-left text-sm font-semibold text-[var(--color-plum-300)] hover:bg-white/10"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Open new cycle
                  </button>
                )}
              </div>
            )}
          </div>

          {isTreasurer && summary?.cycle.status === "active" && (
            <button
              type="button"
              onClick={handleClose}
              disabled={closing}
              className="flex items-center gap-1.5 rounded-full bg-[var(--color-rose-500)]/90 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Lock className="h-4 w-4" aria-hidden="true" />
              {closing ? "Closing…" : "Close cycle"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="mt-6 flex items-center gap-2 rounded-xl bg-[var(--color-rose-500)]/15 px-4 py-3 text-sm text-[var(--color-rose-300)]">
          <AlertCircle className="h-4 w-4 flex-none" aria-hidden="true" />
          {error}
        </div>
      )}

      {summary && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Expected", value: summary.financial_summary.total_expected },
              { label: "Collected", value: summary.financial_summary.total_collected },
              { label: "Deficit", value: summary.financial_summary.total_deficit },
              { label: "Per member", value: summary.financial_summary.expected_per_member },
            ].map((stat, i) => (
              <GlassCard key={stat.label} index={i} className="p-4">
                <p className="text-xs text-white/50">{stat.label}</p>
                <p className="mt-1 font-display text-xl font-semibold">{formatKES(stat.value)}</p>
              </GlassCard>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3 text-sm text-white/60">
            <span className="flex items-center gap-1.5 rounded-full bg-[var(--color-gain-500)]/10 px-3 py-1.5 text-[var(--color-gain-400)]">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              {summary.breakdown.paid_in_full} paid in full
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-[var(--color-gold-400)]/10 px-3 py-1.5 text-[var(--color-gold-300)]">
              <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
              {summary.breakdown.partial_payment} partial
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-[var(--color-rose-500)]/10 px-3 py-1.5 text-[var(--color-rose-400)]">
              <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
              {summary.breakdown.unpaid} unpaid
            </span>
          </div>

          <GlassCard index={4} className="mt-6">
            <h2 className="font-display text-lg font-semibold">Member breakdown</h2>
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