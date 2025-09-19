"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { JOB_DESCRIPTION_STORAGE_KEY } from "@/app/page";
import { FirebaseInit } from "@/components/FirebaseInit";
import { ProcessingStep, ProcessingLogItem } from "@/components/ProcessingStep";
import { getGeminiModel } from "@/lib/firebase";
import { Schema } from "firebase/ai";
import { CandidateProfile, ScoredCandidate, StepStatus } from "@/types/candidate";
import styles from "../candidate-flow/page.module.css";
import { addCandidateIds, clearCandidateIds, readCandidateIds, clearCandidatePeople, mergeCandidatePeople, readCandidatePeople } from "@/lib/storage";

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
  const [step3Status, setStep3Status] = useState<StepStatus>("pending");
  const [step3Logs, setStep3Logs] = useState<ProcessingLogItem[]>([]);
  const evaluationStartedRef = useRef(false);
  const [step3Progress, setStep3Progress] = useState<number>(0);
  const [step4Status, setStep4Status] = useState<StepStatus>("pending");
  const [step4Logs, setStep4Logs] = useState<ProcessingLogItem[]>([]);
  const [step4Progress, setStep4Progress] = useState<number>(0);
  const advancedAnalysisStartedRef = useRef(false);

  useEffect(() => {
    // Get job description from session storage
    const storedJobDescription = sessionStorage.getItem(JOB_DESCRIPTION_STORAGE_KEY);
    
    if (!storedJobDescription) {
      router.push("/");
      return;
    }
    
    // New search session: clear any previously stored candidate IDs and people details
    clearCandidateIds();
    clearCandidatePeople();

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

        try {
          let page = 1;
          let collectedForThisCall = 0;
          let maxToCollect = 50;
          let totalPages: number | undefined = undefined;

          while (collectedForThisCall < maxToCollect) {
            const url = new URL(baseUrl + endpoint);
            Object.entries(params).forEach(([k, v]) => {
              if (v) url.searchParams.set(k, v);
            });
            // Try both common page params; backend will use whichever it supports
            url.searchParams.set("page_num", String(page));
            url.searchParams.set("page", String(page));

            const res = await fetch(url.toString(), {
              method: "GET",
              headers: {
                "Accept": "application/json",
              },
            });

            let pageResults: any[] = [];
            try {
              const data: any = await res.json();
              if (Array.isArray(data)) {
                pageResults = data;
              } else if (Array.isArray(data?.results)) {
                pageResults = data.results;
                if (typeof data?.num_pages === "number") {
                  totalPages = data.num_pages;
                }
              }
            } catch {}

            if (!pageResults.length) {
              break;
            }

            const ids = pageResults
              .map((r: any) => (r && typeof r === "object" ? r.id : undefined))
              .filter((v: any): v is string => typeof v === "string" && v.length > 0);

            if (ids.length) {
              addCandidateIds(ids);
              collectedForThisCall += ids.length;
            }

            if (typeof totalPages === "number" && page >= totalPages) {
              break;
            }
            page += 1;
          }

          // Mark as completed with details
          setStep2Logs((prev) =>
            prev.map((item) =>
              item.id === id
                ? {
                    ...item,
                    status: "completed",
                    details: `${collectedForThisCall} IDs saved`,
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
      // Begin evaluation step (Step 3)
      if (!evaluationStartedRef.current) {
        evaluationStartedRef.current = true;
        runCandidateEvaluation().catch((err) => {
          console.error("runCandidateEvaluation error:", err);
          setStep3Status("error");
        });
      }
    } catch (err) {
      console.error("runCandidateSearches error:", err);
      setStep2Status("error");
    }
  };

  const runCandidateEvaluation = async () => {
    try {
      setStep3Status("processing");
      setStep3Logs([]);
      setStep3Progress(0);

      const baseUrl = "https://staging.recruitu.com/api/2330891ccbb5404d86277521b9c3f87b490c3fa0e3c9448ba7bd9a587a65c2f8";
      const endpoint = "/people";

      const ids = readCandidateIds();
      if (!ids.length) {
        setStep3Logs((prev) => [
          ...prev,
          {
            id: "no-ids",
            label: "No candidate IDs found – skipping evaluation",
            status: "completed",
          },
        ]);
        setStep3Status("completed");
        return;
      }

      // Single progress log item
      setStep3Logs([
        {
          id: "evaluation",
          label: "Evaluating candidates",
          status: "processing",
          details: `Processed 0/${ids.length}`,
        },
      ]);

      const total = ids.length;
      let savedTotal = 0;
      let processedCount = 0;
      let nextIndex = 0;
      const CONCURRENCY = 10;

      const processOne = async (index: number) => {
        const id = ids[index];
        let savedCountForThisId = 0;
        try {
          // Build ids param as unquoted bracketed list for single id: [id]
          const idsParam = `[${id}]`;
          const requestUrl = `${baseUrl}${endpoint}?ids=${idsParam}`;
          console.log("People API request URL", { index: index + 1, total, id, requestUrl });

          const res = await fetch(requestUrl, {
            method: "GET",
            headers: {
              "Accept": "application/json",
            },
          });

          try {
            const data: any = await res.json();
            console.log("People API response", {
              index: index + 1,
              total,
              id,
              status: res.status,
              ok: res.ok,
              data,
            });
            let resultsMap: Record<string, unknown> = {};
            const results = (data && (data.results as any)) ?? undefined;
            if (results && Array.isArray(results)) {
              for (const obj of results) {
                if (obj && typeof obj === "object") {
                  Object.assign(resultsMap, obj);
                }
              }
            } else if (results && typeof results === "object") {
              resultsMap = results as Record<string, unknown>;
            }
            
            // Score candidates
            const scoringSchema = Schema.object({
              properties: {
                compatibilityScore: Schema.number({
                  description: "A score from 0 to 100 representing how well the candidate matches the job description.",
                }),
              },
            });

            const model = getGeminiModel("gemini-2.5-flash-lite", {
              generationConfig: {
                responseMimeType: "application/json",
                responseSchema: scoringSchema,
              },
            });

            for (const candidateId in resultsMap) {
              const candidate = resultsMap[candidateId] as any;
              const prompt = `Based on this job description, evaluate the following candidate and provide a compatibility score.

Job Description: ${jobDescription}

Candidate Profile:
${JSON.stringify(candidate, null, 2)}

Provide a compatibility score between 0 and 100, and a brief rationale.`;

              try {
                const result = await model.generateContent(prompt);
                const scoredData = JSON.parse(result.response.text());
                
                // Add score to candidate data
                candidate.compatibilityScore = scoredData.compatibilityScore;

              } catch (scoringError) {
                console.error("Error scoring candidate:", candidateId, scoringError);
                // Assign a default score or handle error as needed
                candidate.compatibilityScore = -1; 
              }
            }

            savedCountForThisId = Object.keys(resultsMap).length;
            if (savedCountForThisId > 0) {
              mergeCandidatePeople(resultsMap);
            }
          } catch {}
        } catch (err) {
          // per-item failure; continue
        } finally {
          savedTotal += savedCountForThisId;
          processedCount += 1;
          const percent = Math.round((processedCount / total) * 100);
          setStep3Progress(percent);
          setStep3Logs((prev) =>
            prev.map((item) =>
              item.id === "evaluation"
                ? {
                    ...item,
                    details: `Processed ${processedCount}/${total} • Saved ${savedTotal}`,
                  }
                : item
            )
          );
        }
      };

      const worker = async () => {
        while (true) {
          const index = nextIndex++;
          if (index >= total) break;
          await processOne(index);
        }
      };

      const workerCount = Math.min(CONCURRENCY, total);
      await Promise.all(Array.from({ length: workerCount }, () => worker()));

      setStep3Status("completed");
      setStep3Progress(100);
      setStep3Logs((prev) =>
        prev.map((item) =>
          item.id === "evaluation"
            ? {
                ...item,
                status: "completed",
              }
            : item
        )
      );
      // Kick off advanced analysis (Step 4)
      if (!advancedAnalysisStartedRef.current) {
        advancedAnalysisStartedRef.current = true;
        runAdvancedAnalysis().catch((err) => {
          console.error("runAdvancedAnalysis error:", err);
          setStep4Status("error");
        });
      }
    } catch (err) {
      console.error("runCandidateEvaluation error:", err);
      setStep3Status("error");
    }
  };

  const runAdvancedAnalysis = async () => {
    try {
      setStep4Status("processing");
      setStep4Logs([]);
      setStep4Progress(0);

      const allPeople = readCandidatePeople();
      const entries = Object.entries(allPeople)
        .map(([id, data]) => ({ id, data: data as any }))
        .filter((e) => typeof e.data?.compatibilityScore === "number" && e.data.compatibilityScore >= 0);

      if (entries.length === 0) {
        setStep4Logs((prev) => [
          ...prev,
          {
            id: "no-candidates",
            label: "No candidates to analyze – skipping advanced analysis",
            status: "completed",
          },
        ]);
        setStep4Status("completed");
        return;
      }

      // Sort by existing score desc and take top 25
      entries.sort((a, b) => (b.data.compatibilityScore ?? -1) - (a.data.compatibilityScore ?? -1));
      const top = entries.slice(0, 25);

      // Single progress log item
      setStep4Logs([
        {
          id: "advanced-analysis",
          label: "Running extensive analysis on top candidates",
          status: "processing",
          details: `Processed 0/${top.length}`,
        },
      ]);

      const analysisSchema = Schema.object({
        properties: {
          compatibilityScore: Schema.number({
            description: "Re-evaluated score from 0 to 100 based on full profile context.",
          }),
          pros: Schema.array({
            items: Schema.string(),
            description: "Key strengths or alignment points for this candidate.",
          }),
          cons: Schema.array({
            items: Schema.string(),
            description: "Potential risks, gaps, or misalignments.",
          }),
        },
      });

      const model = getGeminiModel("gemini-2.5-pro", {
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: analysisSchema,
        },
      });

      const total = top.length;
      let processed = 0;
      const CONCURRENCY = 5;
      let nextIndex = 0;

      const processOne = async (index: number) => {
        const { id, data } = top[index];
        try {
          const prompt = `Given the job description and candidate profile, produce a JSON object with fields: compatibilityScore (0-100), pros (string[]), cons (string[]).

Job Description:
${jobDescription}

Candidate Profile:
${JSON.stringify(data, null, 2)}
`;
          const result = await model.generateContent(prompt);
          const analysis = JSON.parse(result.response.text());

          const updated = {
            ...data,
            compatibilityScore: analysis.compatibilityScore,
            pros: Array.isArray(analysis.pros) ? analysis.pros : [],
            cons: Array.isArray(analysis.cons) ? analysis.cons : [],
          };
          mergeCandidatePeople({ [id]: updated });
        } catch (e) {
          // Non-fatal; continue processing others
        } finally {
          processed += 1;
          const percent = Math.round((processed / total) * 100);
          setStep4Progress(percent);
          setStep4Logs((prev) =>
            prev.map((item) =>
              item.id === "advanced-analysis"
                ? { ...item, details: `Processed ${processed}/${total}` }
                : item
            )
          );
        }
      };

      const worker = async () => {
        while (true) {
          const index = nextIndex++;
          if (index >= total) break;
          await processOne(index);
        }
      };

      const workerCount = Math.min(CONCURRENCY, total);
      await Promise.all(Array.from({ length: workerCount }, () => worker()));

      setStep4Status("completed");
      setStep4Progress(100);
      setStep4Logs((prev) =>
        prev.map((item) =>
          item.id === "advanced-analysis"
            ? { ...item, status: "completed" }
            : item
        )
      );
    } catch (err) {
      console.error("runAdvancedAnalysis error:", err);
      setStep4Status("error");
    }
  };

  useEffect(() => {
    if (step4Status === "completed") {
      router.push("/top-candidates");
    }
  }, [step4Status, router]);

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

          <ProcessingStep
            stepNumber={3}
            title="Evaluating candidates"
            status={step3Status}
            description="Fetching detailed profiles for shortlisted candidates"
            result={null}
            logs={step3Logs}
            progress={step3Progress}
          />

        <ProcessingStep
          stepNumber={4}
          title="Running extensive analysis on top candidates"
          status={step4Status}
          description="Deep-diving into top candidates to generate pros and cons"
          result={null}
          logs={step4Logs}
          logsCollapsed={logsCollapsed}
          onToggleLogs={() => setLogsCollapsed((v) => !v)}
          progress={step4Progress}
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
