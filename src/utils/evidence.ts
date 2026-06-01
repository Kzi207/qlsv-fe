import { buildApiUrl } from '../api/axios';

export interface EvidenceFile {
  path: string;
  name: string;
  size?: number;
  url?: string;
}

const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

const isAbsoluteUrl = (value: string) => ABSOLUTE_URL_PATTERN.test(value);
const isR2Path = (value: string) => value.startsWith('r2:');

const toEvidenceKey = (value: string) =>
  String(value || '')
    .replace(/^\/+/, '')
    .replace(/^uploads\/evidence\//i, '')
    .replace(/\\/g, '/');

export const normalizeEvidenceFile = (file: unknown): EvidenceFile | null => {
  if (!file) return null;

  if (typeof file === 'string') {
    const normalizedPath = isAbsoluteUrl(file) || isR2Path(file)
      ? file
      : file.startsWith('uploads/')
        ? file
        : `uploads/evidence/${file}`;
    const fileName = normalizedPath.split('/').pop() || normalizedPath;
    return {
      path: normalizedPath,
      name: fileName,
    };
  }

  if (typeof file === 'object') {
    const raw = file as Record<string, unknown>;
    const rawPath = typeof raw.path === 'string' ? raw.path : '';
    const rawUrl = typeof raw.url === 'string' ? raw.url : undefined;

    if (!rawPath) return null;

    const normalizedPath = isAbsoluteUrl(rawPath) || isR2Path(rawPath)
      ? rawPath
      : rawPath.startsWith('uploads/')
        ? rawPath
        : `uploads/evidence/${rawPath}`;
    const fallbackName = normalizedPath.split('/').pop() || normalizedPath;

    return {
      path: normalizedPath,
      name: typeof raw.name === 'string' && raw.name.trim() ? raw.name : fallbackName,
      size: typeof raw.size === 'number' ? raw.size : undefined,
      url: rawUrl,
    };
  }

  return null;
};

export const normalizeEvidenceList = (files: unknown): EvidenceFile[] => {
  if (!Array.isArray(files)) return [];

  return files
    .map((file) => normalizeEvidenceFile(file))
    .filter((file): file is EvidenceFile => Boolean(file));
};

export const getEvidenceUrl = (file: EvidenceFile | string) => {
  const normalized = typeof file === 'string' ? normalizeEvidenceFile(file) : file;
  if (!normalized) return '';
  if (normalized.url && isAbsoluteUrl(normalized.url)) return normalized.url;
  if (isAbsoluteUrl(normalized.path)) return normalized.path;

  const key = isR2Path(normalized.path) ? normalized.path : toEvidenceKey(normalized.path);
  return buildApiUrl(`/training/evidence/${encodeURIComponent(key)}`);
};

export const isPdfEvidence = (file: EvidenceFile | string) => {
  const normalized = typeof file === 'string' ? normalizeEvidenceFile(file) : file;
  return normalized ? normalized.name.toLowerCase().endsWith('.pdf') : false;
};
