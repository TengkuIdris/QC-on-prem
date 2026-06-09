import { z } from "zod";

// Enums based on NEW API specification
export enum Severity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
}

export enum DefectType {
  APPEARANCE = "APPEARANCE",
  DIMENSION = "DIMENSION",
  FUNCTION = "FUNCTION",
  MATERIAL = "MATERIAL",
  STRENGTH = "STRENGTH",
  DURABILITY = "DURABILITY",
  SAFETY = "SAFETY",
  OTHER = "OTHER",
}

export enum Frequency {
  FREQUENT = "FREQUENT",
  OCCASIONAL = "OCCASIONAL",
  RARE = "RARE",
  FIRST_TIME = "FIRST_TIME",
}

export const InvestigationItemSchema = z.object({
  date: z
    .union([z.string(), z.date()])
    .optional()
    .transform((val) => {
      if (val instanceof Date) return val.toISOString();
      return val;
    }),
  content: z.string().optional(),
  result: z.string().optional(),
  investigator: z.string().optional(),
});

export const VerificationResultSchema = z.object({
  method: z.string().optional().nullable().transform((val) => val ?? undefined),
  result: z.string().optional().nullable().transform((val) => val ?? undefined),
  date: z
    .union([z.string(), z.date()])
    .optional()
    .nullable()
    .transform((val) => {
      if (!val) return undefined;
      if (val instanceof Date) return val.toISOString();
      return val;
    }),
  verifier: z.string().optional().nullable().transform((val) => val ?? undefined),
  investigator: z.string().optional().nullable().transform((val) => val ?? undefined),
  content: z.string().optional().nullable().transform((val) => val ?? undefined),
});

// Zod schemas for runtime validation
export const ProblemInputSchema = z.object({
  // Basic info
  title: z.string().min(1, "問題のタイトルは必須です").max(500, "問題のタイトルは500文字以内で入力してください"),
  product_name: z.string().optional().nullable().transform((val) => val ?? undefined),
  occurrence_date: z
    .union([z.string(), z.date()])
    .optional()
    .nullable()
    .transform((val) => {
      if (!val) return undefined;
      if (val instanceof Date) return val.toISOString();
      return val;
    }),
  process: z.string().optional().nullable().transform((val) => val ?? undefined),
  location: z.string().optional().nullable().transform((val) => val ?? undefined),
  severity: z
    .unknown()
    .optional()
    .transform((val): Severity | undefined => {
      if (val === undefined || val === null || val === "") return undefined;
      const s = String(val).trim();
      if (s === Severity.LOW || s === Severity.MEDIUM || s === Severity.HIGH) return s as Severity;
      const jpToSeverity: Record<string, Severity> = { 軽微: Severity.LOW, 中程度: Severity.MEDIUM, 重大: Severity.HIGH };
      return jpToSeverity[s] ?? undefined;
    }),

  // Detailed description
  description: z.string().optional().nullable().transform((val) => val ?? undefined),

  // 5M1E analysis
  man_details: z.string().optional().nullable().transform((val) => val ?? undefined),
  machine_details: z.string().optional().nullable().transform((val) => val ?? undefined),
  material_details: z.string().optional().nullable().transform((val) => val ?? undefined),
  method_details: z.string().optional().nullable().transform((val) => val ?? undefined),
  measurement_details: z.string().optional().nullable().transform((val) => val ?? undefined),
  environment_details: z.string().optional().nullable().transform((val) => val ?? undefined),

  // Timeline analysis
  timeline_analysis: z.string().optional().nullable().transform((val) => val ?? undefined),

  // Classification and importance
  defect_types: z.array(z.nativeEnum(DefectType)).optional(),
  other_defect_type: z.string().optional().nullable(),
  frequency: z.nativeEnum(Frequency).optional().nullable().transform((val) => val ?? undefined),
  frequency_percentage: z.string().optional().nullable().transform((val) => val ?? undefined),

  // Investigation
  investigations: z
    .union([z.array(InvestigationItemSchema), z.string()])
    .optional()
    .transform((val) => {
      if (typeof val === "string") {
        return [];
      }
      return val || [];
    }),
  direct_cause: z.string().optional().nullable().transform((val) => val ?? undefined),
  verification: VerificationResultSchema.optional().nullable(),

  // Language (required by new API)
  language: z.string().default("ja"),
});

export type ProblemInput = z.infer<typeof ProblemInputSchema>;

export type InvestigationItem = z.infer<typeof InvestigationItemSchema>;
export type VerificationResult = z.infer<typeof VerificationResultSchema>;
