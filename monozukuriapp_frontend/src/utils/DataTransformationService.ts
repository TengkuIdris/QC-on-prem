import { ProblemInput, Severity, Frequency, DefectType } from "./problem";
import { SSEEvent } from "./analysis";

// API Payload type for sending to backend
export interface APIPayload extends Omit<ProblemInput, "severity" | "frequency" | "defect_types"> {
  severity: string;
  frequency: string;
  defect_types: string[];
}

// UI Data type for frontend display
export interface UIData extends Omit<ProblemInput, "severity" | "frequency" | "defect_types"> {
  severity: Severity;
  frequency: Frequency;
  defect_types: DefectType[];
}

// Centralized data transformation service
export class DataTransformationService {
  private static readonly ENUM_MAPPINGS = {
    severity: {
      軽微: "LOW",
      中程度: "MEDIUM",
      重大: "HIGH",
    },
    frequency: {
      頻繁: "FREQUENT",
      散発: "OCCASIONAL",
      稀: "RARE",
      初回: "FIRST_TIME",
    },
    defectTypes: {
      外観: "APPEARANCE",
      寸法: "DIMENSION",
      機能: "FUNCTION",
      材料: "MATERIAL",
      強度: "STRENGTH",
      耐久性: "DURABILITY",
      安全性: "SAFETY",
      その他: "OTHER",
    },
  } as const;

  private static readonly REVERSE_MAPPINGS = {
    severity: Object.fromEntries(Object.entries(this.ENUM_MAPPINGS.severity).map(([key, value]) => [value, key])),
    frequency: Object.fromEntries(Object.entries(this.ENUM_MAPPINGS.frequency).map(([key, value]) => [value, key])),
    defectTypes: Object.fromEntries(Object.entries(this.ENUM_MAPPINGS.defectTypes).map(([key, value]) => [value, key])),
  } as const;

  static transformForAPI(data: ProblemInput): APIPayload {
    return {
      ...data,
      severity: data.severity ? this.ENUM_MAPPINGS.severity[data.severity] || data.severity : data.severity,
      frequency: data.frequency ? this.ENUM_MAPPINGS.frequency[data.frequency] || data.frequency : data.frequency,
      defect_types: data.defect_types?.map((type) => this.ENUM_MAPPINGS.defectTypes[type] || type) || [],
    };
  }

  static transformFromAPI(data: any): UIData {
    return {
      ...data,
      severity: this.REVERSE_MAPPINGS.severity[data.severity] || data.severity,
      frequency: this.REVERSE_MAPPINGS.frequency[data.frequency] || data.frequency,
      defect_types: data.defect_types?.map((type: string) => this.REVERSE_MAPPINGS.defectTypes[type] || type) || [],
    };
  }

  static transformSSEEvent(event: SSEEvent): SSEEvent {
    // Transform any Japanese enum values in SSE events to English
    if (event.data && typeof event.data === "object") {
      const transformedData = { ...event.data };

      // Transform severity if present
      if (transformedData.severity && this.ENUM_MAPPINGS.severity[transformedData.severity]) {
        transformedData.severity = this.ENUM_MAPPINGS.severity[transformedData.severity];
      }

      // Transform frequency if present
      if (transformedData.frequency && this.ENUM_MAPPINGS.frequency[transformedData.frequency]) {
        transformedData.frequency = this.ENUM_MAPPINGS.frequency[transformedData.frequency];
      }

      // Transform defect_types if present
      if (transformedData.defect_types && Array.isArray(transformedData.defect_types)) {
        transformedData.defect_types = transformedData.defect_types.map(
          (type: string) => this.ENUM_MAPPINGS.defectTypes[type] || type,
        );
      }

      return {
        ...event,
        data: transformedData,
      };
    }

    return event;
  }
}
