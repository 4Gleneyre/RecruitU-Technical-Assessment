"use client";

import styles from "./ProcessingStep.module.css";
import { CandidateProfile, StepStatus } from "@/types/candidate";

type LogStatus = "pending" | "processing" | "completed" | "error";

export interface ProcessingLogItem {
  id: string;
  label: string;
  status: LogStatus;
  details?: string;
}

interface ProcessingStepProps {
  stepNumber: number;
  title: string;
  status: StepStatus;
  description: string;
  result?: CandidateProfile | null;
  logs?: ProcessingLogItem[];
  logsCollapsed?: boolean;
  onToggleLogs?: () => void;
  progress?: number;
}

export function ProcessingStep({ 
  stepNumber, 
  title, 
  status, 
  description, 
  result,
  logs,
  logsCollapsed,
  onToggleLogs,
  progress
}: ProcessingStepProps) {
  const getStatusIcon = () => {
    switch (status) {
      case "pending":
        return <div className={styles.pendingIcon}>{stepNumber}</div>;
      case "processing":
        return <div className={styles.processingIcon}>{stepNumber}</div>;
      case "completed":
        return (
          <div className={styles.completedIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M20 6L9 17l-5-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        );
      case "error":
        return (
          <div className={styles.errorIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        );
      default:
        return <div className={styles.pendingIcon}>{stepNumber}</div>;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "pending":
        return "Waiting...";
      case "processing":
        return title;
      case "completed":
        return title;
      case "error":
        return "Failed";
      default:
        return "Waiting...";
    }
  };

  return (
    <div className={`${styles.step} ${styles[status]}`}>
      <div className={styles.stepHeader}>
        <div className={styles.iconContainer}>
          {getStatusIcon()}
        </div>
        <div className={styles.stepContent}>
          <h3 className={styles.stepTitle}>
            {getStatusText()}
          </h3>
          <p className={styles.stepDescription}>{description}</p>
        </div>
      </div>

      {status === "completed" && result && (
        <div className={styles.resultContainer}>
          <div className={styles.resultCard}>
            <h4 className={styles.resultTitle}>Ideal Candidate Profile</h4>
            <div className={styles.resultGrid}>
              <div className={styles.resultItem}>
                <span className={styles.resultLabel}>Position</span>
                <span className={styles.resultValue}>{result.title}</span>
              </div>
              <div className={styles.resultItem}>
                <span className={styles.resultLabel}>Sector</span>
                <span className={styles.resultValue}>{result.sector}</span>
              </div>
              {result.undergraduateYear && (
                <div className={styles.resultItem}>
                  <span className={styles.resultLabel}>Undergraduate Year</span>
                  <span className={styles.resultValue}>Year {result.undergraduateYear}</span>
                </div>
              )}
              {result.city && (
                <div className={styles.resultItem}>
                  <span className={styles.resultLabel}>Preferred Location</span>
                  <span className={styles.resultValue}>{result.city}</span>
                </div>
              )}
              {result.targetCompanies && result.targetCompanies.length > 0 && (
                <div className={styles.skillsContainer}>
                  <span className={styles.resultLabel}>Target Companies</span>
                  <div className={styles.skillsList}>
                    {result.targetCompanies.map((company, index) => (
                      <span key={index} className={styles.skillTag}>
                        {company}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {status === "processing" && (
        <div className={styles.processingIndicator}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={typeof progress === "number" ? { width: `${Math.max(0, Math.min(100, progress))}%`, animation: "none" } : undefined}
            ></div>
          </div>
        </div>
      )}

      {logs && logs.length > 0 && (
        <div className={styles.logsContainer}>
          <div className={styles.logsHeader}>
            <h4 className={styles.logsTitle}>Live activity</h4>
            {typeof logsCollapsed === "boolean" && (
              <button type="button" className={styles.logsToggle} onClick={onToggleLogs}>
                {logsCollapsed ? `Show all (${logs.length})` : "Show latest only"}
              </button>
            )}
          </div>
          <ul className={styles.logsList}>
            {(logsCollapsed ? [logs[logs.length - 1]] : logs).map((log) => (
              <li key={log.id} className={`${styles.logItem} ${styles[log.status]}`}>
                <span className={styles.logIcon} aria-hidden>
                  {log.status === "completed" ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : log.status === "processing" ? (
                    <span className={styles.spinner}></span>
                  ) : log.status === "error" ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <span className={styles.bullet} />
                  )}
                </span>
                <div className={styles.logText}>
                  <div className={styles.logLabel}>{log.label}</div>
                  {log.details && <div className={styles.logDetails}>{log.details}</div>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
