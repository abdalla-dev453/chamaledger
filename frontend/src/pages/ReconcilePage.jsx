import { useRef, useState } from "react";
import { UploadCloud, CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useCycles } from "../hooks/useCycles";
import { useReconcile } from "../hooks/useReconcile";
import { ApiError } from "../services/api";
import { formatKES, formatDate } from "../utils/formatters";
import GlassCard from "../components/ui/GlassCard";
import Table from "../components/ui/Table";

export default function ReconcilePage() {
  const user = useAuthStore((s) => s.user);
  const { cycles } = useCycles(user?.group_id);
  const { unmatched, status, error, lastResult, uploadStatement } = useReconcile(user?.group_id);

  const [selectedCycleId, setSelectedCycleId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file || !selectedCycleId) return;

    setUploadError(null);
    setUploading(true);
    try {
      await uploadStatement(selectedCycleId, file);
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : "Could not upload this statement.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const columns = [
    { key: "mpesa_code", header: "Receipt No." },
    { key: "sender_name", header: "Sender", render: (row) => row.sender_name || "—" },
    { key: "sender_phone", header: "Phone", render: (row) => row.sender_phone || "Unknown" },
    { key: "transaction_date", header: "Date", render: (row) => formatDate(row.transaction_date) },
    { key: "amount", header: "Amount", align: "right", render: (row) => formatKES(row.amount) },
  ];

  return (
    <div className="pb-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-plum-300)]">Treasurer tools</p>
      <h1 className="mt-1 font-display text-3xl font-semibold">Reconcile M-Pesa statement</h1>
      <p className="mt-2 max-w-xl text-sm text-white/55">
        Upload an M-Pesa statement export for a cycle. Payments are matched to members automatically by phone
        number; anything uncertain is flagged for you to confirm.
      </p>

      <GlassCard index={0} className="mt-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            <label htmlFor="cycle-select" className="mb-1.5 block text-sm font-medium text-white/70">Cycle</label>
            <select
              id="cycle-select"
              value={selectedCycleId}
              onChange={(e) => setSelectedCycleId(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--color-plum-400)]"
            >
              <option value="">Select a cycle…</option>
              {cycles.map((c) => (
                <option key={c.id} value={c.id} className="bg-[var(--color-ink-900)]">
                  {formatDate(c.period_start)} — {formatDate(c.period_end)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <label
              className={`flex items-center gap-2 rounded-xl bg-gradient-to-br from-[var(--color-plum-400)] to-[var(--color-plum-600)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-black/30 ${
                !selectedCycleId || uploading ? "cursor-not-allowed opacity-50" : "cursor-pointer"
              }`}
            >
              <UploadCloud className="h-4 w-4" aria-hidden="true" />
              {uploading ? "Uploading…" : "Upload CSV"}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={!selectedCycleId || uploading}
                className="sr-only"
              />
            </label>
          </div>
        </div>

        {uploadError && (
          <p role="alert" className="mt-4 text-sm text-[var(--color-rose-300)]">{uploadError}</p>
        )}

        {lastResult && (
          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/[0.06] pt-5 text-sm">
            <div className="flex items-center gap-2 text-[var(--color-gain-400)]">
              <CheckCircle2 className="h-4 w-4 flex-none" aria-hidden="true" />
              {lastResult.matches.exact} matched exactly
            </div>
            <div className="flex items-center gap-2 text-[var(--color-gold-300)]">
              <HelpCircle className="h-4 w-4 flex-none" aria-hidden="true" />
              {lastResult.matches.ambiguous} need confirming
            </div>
            <div className="flex items-center gap-2 text-[var(--color-rose-400)]">
              <AlertTriangle className="h-4 w-4 flex-none" aria-hidden="true" />
              {lastResult.matches.unmatched} unmatched
            </div>
          </div>
        )}
      </GlassCard>

      {error && <p className="mt-6 text-sm text-[var(--color-rose-300)]">{error}</p>}

      <GlassCard index={1} className="mt-6">
        <h2 className="font-display text-lg font-semibold">Unmatched statements</h2>
        <p className="mt-1 text-sm text-white/50">
          No member's phone number matched these payments — confirm them manually once you know who paid.
        </p>
        <div className="mt-4 overflow-x-auto">
          <Table
            columns={columns}
            rows={unmatched}
            caption="M-Pesa statement rows not yet linked to a contribution"
            isLoading={status === "loading"}
            emptyMessage="Nothing unmatched right now — great job!"
          />
        </div>
      </GlassCard>
    </div>
  );
}