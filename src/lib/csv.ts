const escapeCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/** Downloads rows as an Excel-friendly CSV (UTF-8 BOM so ₱ and accents show correctly; quotes escaped; 0 kept). */
export const downloadCsv = (filename: string, rows: unknown[][]) => {
    const csv = '﻿' + rows.map(r => r.map(escapeCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.visibility = 'hidden';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
