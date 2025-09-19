export interface CandidateProfile {
  targetCompanies?: string[];
  sector: "CONSULTING" | "FINANCE";
  title: string;
  undergraduateYear?: number;
  city?: string;
}

export type StepStatus = "pending" | "processing" | "completed" | "error";

export interface ScoredCandidate {
    id: string;
    name?: string;
    title?: string;
    company?: string;
    compatibilityScore: number;
    rationale?: string;
    pros?: string[];
    cons?: string[];
    [key: string]: any;
}