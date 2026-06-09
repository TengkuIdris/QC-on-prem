import { z } from 'zod'

// Enums for analysis
export enum Severity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM', 
  HIGH = 'HIGH'
}

export enum DefectType {
  APPEARANCE = 'APPEARANCE',
  DIMENSION = 'DIMENSION',
  FUNCTION = 'FUNCTION',
  MATERIAL = 'MATERIAL',
  STRENGTH = 'STRENGTH',
  DURABILITY = 'DURABILITY',
  SAFETY = 'SAFETY',
  OTHER = 'OTHER'
}

export enum Frequency {
  FREQUENT = 'FREQUENT',
  OCCASIONAL = 'OCCASIONAL',
  RARE = 'RARE',
  FIRST_TIME = 'FIRST_TIME'
}

// Zod schemas
export const InvestigationItemSchema = z.object({
  date: z.string().optional(),
  content: z.string().optional(),
  result: z.string().optional(),
  investigator: z.string().optional()
})

export const VerificationResultSchema = z.object({
  method: z.string().optional(),
  result: z.string().optional(),
  date: z.string().optional(),
  verifier: z.string().optional()
})

export const ProblemInputSchema = z.object({
  // Basic info
  title: z.string().min(1, '問題のタイトルは必須です').max(500, '問題のタイトルは500文字以内で入力してください'),
  product_name: z.string().optional(),
  occurrence_date: z.string().optional(),
  process: z.string().optional(),
  location: z.string().optional(),
  severity: z.nativeEnum(Severity).optional(),
  
  // Detailed description
  description: z.string().optional(),
  
  // 5M1E analysis
  man_details: z.string().optional(),
  machine_details: z.string().optional(),
  material_details: z.string().optional(),
  method_details: z.string().optional(),
  measurement_details: z.string().optional(),
  environment_details: z.string().optional(),
  
  // Timeline analysis
  timeline_analysis: z.string().optional(),
  
  // Classification and importance
  defect_types: z.array(z.nativeEnum(DefectType)).optional(),
  other_defect_type: z.string().optional().nullable(),
  frequency: z.nativeEnum(Frequency).optional(),
  frequency_percentage: z.string().optional(),
  
  // Investigation
  investigations: z.array(InvestigationItemSchema).optional(),
  direct_cause: z.string().optional(),
  verification: VerificationResultSchema.optional().nullable(),

  // Language — AI API spec: 出力言語。未指定時は "Japanese"。
  // FE đã gửi giá trị tiếng Anh (Japanese / English / ...) nên BE cũng mặc định theo đó
  language: z.string().default("Japanese")
})

// Types
export type ProblemInput = z.infer<typeof ProblemInputSchema>
export type InvestigationItem = z.infer<typeof InvestigationItemSchema>
export type VerificationResult = z.infer<typeof VerificationResultSchema>

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
  timestamp: string
}

export interface CreateAnalysisResponse {
  sessionId: string
}

export interface AnalysisSession {
  id: string
  title: string
  ownerId: number
  participants: number[]
  status: string
  createdAt: Date
  updatedAt: Date
  analysisData?: any
} 