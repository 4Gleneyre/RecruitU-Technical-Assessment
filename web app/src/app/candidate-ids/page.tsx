"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../candidate-flow/page.module.css";
import { FirebaseInit } from "@/components/FirebaseInit";
import { CANDIDATE_IDS_STORAGE_KEY, readCandidateIds } from "@/lib/storage";

export default function CandidateIdsPage() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(readCandidateIds());
  }, []);

  const total = ids.length;

  return (
    <div className={styles.page}>
      <FirebaseInit />
      <div className={styles.backgroundGlow} aria-hidden />
      <main className={styles.content}>
        <header className={styles.header}>
          <span className={styles.pill}>Talent Compass AI</span>
          <p className={styles.tagline}>Collected candidate IDs</p>
        </header>

        <div className={styles.processContainer}>
          <div style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: 20,
            width: "100%",
            maxWidth: 900,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h2 style={{ margin: 0 }}>Candidate IDs</h2>
              <span style={{ opacity: 0.8 }}>{total} total</span>
            </div>
            {total === 0 ? (
              <p style={{ opacity: 0.8 }}>No candidate IDs found. Start a new search from the home page.</p>
            ) : (
              <div style={{
                maxHeight: 500,
                overflow: "auto",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                paddingTop: 12,
                fontFamily: "var(--font-geist-mono)",
                fontSize: 14,
                lineHeight: 1.6,
              }}>
                <ol style={{ margin: 0, paddingLeft: 20 }}>
                  {ids.map((id) => (
                    <li key={id}>
                      <code>{id}</code>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          <div style={{ marginTop: 16 }}>
            <Link href="/" className={styles.secondaryAction}>
              Start a new search
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}


