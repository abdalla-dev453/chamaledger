import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, X, AlertCircle, HandCoins } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useLoans, useLoanDetail } from "../hooks/useLoans";
import { useMembers } from "../hooks/useMembers";
import { api, ApiError } from "../services/api";
import { formatKES, formatDate } from "../utils/formatters";
import GlassCard from "../components/ui/GlassCard";
import StatusChip from "../components/ui/StatusChip";
import Table from "../components/ui/Table";

const inputClasses =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-[var(--color-plum-400)] focus:bg-white/[0.07]";

function IssueLoanForm({ groupId, onClose, onIssued }) {
  const { members } = useMembers(groupId);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    try {
      await api.loans.issue(groupId, {
        member_id: form.get("member_id"),
        principal: Number(form.get("principal")),
        interest_rate: Number(form.get("interest_rate") || 0),
        due_on: form.get("due_on"),
      });
      onIssued();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not issue this loan.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
      <GlassCard index={0} className="mb-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Issue a loan</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-white/50 hover:text-white">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {error && (
          <div role="alert" className="mt-4 flex items-center gap-2 rounded-xl bg-[var(--color-rose-500)]/15 px-3.5 py-3 text-sm text-[var(--color-rose-300)]">
            <AlertCircle className="h-4 w-4 flex-none" aria-hidden="true" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="member_id" className="mb-1.5 block text-sm font-medium text-white/70">Member</label>
            <select id="member_id" name="member_id" required className={inputClasses}>
              <option value="">Select a member…</option>
              {members.map((m) => (
                <option key={m.id} value={m.id} className="bg-[var(--color-ink-900)]">
                  {m.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="principal" className="mb-1.5 block text-sm font-medium text-white/70">Principal (KSh)</label>
            <input id="principal" name="principal" type="number" min="1" step="1" required className={inputClasses} />
          </div>
          <div>
            <label htmlFor="interest_rate" className="mb-1.5 block text-sm font-medium text-white/70">Interest rate (%)</label>
            <input id="interest_rate" name="interest_rate" type="number" min="0" step="0.1" defaultValue={0} className={inputClasses} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="due_on" className="mb-1.5 block text-sm font-medium text-white/70">Due date</label>
            <input id="due_on" name="due_on" type="date" required className={inputClasses} />
          </div>
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={submitting}
            className="sm:col-span-2 rounded-xl bg-gradient-to-br from-[var(--color-plum-400)] to-[var(--color-plum-600)] py-3 text-sm font-semibold text-white shadow-lg shadow-black/30 disabled:opacity-60"
          >
            {submitting ? "Issuing…" : "Issue loan"}
          </motion.button>
        </form>
      </GlassCard>
    </motion.div>
  );
}

function RepayForm({ groupId, loanId, onRepaid }) {
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    try {
      await api.loans.repay(groupId, loanId, {
        amount: Number(form.get("amount")),
        mpesa_code: form.get("mpesa_code") || undefined,
      });
      event.currentTarget.reset();
      onRepaid();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not record this repayment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
      <input name="amount" type="number" min="1" step="1" placeholder="Amount (KSh)" required className={`${inputClasses} sm:w-40`} />
      <input name="mpesa_code" type="text" placeholder="M-Pesa code (optional)" className={inputClasses} />
      <button type="submit" disabled={submitting} className="flex-none rounded-xl bg-[var(--color-gain-500)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
        {submitting ? "Saving…" : "Record repayment"}
      </button>
      {error && <span className="self-center text-sm text-[var(--color-rose-300)]">{error}</span>}
    </form>
  );
}

function LoanDetailPanel({ groupId, loanId, isTreasurer, onClose }) {
  const { loan, refetch } = useLoanDetail(groupId, loanId);
  if (!loan) return null;

  return (
    <GlassCard index={0} className="mb-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-white/55">{loan.member_name}</p>
          <h2 className="mt-1 font-display text-2xl font-semibold">{formatKES(loan.remaining_balance)} remaining</h2>
          <div className="mt-2 flex items-center gap-2">
            <StatusChip status={loan.status} />
            <span className="text-xs text-white/45">Due {formatDate(loan.due_on)}</span>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="text-white/50 hover:text-white">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-white/[0.06] pt-5 text-sm">
        <div>
          <dt className="text-white/45">Principal</dt>
          <dd className="mt-1 font-semibold">{formatKES(loan.principal)}</dd>
        </div>
        <div>
          <dt className="text-white/45">Total payable</dt>
          <dd className="mt-1 font-semibold">{formatKES(loan.total_payable)}</dd>
        </div>
        <div>
          <dt className="text-white/45">Total paid</dt>
          <dd className="mt-1 font-semibold">{formatKES(loan.total_paid)}</dd>
        </div>
      </dl>

      {loan.repayments.length > 0 && (
        <ul className="mt-5 space-y-2 border-t border-white/[0.06] pt-5">
          {loan.repayments.map((r) => (
            <li key={r.id} className="flex items-center justify-between text-sm">
              <span className="text-white/60">{formatDate(r.paid_on)}{r.mpesa_code ? ` · ${r.mpesa_code}` : ""}</span>
              <span className="font-semibold text-[var(--color-gain-400)]">+ {formatKES(r.amount)}</span>
            </li>
          ))}
        </ul>
      )}

      {isTreasurer && loan.status !== "cleared" ? (
        <RepayForm groupId={groupId} loanId={loanId} onRepaid={refetch} />
      ) : (
        !isTreasurer &&
        loan.status !== "cleared" && (
          <p className="mt-4 text-sm text-white/45">Contact your treasurer to record a repayment.</p>
        )
      )}
    </GlassCard>
  );
}

export default function LoansPage() {
  const { loanId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isTreasurer = user?.role === "treasurer";
  const { loans, status, error, refetch } = useLoans(user?.group_id);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState(loanId ?? null);

  useEffect(() => {
    setSelectedLoanId(loanId ?? null);
  }, [loanId]);

  const columns = [
    {
      key: "member",
      header: "Member",
      render: (row) => <span className="font-medium text-white">{row.member_name}</span>,
    },
    { key: "principal", header: "Principal", align: "right", render: (row) => formatKES(row.principal) },
    { key: "remaining_balance", header: "Balance", align: "right", render: (row) => formatKES(row.remaining_balance) },
    { key: "due_on", header: "Due", align: "right", render: (row) => formatDate(row.due_on) },
    { key: "status", header: "Status", align: "right", render: (row) => <StatusChip status={row.status} /> },
  ];

  return (
    <div className="pb-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-plum-300)]">Lending</p>
          <h1 className="mt-1 font-display text-3xl font-semibold">Loans</h1>
        </div>
        {isTreasurer && (
          <button
            type="button"
            onClick={() => setShowIssueForm((v) => !v)}
            className="flex items-center gap-1.5 rounded-full bg-[var(--color-plum-500)] px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Issue loan
          </button>
        )}
      </div>

      {!isTreasurer && (
        <p className="mt-3 max-w-xl text-sm text-white/50">
          <HandCoins className="mr-1 inline h-4 w-4 align-text-bottom" aria-hidden="true" />
          Need a loan? Reach out to your treasurer — new loans are issued after guarantor approval.
        </p>
      )}

      {showIssueForm && isTreasurer && (
        <div className="mt-6">
          <IssueLoanForm groupId={user.group_id} onClose={() => setShowIssueForm(false)} onIssued={refetch} />
        </div>
      )}

      {selectedLoanId && (
        <div className="mt-6">
          <LoanDetailPanel
            groupId={user.group_id}
            loanId={selectedLoanId}
            isTreasurer={isTreasurer}
            onClose={() => {
              setSelectedLoanId(null);
              navigate("/loans");
            }}
          />
        </div>
      )}

      {error && <p className="mt-6 text-sm text-[var(--color-rose-300)]">{error}</p>}

      <GlassCard index={1} className="mt-6">
        <div className="overflow-x-auto">
          <Table
            columns={columns}
            rows={loans}
            caption="Loans issued to group members"
            isLoading={status === "loading"}
            emptyMessage={isTreasurer ? "No loans issued yet." : "You have no loans yet."}
            onRowClick={(row) => navigate(`/loans/${row.id}`)}
          />
        </div>
      </GlassCard>
    </div>
  );
}