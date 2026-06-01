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

  // Revoke later to avoid truncated downloads on slower browsers.
  window.setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 60000);
};
