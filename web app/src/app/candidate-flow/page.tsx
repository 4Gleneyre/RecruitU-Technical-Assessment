"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { JOB_DESCRIPTION_STORAGE_KEY } from "@/app/page";
import { FirebaseInit } from "@/components/FirebaseInit";
import { ProcessingStep } from "@/components/ProcessingStep";
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
      const model = getGeminiModel("gemini-2.5-flash", {
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
        
        // Step 2 stays in processing state indefinitely as requested
        
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
          <h1 className={styles.headline}>Finding your ideal candidates</h1>
          <p className={styles.tagline}>
            We're analyzing your job description and searching our talent database to find the perfect matches.
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
