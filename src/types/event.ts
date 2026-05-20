export interface EventSummary {
  id: number;
  title: string;
  description: string | null;
  allowedClasses: string;
}

export interface ManagedEvent extends EventSummary {
  createdAt: string;
  _count?: {
    registrations: number;
  };
}

export interface EventRegistration {
  id: number;
  studentName: string;
  studentCode: string;
  classId: string;
  registeredAt: string;
}

export interface ClassItem {
  name: string;
}
