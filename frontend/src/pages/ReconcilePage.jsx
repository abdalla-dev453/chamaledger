import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  UploadCloud, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  FileSpreadsheet,
  Calendar,
  AlertCircle,
  Receipt,
  ArrowUpRight
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useCycles } from "../hooks/useCycles";
import { useReconcile } from "../hooks/useReconcile";
import { ApiError } from "../services/api";
import { formatKES, formatDate } from "../utils/formatters";
import GlassCard from "../components/ui/GlassCard";
import Table from "../components/ui/Table";

const inputClasses =
  "w-full rounded-xl border border-slate-700/80 bg-slate-950/80 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-all duration-200 focus:border-emerald-500/80 focus:ring-2 focus:ring-emerald-500/20";

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
    { 
      key: "mpesa_code", 
      header: "Receipt No.",
      render: (row) => (
        <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
          {row.mpesa_code}
        </span>
      )
    },
    { 
      key: "sender_name", 
      header: "Sender Name", 
      render: (row) => <span className="font-bold text-slate-100">{row.sender_name || "—"}</span> 
    },
    { 
      key: "sender_phone", 
      header: "Phone", 
      render: (row) => <span className="font-mono text-slate-400 text-xs">{row.sender_phone || "Unknown"}</span> 
    },
    { 
      key: "transaction_date", 
      header: "Date", 
      render: (row) => <span className="text-slate-400 text-xs">{formatDate(row.transaction_date)}</span> 
    },
    { 
      key: "amount", 
      header: "Amount Received", 
      align: "right", 
      render: (row) => <span className="font-bold text-white">{formatKES(row.amount)}</span> 
    },
  ];

  return (
    <div className="relative min-h-screen text-slate-100 pb-12">
      {/* Visual Ambient Glow */}
      <div className="pointer-events-none absolute -top-10 left-10 h-96 w-96 rounded-full bg-emerald-500/10 blur-[140px]" />
      <div className="pointer-events-none absolute top-1/3 right-10 h-80 w-80 rounded-full bg-teal-500/10 blur-[120px]" />

      {/* Header */}
      <div className="border-b border-slate-800 pb-6 relative z-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 mb-2">
          <FileSpreadsheet className="h-3.5 w-3.5" /> Treasurer Portal
        </div>
        <h1 className="font-display text-3xl font-black text-white sm:text-4xl tracking-tight">
          M-Pesa Reconciliation
        </h1>
        <p className="mt-1 text-xs text-slate-400 font-medium max-w-xl">
          Automate ledger matching by uploading M-Pesa CSV exports. System matches transactions by member contact numbers.
        </p>
      </div>

      {/* Upload & Cycle Picker Section */}
      <GlassCard index={0} className="mt-8 border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-xl relative z-10 shadow-2xl">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-[1fr_auto] items-end">
          <div>
            <label htmlFor="cycle-select" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
              Target Contribution Cycle
            </label>
            <div className="relative">
              <select
                id="cycle-select"
                value={selectedCycleId}
                onChange={(e) => setSelectedCycleId(e.target.value)}
                className={inputClasses}
              >
                <option value="">Select an active or past cycle…</option>
                {cycles.map((c) => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-slate-100">
                    {formatDate(c.period_start)} — {formatDate(c.period_end)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex">
            <label
              className={`w-full sm:w-auto flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-6 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:brightness-110 ${
                !selectedCycleId || uploading ? "cursor-not-allowed opacity-50" : "cursor-pointer"
              }`}
            >
              <UploadCloud className="h-4 w-4" aria-hidden="true" />
              <span>{uploading ? "Analyzing Statement…" : "Upload Statement CSV"}</span>
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

        {/* Upload Errors */}
        {uploadError && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }} 
            animate={{ opacity: 1, y: 0 }} 
            role="alert" 
            className="mt-4 flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-300"
          >
            <AlertCircle className="h-4 w-4 flex-none text-rose-400" aria-hidden="true" />
            <span>{uploadError}</span>
          </motion.div>
        )}

        {/* Last Upload Results Cards */}
        {lastResult && (
          <div className="mt-6 border-t border-slate-800/80 pt-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Reconciliation Summary
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs font-bold text-emerald-300">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-none" aria-hidden="true" />
                <div>
                  <span className="block text-lg font-extrabold text-white">{lastResult.matches.exact}</span>
                  <span>Matched Directly</span>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-xs font-bold text-amber-300">
                <HelpCircle className="h-5 w-5 text-amber-400 flex-none" aria-hidden="true" />
                <div>
                  <span className="block text-lg font-extrabold text-white">{lastResult.matches.ambiguous}</span>
                  <span>Pending Confirmation</span>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs font-bold text-rose-300">
                <AlertTriangle className="h-5 w-5 text-rose-400 flex-none" aria-hidden="true" />
                <div>
                  <span className="block text-lg font-extrabold text-white">{lastResult.matches.unmatched}</span>
                  <span>Unmatched Items</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Global Fetch Errors */}
      {error && (
        <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-medium text-rose-300">
          {error}
        </div>
      )}

      {/* Unmatched Statement Table */}
      <GlassCard index={1} className="mt-8 border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-xl relative z-10 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div>
            <h2 className="font-display text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Receipt className="h-5 w-5 text-amber-400" /> Unmatched Statement Rows
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Transactions that could not be linked to registered member contacts.
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <Table
            columns={columns}
            rows={unmatched}
            caption="M-Pesa statement rows not yet linked to a contribution"
            isLoading={status === "loading"}
            emptyMessage="All statement entries are fully matched — ledger balanced!"
          />
        </div>
      </GlassCard>
    </div>
  );
}