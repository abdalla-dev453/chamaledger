import { formatStatusLabel } from "../../utils/formatters";

// Covers every status/enum value returned by the backend
// (app/models/enums.py): cycle, contribution, loan, and match-confidence statuses.
const TONE_MAP = {
  // positive / healthy
  active: "gain",
  confirmed: "gain",
  disbursed: "gain",
  cleared: "gain",
  exact: "gain",
  approved: "gain",
  paid: "gain",

  // neutral / in-progress
  pending: "gold",
  ambiguous: "gold",
  review: "gold",
  closed: "neutral",
  archived: "neutral",

  // needs attention / negative
  late: "rose",
  flagged: "rose",
  defaulted: "rose",
  unmatched: "rose",
  rejected: "rose",
  overdue: "rose",
};

const TONE_CLASSES = {
  gain: `
    bg-emerald-50 text-emerald-700 border-emerald-200
    dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/20
  `,
  rose: `
    bg-rose-50 text-rose-700 border-rose-200
    dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/20
  `,
  gold: `
    bg-amber-50 text-amber-700 border-amber-200
    dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/20
  `,
  neutral: `
    bg-slate-100 text-slate-700 border-slate-200
    dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700/60
  `,
};

/** Small color-coded pill for any status/enum string returned by the API. */
export default function StatusChip({ status, className = "" }) {
  const tone = TONE_MAP[status?.toLowerCase()] ?? "neutral";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold backdrop-blur-md transition-colors duration-200 ${TONE_CLASSES[tone]} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {formatStatusLabel(status)}
    </span>
  );
}