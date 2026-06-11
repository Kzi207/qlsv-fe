export const XLSX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const withXlsxExtension = (fileName: string) => {
  const trimmed = String(fileName || '').trim();
  if (!trimmed) return 'export.xlsx';
  return trimmed.toLowerCase().endsWith('.xlsx') ? trimmed : `${trimmed}.xlsx`;
};

const toBlob = (data: Blob | ArrayBuffer) => {
  if (data instanceof Blob) return data;
  return new Blob([data], { type: XLSX_MIME_TYPE });
};

export const downloadXlsxFile = (data: Blob | ArrayBuffer, fileName: string) => {
  const blob = toBlob(data);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = withXlsxExtension(fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 60000);
};

export const openPrintReport = (title: string, contentHtml: string) => {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');

  const cleanup = () => {
    window.setTimeout(() => {
      iframe.remove();
    }, 1500);
  };

  iframe.srcdoc = `<!DOCTYPE html>
  <html lang="vi">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${title}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap');
        :root {
          color-scheme: light;
          --ink: #0f172a;
          --muted: #64748b;
          --line: #dbe4f0;
          --panel: #f8fbff;
          --brand: #1d4ed8;
          --ok: #047857;
          --warn: #b45309;
          --danger: #b91c1c;
        }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          font-family: 'Be Vietnam Pro', Tahoma, "Segoe UI", "Arial Unicode MS", Arial, Helvetica, sans-serif;
          color: var(--ink);
          background: white;
        }
        .page {
          padding: 28px 32px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          align-items: flex-start;
          margin-bottom: 24px;
        }
        .title {
          font-size: 28px;
          font-weight: 800;
          margin: 0 0 6px;
          color: var(--brand);
        }
        .subtitle {
          margin: 0;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.5;
        }
        .meta {
          min-width: 220px;
          border: 1px solid var(--line);
          background: var(--panel);
          border-radius: 18px;
          padding: 14px 16px;
          font-size: 12px;
          line-height: 1.7;
        }
        .meta strong {
          color: var(--ink);
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }
        .stat {
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 14px 16px;
          background: white;
        }
        .stat-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--muted);
          margin-bottom: 8px;
          font-weight: 700;
        }
        .stat-value {
          font-size: 26px;
          font-weight: 800;
          line-height: 1;
        }
        .chips {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }
        .chip {
          border-radius: 999px;
          padding: 7px 12px;
          font-size: 11px;
          font-weight: 700;
          border: 1px solid var(--line);
          background: white;
        }
        .chip.ok { color: var(--ok); background: #ecfdf5; border-color: #a7f3d0; }
        .chip.warn { color: var(--warn); background: #fffbeb; border-color: #fcd34d; }
        .chip.danger { color: var(--danger); background: #fef2f2; border-color: #fecaca; }
        table {
          width: 100%;
          border-collapse: collapse;
          border-spacing: 0;
          overflow: hidden;
          border: 1px solid var(--line);
          border-radius: 20px;
        }
        thead th {
          background: var(--panel);
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 11px;
          font-weight: 800;
          padding: 12px 14px;
          text-align: left;
          border-bottom: 1px solid var(--line);
        }
        tbody td {
          padding: 12px 14px;
          border-bottom: 1px solid #eef2f7;
          font-size: 13px;
          vertical-align: top;
        }
        tbody tr:last-child td {
          border-bottom: none;
        }
        .empty {
          border: 1px dashed var(--line);
          border-radius: 22px;
          padding: 32px 20px;
          text-align: center;
          color: var(--muted);
          font-size: 14px;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="page">${contentHtml}</div>
    </body>
  </html>`;

  iframe.onload = () => {
    const frameWindow = iframe.contentWindow;
    if (!frameWindow) {
      cleanup();
      return;
    }

    frameWindow.focus();
    window.setTimeout(() => {
      frameWindow.print();
      cleanup();
    }, 250);
  };

  document.body.appendChild(iframe);
};
