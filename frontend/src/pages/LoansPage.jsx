import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle, HandCoins, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import GlassCard from "../components/ui/GlassCard";
import StatusChip from "../components/ui/StatusChip";
import Table from "../components/ui/Table";
import { useLoanDetail, useLoans } from "../hooks/useLoans";
import { useMembers } from "../hooks/useMembers";
import { api, ApiError } from "../services/api";
import { useAuthStore } from "../store/useAuthStore";
import { formatDate, formatKES } from "../utils/formatters";

const inputClasses =
  "w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-all duration-200 focus:border-emerald-500/80 focus:ring-2 focus:ring-emerald-500/20";

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
      setError(
        err instanceof ApiError ? err.message : "Could not issue this loan.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -15, scale: 0.98 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <GlassCard
        index={0}
        className="mb-8 border-emerald-500/30 bg-slate-900/80 p-6 backdrop-blur-xl shadow-2xl shadow-emerald-950/20"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <HandCoins className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-white">
                Issue Member Micro-Loan
              </h2>
              <p className="text-xs text-slate-400">
                Authorize capital disbursement from Chama pool
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"
          >
            <AlertCircle className="h-4 w-4 flex-none" aria-hidden="true" />
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <label
              htmlFor="member_id"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300"
            >
              Borrowing Member
            </label>
            <select
              id="member_id"
              name="member_id"
              required
              className={inputClasses}
            >
              <option value="">Select a Chama member…</option>
              {members.map((m) => (
                <option
                  key={m.id}
                  value={m.id}
                  className="bg-slate-900 text-slate-100"
                >
                  {m.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="principal"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300"
            >
              Principal Amount (KSh)
            </label>
            <input
              id="principal"
              name="principal"
              type="number"
              min="1"
              step="1"
              placeholder="e.g. 25000"
              required
              className={inputClasses}
            />
          </div>
          <div>
            <label
              htmlFor="interest_rate"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300"
            >
              Interest Rate (%)
            </label>
            <input
              id="interest_rate"
              name="interest_rate"
              type="number"
              min="0"
              step="0.1"
              defaultValue={0}
              className={inputClasses}
            />
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="due_on"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300"
            >
              Repayment Due Date
            </label>
            <input
              id="due_on"
              name="due_on"
              type="date"
              required
              className={inputClasses}
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={submitting}
            className="sm:col-span-2 mt-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 disabled:opacity-60 transition"
          >
            {submitting ? "Authorizing & Disbursing…" : "Confirm & Issue Loan"}
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
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not record this repayment.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 flex flex-col gap-3 sm:flex-row items-center border-t border-slate-800 pt-5"
    >
      <input
        name="amount"
        type="number"
        min="1"
        step="1"
        placeholder="Amount (KSh)"
        required
        className={`${inputClasses} sm:w-44`}
      />
      <input
        name="mpesa_code"
        type="text"
        placeholder="M-Pesa code (e.g. QX8923KL)"
        className={inputClasses}
      />
      <button
        type="submit"
        disabled={submitting}
        className="w-full sm:w-auto flex-none rounded-xl bg-emerald-500 hover:bg-emerald-400 px-6 py-2.5 text-sm font-bold text-slate-950 transition shadow-md shadow-emerald-500/20 disabled:opacity-60"
      >
        {submitting ? "Processing…" : "Record Repayment"}
      </button>
      {error && (
        <span className="text-xs font-semibold text-rose-400">{error}</span>
      )}
    </form>
  );
}

function LoanDetailPanel({ groupId, loanId, isTreasurer, onClose }) {
  const { loan, refetch } = useLoanDetail(groupId, loanId);
  if (!loan) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <GlassCard
        index={0}
        className="mb-8 border-slate-800/80 bg-slate-900/90 p-6 backdrop-blur-xl shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-400 p-[2px]">
              <div className="h-full w-full rounded-full bg-slate-950 flex items-center justify-center font-bold text-sm text-purple-300 uppercase">
                {loan.member_name?.substring(0, 2) || "MB"}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {loan.member_name}
              </p>
              <h2 className="font-display text-2xl font-black text-white tracking-tight">
                {formatKES(loan.remaining_balance)}{" "}
                <span className="text-xs font-normal text-slate-400">
                  balance
                </span>
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusChip status={loan.status} />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Financial Metrics Row */}
        <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3 border-t border-b border-slate-800 py-4">
          <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/60">
            <dt className="text-xs font-medium text-slate-400">
              Principal Borrowed
            </dt>
            <dd className="mt-1 text-lg font-bold text-slate-100">
              {formatKES(loan.principal)}
            </dd>
          </div>
          <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/60">
            <dt className="text-xs font-medium text-slate-400">
              Total Payable
            </dt>
            <dd className="mt-1 text-lg font-bold text-slate-100">
              {formatKES(loan.total_payable)}
            </dd>
          </div>
          <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/60">
            <dt className="text-xs font-medium text-slate-400">
              Total Cleared Paid
            </dt>
            <dd className="mt-1 text-lg font-bold text-emerald-400">
              {formatKES(loan.total_paid)}
            </dd>
          </div>
        </dl>

        {/* Repayment Logs */}
        {loan.repayments.length > 0 && (
          <div className="mt-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Repayment History
            </h3>
            <ul className="space-y-2">
              {loan.repayments.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-xl bg-slate-950/60 border border-slate-800/80 px-4 py-2.5 text-xs"
                >
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    <span>{formatDate(r.paid_on)}</span>
                    {r.mpesa_code && (
                      <span className="font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {r.mpesa_code}
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-emerald-400 text-sm">
                    + {formatKES(r.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {isTreasurer && loan.status !== "cleared" ? (
          <RepayForm groupId={groupId} loanId={loanId} onRepaid={refetch} />
        ) : (
          !isTreasurer &&
          loan.status !== "cleared" && (
            <p className="mt-4 text-xs font-medium text-slate-400">
              * Contact your Chama treasurer to initiate M-Pesa manual
              verification for loan repayments.
            </p>
          )
        )}
      </GlassCard>
    </motion.div>
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
      render: (row) => (
        <span className="font-bold text-slate-100 flex items-center gap-2">
          {row.member_name}
        </span>
      ),
    },
    {
      key: "principal",
      header: "Principal",
      align: "right",
      render: (row) => (
        <span className="text-slate-300 font-medium">
          {formatKES(row.principal)}
        </span>
      ),
    },
    {
      key: "remaining_balance",
      header: "Balance",
      align: "right",
      render: (row) => (
        <span className="font-bold text-white">
          {formatKES(row.remaining_balance)}
        </span>
      ),
    },
    {
      key: "due_on",
      header: "Due Date",
      align: "right",
      render: (row) => (
        <span className="text-slate-400 text-xs">{formatDate(row.due_on)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "right",
      render: (row) => <StatusChip status={row.status} />,
    },
  ];

  return (
    <div className="relative min-h-screen text-slate-100 pb-12">
      {/* Background Lights */}
      <div className="pointer-events-none absolute -top-10 right-20 h-96 w-96 rounded-full bg-rose-500/10 blur-[130px]" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-400 mb-2">
            <HandCoins className="h-3.5 w-3.5" /> Chama Micro-Lending
          </div>
          <h1 className="font-display text-3xl font-black text-white sm:text-4xl">
            Chama Loans & Portfolio
          </h1>
          <p className="mt-1 text-xs text-slate-400 font-medium">
            Manage member credit balances, micro-loan disbursals, and repayments
          </p>
        </div>
        {isTreasurer && (
          <button
            type="button"
            onClick={() => setShowIssueForm((v) => !v)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:brightness-110 transition"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Issue Micro-Loan
          </button>
        )}
      </div>

      {!isTreasurer && (
        <div className="mt-4 flex items-center gap-2.5 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-300 backdrop-blur-md">
          <HandCoins
            className="h-4 w-4 text-emerald-400 flex-none"
            aria-hidden="true"
          />
          <span>
            Need an emergency micro-loan? Reach out to your Chama treasurer. New
            loans require guarantor approval from your circle.
          </span>
        </div>
      )}

      {/* Forms and Details */}
      <AnimatePresence>
        {showIssueForm && isTreasurer && (
          <div className="mt-6">
            <IssueLoanForm
              groupId={user.group_id}
              onClose={() => setShowIssueForm(false)}
              onIssued={refetch}
            />
          </div>
        )}
      </AnimatePresence>

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

      {error && (
        <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 font-medium">
          {error}
        </div>
      )}

      {/* Main Table */}
      <GlassCard
        index={1}
        className="mt-8 border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-xl"
      >
        <div className="overflow-x-auto">
          <Table
            columns={columns}
            rows={loans}
            caption="Loans issued to group members"
            isLoading={status === "loading"}
            emptyMessage={
              isTreasurer ? "No loans issued yet." : "You have no loans yet."
            }
            onRowClick={(row) => navigate(`/loans/${row.id}`)}
          />
        </div>
      </GlassCard>
    </div>
  );
}
