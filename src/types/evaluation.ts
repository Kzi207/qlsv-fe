export interface Criterion {
  id: string;
  content: string;
  maxPoints: number;
  guide: string;
  type: 'number' | 'boolean';
  unit?: string;
}

export interface Section {
  id: string;
  title: string;
  maxPoints: number;
  criteria: Criterion[];
}
