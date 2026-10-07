export type ResourceType = 'cours' | 'td' | 'tp' | 'summary' | 'exam' | 'correction' | 'other';

export type ResourceStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'published';

export interface Subject {
  id: string;
  name: string;
  slug: string;
  description: string;
  code: string;
  semester: number;
  color: string;
  icon: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Resource {
  id: string;
  title: string;
  description: string;
  subject_id: string;
  resource_type: ResourceType;
  semester: number;
  academic_year: string;
  teacher: string;
  file_url: string;
  file_name: string;
  file_size: number;
  file_type: string;
  published: boolean;
  is_important: boolean;
  download_count: number;
  uploaded_by: string | null;
  sha256: string;
  status: ResourceStatus;
  corrects_resource_id: string | null;
  created_at: string;
  updated_at: string;
  subject?: Subject;
}

export interface Bookmark {
  id: string;
  user_id: string;
  resource_id: string;
  created_at: string;
  resource?: Resource;
}

export interface Progress {
  id: string;
  user_id: string;
  resource_id: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  resource?: Resource;
}

export interface ResourceView {
  id: string;
  user_id: string | null;
  resource_id: string;
  viewed_at: string;
  resource?: Resource;
}

export interface Profile {
  id: string;
  full_name: string;
  is_admin: boolean;
  created_at: string;
}

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  cours: 'Cours',
  td: 'TD',
  tp: 'TP',
  summary: 'Summary',
  exam: 'Exam',
  correction: 'Correction',
  other: 'Other',
};

export const RESOURCE_TYPE_ORDER: ResourceType[] = ['cours', 'td', 'tp', 'summary', 'exam', 'correction', 'other'];

export const RESOURCE_TYPE_COLORS: Record<ResourceType, string> = {
  cours: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  td: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
  tp: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  summary: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  exam: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  correction: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};
