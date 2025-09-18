"use client";

import { FormEvent, useState } from "react";
import { FirebaseInit } from "@/components/FirebaseInit";
import styles from "./page.module.css";

export default function Home() {
  const [jobDescription, setJobDescription] = useState("");
  const maxCharacters = 2000;
  const charactersUsed = jobDescription.length;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <div className={styles.page}>
      <FirebaseInit />
      <main className={styles.content}>
        <h1 className={styles.title}>Find Candidates</h1>
        
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formContent}>
            <label htmlFor="job-description" className={styles.label}>
              Job Description
            </label>
            <textarea
              id="job-description"
              name="job-description"
              value={jobDescription}
              placeholder="Paste your job description or start writing…"
              onChange={(event) => setJobDescription(event.target.value.slice(0, maxCharacters))}
              spellCheck
              rows={12}
              className={styles.textarea}
            />
            
            <div className={styles.formFooter}>
              <span className={styles.counter}>
                {charactersUsed}/{maxCharacters}
              </span>
              <button type="submit" className={styles.primaryAction}>
                Find Candidates
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
