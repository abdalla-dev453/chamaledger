import { Inbox } from "lucide-react";

/**
 * Reusable, accessible data table shell built with Tailwind CSS.
 * Supports light and dark mode automatically via Tailwind `dark:` classes.
 *
 * @param {Array} columns - [{ key, header, align?: 'left'|'right'|'center', className?: string, render?: (row) => ReactNode }]
 * @param {Array} rows - Data objects, each with a unique `id` or fallback `key`.
 * @param {string} caption - Accessible caption for screen readers.
 * @param {boolean} isLoading - Shows skeleton loading state when true.
 * @param {string} emptyMessage - Message displayed when rows array is empty.
 * @param {function} onRowClick - Optional callback function triggered on row interaction.
 */
export default function Table({
  columns,
  rows = [],
  caption,
  isLoading = false,
  emptyMessage = "No records found.",
  onRowClick,
}) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur-md transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900/50">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`px-4 py-3.5 ${
                  col.align === "right"
                    ? "text-right"
                    : col.align === "center"
                    ? "text-center"
                    : "text-left"
                } ${col.className || ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200/80 text-sm transition-colors duration-200 dark:divide-slate-800/60">
          {/* Skeleton Loading State */}
          {isLoading &&
            Array.from({ length: 4 }).map((_, idx) => (
              <tr key={`skeleton-${idx}`} className="animate-pulse">
                {columns.map((col, colIdx) => (
                  <td key={`skeleton-col-${colIdx}`} className="px-4 py-4">
                    <div className="h-4 w-3/4 rounded bg-slate-200/80 dark:bg-slate-800/80" />
                  </td>
                ))}
              </tr>
            ))}

          {/* Empty State */}
          {!isLoading && rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center">
                <div className="flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
                    <Inbox className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <span className="text-sm font-medium">{emptyMessage}</span>
                </div>
              </td>
            </tr>
          )}

          {/* Row Data */}
          {!isLoading &&
            rows.map((row, index) => {
              const rowKey = row.id ?? row.key ?? index;
              const isClickable = Boolean(onRowClick);

              return (
                <tr
                  key={rowKey}
                  onClick={isClickable ? () => onRowClick(row) : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                  role={isClickable ? "button" : undefined}
                  onKeyDown={
                    isClickable
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                  className={`transition-colors duration-150 ${
                    isClickable
                      ? "cursor-pointer hover:bg-slate-100/80 focus-visible:bg-slate-200/60 focus-visible:outline-none dark:hover:bg-slate-800/50 dark:focus-visible:bg-slate-800/70"
                      : "hover:bg-slate-50/50 dark:hover:bg-slate-800/20"
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3.5 text-slate-700 dark:text-slate-300 ${
                        col.align === "right"
                          ? "text-right"
                          : col.align === "center"
                          ? "text-center"
                          : "text-left"
                      } ${col.className || ""}`}
                    >
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}