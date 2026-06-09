export type MetricRecordType = "BEFORE" | "AFTER";

export interface Category {
  id: number;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImplementationStep {
  id: number;
  improvementId: number;
  stepNumber: number;
  title: string;
  description: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface MetricRecord {
  id: number;
  improvementId: number;
  label: string;
  value: string;
  type: MetricRecordType;
  createdAt: string;
  updatedAt: string;
}

export interface RelatedDocument {
  id: number;
  improvementId: number;
  name: string;
  url: string;
  size: number;
  createdAt: string;
  updatedAt: string;
}

export interface Count {
  likes: number;
  reviews: number;
}

export interface Label {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface LabelWrapper {
  label: Label;
}

export interface UserInfo {
  id: number;
  email: string;
  name: string;
  isConfirmed: boolean;
  company: string | null;
  department: string | null;
  indenty: string;
  createdAt: string;
  updatedAt: string;
  cognito_user_id: string | null;
  full_name: string | null;
  affiliation: string | null;
  user_type: string;
  trial_ends_at: string | null;
  is_active: boolean;
  deleted_at: string | null;
  company_id: number | null;
}

export interface ImprovementDetail {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  type: string | null;
  situationBeforeImprovement: string | null;
  situationAfterImprovement: string | null;
  improvementProcedures: string | null;
  tipsAndTricks: string | null;
  afterImage: string | null;
  beforeImage: string | null;
  isDraft: boolean;
  views: number;
  company: string;
  department: string;
  email: string;
  fullName: string;
  prepDays: number;
  execDays: number;
  tips: string;
  caution: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
  categoriesId: number;
  labels: LabelWrapper[];
  categories: Category;
  implementationSteps: ImplementationStep[];
  metrics: MetricRecord[];
  relatedDocuments: RelatedDocument[];
  _count: Count;
  user: UserInfo;
  isFavorite: boolean;
  isLike: boolean;
}
