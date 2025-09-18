export interface CandidateProfile {
  targetCompanies?: string[];
  sector: "CONSULTING" | "FINANCE";
  title: string;
  undergraduateYear?: number;
  city?: string;
}

export type StepStatus = "pending" | "processing" | "completed" | "error";
