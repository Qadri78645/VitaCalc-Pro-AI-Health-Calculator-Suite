export type Tone = 'good' | 'caution' | 'warning' | 'danger' | 'info';

export interface FieldOption {
  value: string;
  label: string;
}

export interface Field {
  name: string;
  label: string;
  type: 'number' | 'select' | 'date' | 'text';
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  defaultValue?: string;
  help?: string;
  options?: FieldOption[];
  showIf?: (values: Record<string, string>) => boolean;
}

export interface GaugeBand {
  from: number;
  to: number;
  label: string;
  tone: Tone;
}

export interface Gauge {
  min: number;
  max: number;
  value: number;
  unit?: string;
  bands: GaugeBand[];
}

export interface Metric {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
}

export interface CalcResult {
  headline: string;
  headlineLabel: string;
  category: string;
  tone: Tone;
  score?: number;
  gauge?: Gauge;
  metrics: Metric[];
  insights: string[];
  advice: string[];
}

export interface Calculator {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  icon: string;
  keywords: string[];
  fields: Field[];
  compute: (values: Record<string, string>) => CalcResult;
}

export interface CategoryInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  gradient: string;
}

export interface SavedResult {
  calcId: string;
  calcName: string;
  result: CalcResult;
  savedAt: number;
}

export interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  reply?: AIReply;
}

export interface AIReply {
  answer: string;
  related: { id: string; name: string }[];
  personal?: string;
}

export interface AIKnowledgeEntry {
  keywords: string[];
  answer: string;
  related: string[];
}
