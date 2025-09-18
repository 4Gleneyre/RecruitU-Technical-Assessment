"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { JOB_DESCRIPTION_STORAGE_KEY } from "@/app/page";
import { FirebaseInit } from "@/components/FirebaseInit";
import { ProcessingStep, ProcessingLogItem } from "@/components/ProcessingStep";
import { getGeminiModel } from "@/lib/firebase";
import { Schema } from "firebase/ai";
import { CandidateProfile, StepStatus } from "@/types/candidate";
import styles from "./page.module.css";

export default function CandidateFlow() {
  const router = useRouter();
  const [jobDescription, setJobDescription] = useState<string>("");
  const [step1Status, setStep1Status] = useState<StepStatus>("processing");
  const [step2Status, setStep2Status] = useState<StepStatus>("pending");
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step2Logs, setStep2Logs] = useState<ProcessingLogItem[]>([]);
  const searchStartedRef = useRef(false);
  const [logsCollapsed, setLogsCollapsed] = useState(true);

  useEffect(() => {
    // Get job description from session storage
    const storedJobDescription = sessionStorage.getItem(JOB_DESCRIPTION_STORAGE_KEY);
    
    if (!storedJobDescription) {
      router.push("/");
      return;
    }
    
    setJobDescription(storedJobDescription);
    
    // Start processing the job description
    processJobDescription(storedJobDescription);
  }, [router]);

  const processJobDescription = async (jobDesc: string) => {
    try {
      setStep1Status("processing");
      
      // Create JSON schema for structured output
      const candidateSchema = Schema.object({
        properties: {
          targetCompanies: Schema.array({
            items: Schema.string(),
            description: "List of companies that would be ideal targets for this role"
          }),
          sector: Schema.enumString({
            enum: ["CONSULTING", "FINANCE"],
            description: "Primary sector for this role"
          }),
          title: Schema.string({
            description: "Job title for the ideal candidate"
          }),
          undergraduateYear: Schema.number({
            description: "Year the ideal candidate should be in undergraduate studies"
          }),
          city: Schema.string({
            description: "Preferred city for the candidate"
          })
        },
        optionalProperties: ["targetCompanies", "undergraduateYear", "city"]
      });

      // Get Gemini model with structured output configuration
      const model = getGeminiModel("gemini-2.5-pro", {
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: candidateSchema
        }
      });

      const prompt = `Based on this job description, create an ideal candidate profile. Only include the most relevant attributes:

Job Description: ${jobDesc}

Create a structured profile focusing on the most important characteristics for this role. Consider:
- What companies would this candidate ideally come from?
- Is this primarily a CONSULTING or FINANCE role?
- What level/title should the candidate have?
- What year of undergraduate study would be ideal (if relevant)?
- What city would be preferred for this role?

Only return attributes that are most relevant and specific to this role.`;

      const result = await model.generateContent(prompt);
      const profileText = result.response.text();
      
      try {
        const profile: CandidateProfile = JSON.parse(profileText);
        setCandidateProfile(profile);
        setStep1Status("completed");
        setStep2Status("processing");
        setStep2Logs([]);

        // Begin sequential candidate searches (guarded for React Strict Mode)
        if (!searchStartedRef.current) {
          searchStartedRef.current = true;
          runCandidateSearches(profile).catch((searchErr) => {
            console.error("Search flow error:", searchErr);
            setStep2Status("error");
          });
        }
      } catch (parseError) {
        console.error("Failed to parse Gemini response:", parseError, "Response:", profileText);
        throw new Error("Invalid response format from AI model");
      }
      
    } catch (err) {
      console.error("Error processing job description:", err);
      setError("Failed to process job description. Please try again.");
      setStep1Status("error");
    }
  };

  const runCandidateSearches = async (profile: CandidateProfile) => {
    try {
      const baseUrl = "https://staging.recruitu.com/api/2330891ccbb5404d86277521b9c3f87b490c3fa0e3c9448ba7bd9a587a65c2f8";
      const endpoint = "/search";

      // Normalize and deduplicate company names
      const normalize = (s: string) => s.trim().replace(/\s+/g, " ");
      const seen = new Set<string>();
      const targetCompanies = (profile.targetCompanies || []).filter((c) => {
        const key = normalize(c);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (targetCompanies.length === 0) {
        // No companies to search for; log and complete
        setStep2Logs((prev) => [
          ...prev,
          {
            id: "no-companies",
            label: "No target companies provided – skipping candidate search",
            status: "completed",
          },
        ]);
        setStep2Status("completed");
        return;
      }

      const commonParams: Record<string, string> = {
        sector: profile.sector,
        title: profile.title,
      };
      if (typeof profile.undergraduateYear === "number") {
        commonParams["undergraduate_year"] = String(profile.undergraduateYear);
      }

      const doSearch = async (
        label: string,
        params: Record<string, string>,
        id: string
      ) => {
        // Add a processing log entry
        setStep2Logs((prev) => [
          ...prev,
          { id, label, status: "processing" },
        ]);

        const url = new URL(baseUrl + endpoint);
        Object.entries(params).forEach(([k, v]) => {
          if (v) url.searchParams.set(k, v);
        });

        try {
          const res = await fetch(url.toString(), {
            method: "GET",
            headers: {
              "Accept": "application/json",
            },
          });
          let resultCount: number | undefined = undefined;
          try {
            const data = await res.json();
            const listLike = Array.isArray(data)
              ? data
              : Array.isArray((data as any)?.results)
                ? (data as any).results
                : undefined;
            if (listLike) {
              resultCount = listLike.length;
            }
          } catch {}

          // Mark as completed with details (only show number of results, hide HTTP status)
          setStep2Logs((prev) =>
            prev.map((item) =>
              item.id === id
                ? {
                    ...item,
                    status: "completed",
                    details: typeof resultCount === "number" ? `${resultCount} results` : undefined,
                  }
                : item
            )
          );
        } catch (err: any) {
          setStep2Logs((prev) =>
            prev.map((item) =>
              item.id === id
                ? {
                    ...item,
                    status: "error",
                    details: err?.message || "Request failed",
                  }
                : item
            )
          );
        }
      };

      // For each target company: current_company
      for (const company of targetCompanies) {
        const params = {
          ...commonParams,
          current_company: company,
        };
        delete (params as any).previous_company;
        const label = `Searching for ${profile.title} candidates who work at ${company}`;
        const id = `current-${company}`;
        await doSearch(label, params, id);
      }

      // For each target company: previous_company
      for (const company of targetCompanies) {
        const params = {
          ...commonParams,
          previous_company: company,
        };
        delete (params as any).current_company;
        const label = `Searching for ${profile.title} candidates who worked at ${company}`;
        const id = `previous-${company}`;
        await doSearch(label, params, id);
      }

      setStep2Status("completed");
    } catch (err) {
      console.error("runCandidateSearches error:", err);
      setStep2Status("error");
    }
  };

  if (!jobDescription) {
    return (
      <div className={styles.page}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <FirebaseInit />
      <div className={styles.backgroundGlow} aria-hidden />
      <main className={styles.content}>
        <header className={styles.header}>
          <span className={styles.pill}>Talent Compass AI</span>
          <p className={styles.tagline}>
          Finding your ideal candidates...
          </p>
        </header>

        <div className={styles.processContainer}>
          <ProcessingStep
            stepNumber={1}
            title="Crafting ideal candidate profile"
            status={step1Status}
            description="Analyzing job requirements and creating the perfect candidate persona"
            result={candidateProfile}
          />
          
          <ProcessingStep
            stepNumber={2}
            title="Searching for candidates who match the ideal candidate profile"
            status={step2Status}
            description="Scanning our database of finance and consulting professionals"
            result={null}
            logs={step2Logs}
            logsCollapsed={logsCollapsed}
            onToggleLogs={() => setLogsCollapsed((v) => !v)}
          />
        </div>

        {error && (
          <div className={styles.errorContainer}>
            <p className={styles.errorMessage}>{error}</p>
            <button 
              className={styles.retryButton}
              onClick={() => router.push("/")}
            >
              Start Over
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
