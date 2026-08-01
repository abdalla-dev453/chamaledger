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
  // neutral / in-progress
  pending: "gold",
  ambiguous: "gold",
  closed: "neutral",
  archived: "neutral",
  // needs attention
  late: "rose",
  flagged: "rose",
  defaulted: "rose",
  unmatched: "rose",
};

const TONE_CLASSES = {
  gain: "bg-[var(--color-gain-500)]/15 text-[var(--color-gain-400)] ring-[var(--color-gain-500)]/25",
  rose: "bg-[var(--color-rose-500)]/15 text-[var(--color-rose-400)] ring-[var(--color-rose-500)]/25",
  gold: "bg-[var(--color-gold-400)]/15 text-[var(--color-gold-300)] ring-[var(--color-gold-400)]/25",
  neutral: "bg-white/10 text-white/60 ring-white/15",
};

/** Small color-coded pill for any status/enum string returned by the API. */
export default function StatusChip({ status, className = "" }) {
  const tone = TONE_MAP[status] ?? "neutral";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${TONE_CLASSES[tone]} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {formatStatusLabel(status)}
    </span>
  );
}