import { Step } from "@/pages/kaizen-hub/components/SubmitRecipe/Procedure";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface RelatedDocument {
  id?: number;
  name: string;
  url?: string;
  size: number;
  improvementId?: number;
}

export interface ImplementationStep {
  id: number;
  stepNumber: number;
  title: string;
  description: string;
  url: string;
}

export interface Metric {
  name: string;
  value: string;
}

export interface SubmitRecipeState {
  email: string;
  fullName: string;
  companyName?: string;
  department?: string;
  title: string;
  category: number;
  summary: string;
  beforeMetrics: Metric[];
  afterMetrics: Metric[];
  tags: string[];
  prepDays: number;
  execDays: number;
  steps: Step[];
  tip: string;
  caution: string;
  relatedDocuments: RelatedDocument[];
  implementationSteps: ImplementationStep[];
}

interface BasicInfoFormValues {
  email: string;
  fullName: string;
  companyName?: string;
  department?: string;
}

interface ImproveContentFormValues {
  title: string;
  category: number;
  summary: string;
  beforeMetrics: Metric[];
  afterMetrics: Metric[];
  tags: string[];
  relatedDocuments?: RelatedDocument[];
}

interface ProcedureFormValues {
  prepDays: number;
  execDays: number;
  steps: Step[];
  tip: string;
  caution: string;
  implementationSteps?: ImplementationStep[];
}

const initialState: SubmitRecipeState = {
  email: "",
  fullName: "",
  companyName: "",
  department: "",
  title: "",
  category: 0,
  summary: "",
  beforeMetrics: [],
  afterMetrics: [],
  tags: [],
  prepDays: 0,
  execDays: 0,
  steps: [],
  tip: "",
  caution: "",
  implementationSteps: [],
  relatedDocuments: [],
};

const submitRecipeSlice = createSlice({
  name: "submitRecipe",
  initialState,
  reducers: {
    addBasicInfo: (state, action: PayloadAction<BasicInfoFormValues>) => {
      state.email = action.payload.email;
      state.fullName = action.payload.fullName;
      state.companyName = action.payload.companyName;
      state.department = action.payload.department;
    },
    addImproveContent: (state, action: PayloadAction<ImproveContentFormValues>) => {
      state.title = action.payload.title;
      state.category = +action.payload.category;
      state.summary = action.payload.summary;
      state.beforeMetrics = action.payload.beforeMetrics || [];
      state.afterMetrics = action.payload.afterMetrics || [];
      state.tags = action.payload.tags || [];
      state.relatedDocuments = action.payload.relatedDocuments || state.relatedDocuments;
    },
    addProcedure: (state, action: PayloadAction<ProcedureFormValues>) => {
      state.prepDays = action.payload.prepDays;
      state.execDays = action.payload.execDays;
      state.steps = action.payload.steps || [];
      state.tip = action.payload.tip;
      state.caution = action.payload.caution;
      state.implementationSteps = action.payload.implementationSteps || [];
    },
    resetSubmitRecipe: () => initialState,
    setSubmitRecipe: (state, action: PayloadAction<SubmitRecipeState>) => {
      return { ...state, ...action.payload, category: +action.payload.category };
    },
    setRelatedDocuments: (state, action: PayloadAction<RelatedDocument[]>) => {
      state.relatedDocuments = action.payload;
    },
    setImplementationSteps: (state, action: PayloadAction<ImplementationStep[]>) => {
      state.implementationSteps = action.payload;
    },
  },
});

export const {
  addBasicInfo,
  addImproveContent,
  addProcedure,
  resetSubmitRecipe,
  setSubmitRecipe,
  setImplementationSteps,
  setRelatedDocuments,
} = submitRecipeSlice.actions;
export default submitRecipeSlice.reducer;
