export interface TrainingActivityItem {
  source: string;
  attendanceId?: number;
  sessionId?: number;
  activityName: string;
  points: number;
  checkedInAt: string;
}

export const normalizeTrainingActivities = (raw: unknown): TrainingActivityItem[] => {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;

      const activityName = String(record.activityName || record.activity_name || '').trim();
      const checkedInAt = String(record.checkedInAt || record.checked_in_at || '').trim();
      const points = Number(record.points || 0);
      if (!activityName || !checkedInAt || !Number.isFinite(points) || points <= 0) return null;

      const attendanceId = Number(record.attendanceId || record.attendance_id || 0);
      const sessionId = Number(record.sessionId || record.session_id || 0);

      return {
        source: String(record.source || 'QR_ATTENDANCE'),
        activityName,
        points,
        checkedInAt,
        attendanceId: attendanceId > 0 ? attendanceId : undefined,
        sessionId: sessionId > 0 ? sessionId : undefined,
      } as TrainingActivityItem;
    })
    .filter((item): item is TrainingActivityItem => Boolean(item));
};
