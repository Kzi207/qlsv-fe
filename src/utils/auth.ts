export type UserRole = 'ADMIN' | 'BCH' | 'STUDENT';

export const normalizeUserRole = (role: unknown): UserRole | '' => {
  const normalized = String(role || '').trim().toUpperCase();
  if (normalized === 'ADMIN' || normalized === 'BCH' || normalized === 'STUDENT') {
    return normalized;
  }
  return '';
};
