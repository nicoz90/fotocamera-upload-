/** CSV per Excel italiano: separatore ";" e BOM UTF-8 così gli accenti si leggono bene. */
export function toCsv(intestazioni: string[], righe: (string | number | boolean | null | undefined)[][]): string {
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    let s = typeof v === "boolean" ? (v ? "sì" : "no") : String(v);
    if (typeof v === "number") s = s.replace(".", ",");
    // evita formule (CSV injection)
    if (/^[=+\-@]/.test(s) && typeof v !== "number") s = "'" + s;
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [intestazioni, ...righe].map((r) => r.map(esc).join(";")).join("\r\n");
}

export function scaricaFile(nome: string, contenuto: string, tipo = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([contenuto], { type: tipo }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
