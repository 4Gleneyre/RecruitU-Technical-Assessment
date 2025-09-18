"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { FirebaseInit } from "@/components/FirebaseInit";
import styles from "./page.module.css";

const MAX_CHARACTERS = 2000;
export const JOB_DESCRIPTION_STORAGE_KEY = "recruitu:job-description";

export default function Home() {
  const router = useRouter();
  const [jobDescription, setJobDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = jobDescription.trim();
    setError(null);

    if (!trimmed) {
      setError("Please paste a job description to scout ideal candidates.");
      return;
    }

    setIsLoading(true);

    try {
      sessionStorage.setItem(JOB_DESCRIPTION_STORAGE_KEY, trimmed);
    } catch (storageError) {
      console.error("Failed to store job description in session storage", storageError);
      setError("We couldn't save the job description locally. Please check your browser settings and try again.");
      setIsLoading(false);
      return;
    }

    router.push("/candidate-flow");
  }

  function handlePasteSample() {
    setJobDescription(
      "Investment Banking Analyst, TMT \nSan Francisco Bay Area\nJefferies is a Global Investment Bank with capabilities across diverse products, including equity, debt, lending, M&A and restructuring, paired with deep sector expertise across 9 major industry vehicles.\nJefferies' Technology Investment Banking Group, one of the largest investment banking franchises on Wall Street, provides a full range of investment banking services to public and private companies. The team combines deep industry knowledge and M&A expertise with Jefferies' outstanding debt and equity financing, restructuring, trading and research capabilities to advise on a full range of corporate transactions across the technology sector. Subsectors include Enterprise Software, Networking and Hardware, Communication Technologies, Technology Enabled Transportation, Consumer Internet, Digital Media & Interactive Entertainment, Semiconductors & Electronics, Omnicommerce, Business Services and Financial Technology & Payments. Globally headquartered in San Francisco, the Technology Investment Banking team has a significant presence in New York, Charlotte, Boston, Los Angeles, London, India, China and Hong Kong. Our Analyst role offers a unique opportunity for ambitious professionals to play a meaningful role in Jefferies' expanded technology investment banking practice, while gaining hands-on experience in M&A, Equity Capital Markets and Leveraged Finance for leading Technology companies. Analysts are active in day-to-day transaction execution while gaining client interaction and live deal experience on lean transaction teams.\nPrimary Responsibilities:\nDirectly support senior bankers with day-to-day transaction due diligence and execution\nDraft and participate in the presentation of marketing / new business pitches, confidential offering memoranda and management presentations\nDevelop target lists for potential buyers, investors and strategic partners\nConduct in-depth industry research and trend analysis\nPerform complex financial modeling and valuation analysis\nMentor and train junior Analysts\nRequired Background:\nBachelor's Degree with strong academic record\n1-3 years investment banking transaction advisory execution experience\nHighly motivated, confident and passionate\nLives in San Francisco or willing to relocate\nSuperb communication, interpersonal and presentation skills\nProven ability to work independently and meet strict deadlines\nDesired Experience/Skills:\nSupport engagement teams in equity financing, sell-side, buy-side and general advisory M&A engagements, within the Technology Enabled Services investment banking group\nCreate pitch materials\nOversee due diligence\nThe salary range for this role is ,000-,000."
    );
  }

  const charactersUsed = jobDescription.length;

  return (
    <div className={styles.page}>
      <FirebaseInit />
      <div className={styles.backgroundGlow} aria-hidden />
      <main className={styles.content}>
        <header className={styles.hero}>
          <span className={styles.pill}>Talent Compass AI</span>
          <h1 className={styles.headline}>Design your perfect hire in seconds.</h1>
          <p className={styles.tagline}>
            Paste a job description and let the compass outline who to target across consulting and finance talent pools.
          </p>
        </header>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formHeader}>
            <div>
              <h2>Job description</h2>
              <p>
                Drop in a job description, and we will find the most qualified candidates for you.
              </p>
            </div>
            <button
              type="button"
              className={styles.secondaryAction}
              onClick={handlePasteSample}
            >
              Try a sample
            </button>
          </div>

          <label htmlFor="job-description" className={styles.label}>
            Paste or write here
          </label>
          <textarea
            id="job-description"
            name="job-description"
            value={jobDescription}
            placeholder="Paste your job description or start writing."
            onChange={(event) => setJobDescription(event.target.value.slice(0, MAX_CHARACTERS))}
            spellCheck
            rows={12}
            className={styles.textarea}
          />

          <div className={styles.formFooter}>
            <span className={styles.counter}>
              {charactersUsed}/{MAX_CHARACTERS}
            </span>
            <button type="submit" className={styles.primaryAction} disabled={isLoading}>
              {isLoading ? "Finding candidates…" : "Find candidates"}
            </button>
          </div>
        </form>

        {error ? <p className={styles.errorMessage}>{error}</p> : null}
      </main>
    </div>
  );
}
