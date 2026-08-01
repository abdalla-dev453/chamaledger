import { Inbox, LoaderCircle } from "lucide-react";

/**
 * Reusable, accessible data table shell used across the app's list pages.
 *
 * columns: [{ key, header, align?: 'left'|'right', render?: (row) => ReactNode }]
 * rows: array of data objects, each ideally carrying a stable `id`.
 */
export default function Table({ columns, rows, caption, isLoading = false, emptyMessage = "Nothing here yet.", onRowClick }) {
  return (
    <table className="w-full border-collapse text-left">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="text-xs uppercase tracking-wide text-white/40">
          {columns.map((col) => (
            <th
              key={col.key}
              scope="col"
              className={`pb-3 font-medium ${col.align === "right" ? "text-right" : "text-left"}`}
            >
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {isLoading && (
          <tr>
            <td colSpan={columns.length} className="py-10 text-center text-white/50">
              <span className="inline-flex items-center gap-2 text-sm">
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                Loading…
              </span>
            </td>
          </tr>
        )}

        {!isLoading && rows.length === 0 && (
          <tr>
            <td colSpan={columns.length} className="py-10 text-center text-white/45">
              <span className="inline-flex flex-col items-center gap-2 text-sm">
                <Inbox className="h-5 w-5" aria-hidden="true" />
                {emptyMessage}
              </span>
            </td>
          </tr>
        )}

        {!isLoading &&
          rows.map((row) => (
            <tr
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              role={onRowClick ? "button" : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onRowClick(row);
                      }
                    }
                  : undefined
              }
              className={`border-t border-white/[0.06] ${
                onRowClick ? "cursor-pointer transition-colors hover:bg-white/[0.04] focus-visible:bg-white/[0.06]" : ""
              }`}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`py-3 text-sm ${col.align === "right" ? "text-right" : "text-left"}`}
                >
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
      </tbody>
    </table>
  );
}