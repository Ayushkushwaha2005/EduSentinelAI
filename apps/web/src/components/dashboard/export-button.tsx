"use client";

import { ExportIcon } from "./icons";

/*
 * CSV export. Deliberately client-side over the rows already on the page: the
 * viewer is exporting data the server has *already* authorized and rendered for
 * them, so this adds no new endpoint and no new authorization boundary to get
 * wrong. It is not a shortcut around the guard — there is nothing here the
 * viewer cannot already read.
 */
export type ExportRow = Record<string, string | number | null | undefined>;

function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);

  // Excel/Sheets treat a leading =, +, - or @ as a formula. Prefix those with a
  // quote so an exported cell can never execute in the recipient's spreadsheet
  // (CSV injection).
  const cell = (v: ExportRow[string]) => {
    let s = v == null ? "" : String(v);
    if (/^[=+\-@]/.test(s)) s = `'${s}`;
    return `"${s.replaceAll('"', '""')}"`;
  };

  return [
    headers.map(cell).join(","),
    ...rows.map((r) => headers.map((h) => cell(r[h])).join(",")),
  ].join("\r\n");
}

export function ExportButton({
  rows,
  filename,
}: {
  rows: ExportRow[];
  filename: string;
}) {
  function download() {
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={rows.length === 0}
      className="flex h-10 items-center gap-1.5 rounded-control bg-ink px-4 text-sm font-medium text-surface-raised transition-colors duration-[--duration-fast] hover:bg-ink-hover disabled:opacity-50"
    >
      Export
      <ExportIcon size={15} />
    </button>
  );
}
