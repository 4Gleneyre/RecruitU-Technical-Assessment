"use client";

import { useEffect, useState } from "react";
import { readCandidatePeople } from "@/lib/storage";
import { ScoredCandidate } from "@/types/candidate";
import styles from "../candidate-flow/page.module.css";
import { useRouter } from "next/navigation";

export default function TopCandidatesPage() {
	const router = useRouter();
	const [topCandidates, setTopCandidates] = useState<ScoredCandidate[]>([]);
	const [loading, setLoading] = useState(true);
	const [expanded, setExpanded] = useState<Record<string, boolean>>({});

	const getBestExperience = (experiences: any[]): any | undefined => {
		if (!Array.isArray(experiences) || experiences.length === 0) return undefined;
		const isCurrent = (e: any) => !e?.ends_at || typeof e.ends_at?.year !== "number";
		const current = experiences.find(isCurrent);
		if (current) return current;
		const toSortable = (d: any): number => {
			if (!d || typeof d.year !== "number") return -Infinity;
			const month = typeof d.month === "number" ? d.month : 0;
			const day = typeof d.day === "number" ? d.day : 1;
			return d.year * 10000 + month * 100 + day;
		};
		return [...experiences].sort((a, b) => toSortable(b?.ends_at) - toSortable(a?.ends_at))[0];
	};

	const toggleExpanded = (id: string) => {
		setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
	};

	const formatDatePart = (d: any): string => {
		if (!d || typeof d.year !== "number") return "";
		const month = typeof d.month === "number" ? d.month : undefined;
		const day = typeof d.day === "number" ? d.day : undefined;
		const mm = typeof month === "number" && month >= 1 && month <= 12 ? month.toString().padStart(2, "0") : undefined;
		const dd = typeof day === "number" && day >= 1 && day <= 31 ? day.toString().padStart(2, "0") : undefined;
		return [mm, dd, d.year].filter(Boolean).join("/") || String(d.year);
	};

	const formatRange = (start: any, end: any): string => {
		const startStr = formatDatePart(start);
		const endStr = end && typeof end.year === "number" ? formatDatePart(end) : "Present";
		return [startStr || "", endStr].filter(Boolean).join(" – ");
	};

	useEffect(() => {
		try {
			const allPeople = readCandidatePeople();
			console.log("TopCandidatesPage: candidatePeople map", allPeople);
			const candidates: ScoredCandidate[] = Object.entries(allPeople)
				.map(([id, data]) => {
					const d: any = data || {};
					const li: any = d.linkedin || {};
					const name: string | undefined = li.full_name || [li.first_name, li.last_name].filter(Boolean).join(" ") || undefined;
					const bestExp = getBestExperience(li.experiences);
					const title: string | undefined = bestExp?.title || li.occupation || li.headline || undefined;
					const company: string | undefined = bestExp?.company || undefined;
					let linkedinUrl: string | undefined;
					const publicId: string | undefined = typeof li.public_identifier === "string" ? li.public_identifier : undefined;
					const linkedinField: string | undefined = typeof li.linkedin === "string" ? li.linkedin : undefined;
					if (publicId && publicId.trim()) {
						const clean = publicId.replace(/^\/+|\/+$/g, "");
						linkedinUrl = `https://www.linkedin.com/in/${clean}`;
					} else if (linkedinField && linkedinField.trim()) {
						linkedinUrl = linkedinField.startsWith("http") ? linkedinField : `https://www.linkedin.com/in/${linkedinField}`;
					}
					return {
						id,
						...(d as any),
						name,
						title,
						company,
						linkedinUrl,
					} as ScoredCandidate;
				})
				.filter(c => typeof c.compatibilityScore === "number" && c.compatibilityScore >= 0);

			candidates.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

			setTopCandidates(candidates.slice(0, 50));
		} catch (error) {
			console.error("Failed to load or process candidate data", error);
		} finally {
			setLoading(false);
		}
	}, []);

	if (loading) {
		return (
			<div className={styles.page}>
				<div className={styles.backgroundGlow} aria-hidden />
				<p>Loading candidates...</p>
			</div>
		);
	}

	return (
		<div className={styles.page}>
			<div className={styles.backgroundGlow} aria-hidden />
			<main className={styles.content}>
				<header className={styles.header}>
					<span className={styles.pill}>Talent Compass AI</span>
					<h1 className={styles.headline}>Top 50 Candidates</h1>
					<p className={styles.tagline}>Ranked by AI compatibility with your job description</p>
					<button 
						className={styles.retryButton}
						onClick={() => router.push("/")}
					>
						Start Over
					</button>
				</header>

				<div className={styles.candidateList}>
					{topCandidates.length > 0 ? (
						topCandidates.map((candidate, index) => {
							const isExpanded = !!expanded[candidate.id];
							const experiences: any[] = Array.isArray((candidate as any)?.linkedin?.experiences)
								? ((candidate as any).linkedin.experiences as any[])
								: [];
							return (
								<div key={candidate.id} className={styles.candidateCard}>
									<div className={styles.rank}>{index + 1}</div>
									<div className={styles.score}>
										<span className={styles.scoreValue}>{candidate.compatibilityScore}</span>
										<span className={styles.scoreLabel}>Score</span>
									</div>
								<div className={styles.candidateInfo}>
									<h2 className={styles.candidateName}>
										{candidate.name || "N/A"}
										{(candidate as any).linkedinUrl && (
											<a
												href={(candidate as any).linkedinUrl}
												target="_blank"
												rel="noopener noreferrer"
												title="Open LinkedIn profile"
												style={{ marginLeft: 8, verticalAlign: "middle" }}
											>
												{/* Simple LinkedIn icon (SVG) */}
												<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
													<path d="M19 3A2.94 2.94 0 0 1 22 6v12a2.94 2.94 0 0 1-3 3H5a2.94 2.94 0 0 1-3-3V6a2.94 2.94 0 0 1 3-3Zm-9.6 7H6v8h3.4Zm.28-3.71A1.79 1.79 0 1 0 8 8.86a1.79 1.79 0 0 0 1.68-2.57ZM20 13.53c0-3.05-1.63-4.47-3.8-4.47a3.29 3.29 0 0 0-3 1.65h-.06V10H10v8h3.31v-4.21c0-1.11.21-2.18 1.58-2.18s1.44 1.24 1.44 2.25V18H20Z"/>
												</svg>
											</a>
										)}
									</h2>
										<p className={styles.candidateTitle}>{candidate.title || "N/A"} at {candidate.company || "N/A"}</p>
										{candidate.rationale && (
											<div className={styles.rationaleContainer}>
												<p className={styles.rationale}>{candidate.rationale}</p>
											</div>
										)}
								<div style={{ marginTop: 8 }}>
									<button
										className={`${styles.logsToggle} ${isExpanded ? styles.logsToggleExpanded : ""}`}
										onClick={() => toggleExpanded(candidate.id)}
										aria-expanded={isExpanded}
										type="button"
									>
										{isExpanded ? "Hide details" : "Show details"}
										<svg className={styles.logsToggleIcon} width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
											<path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>
										</svg>
									</button>
								</div>
							{isExpanded && (
								<div className={styles.details}>
									<div className={styles.detailsVertical}>
										{experiences.length > 0 && (
											<div className={styles.experienceSection}>
												<div className={styles.sectionHeader}>
													<div className={styles.sectionIcon}>
														<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
															<path d="M14 6V4h-4v2h4zM4 8v11h16V8H4zm16-2c1.11 0 2 .89 2 2v11c0 1.11-.89 2-2 2H4c-1.11 0-2-.89-2-2V8c0-1.11.89-2 2-2h16z"/>
														</svg>
													</div>
													<h4 className={styles.sectionTitle}>Professional Experience</h4>
												</div>
												<div className={styles.experienceTimeline}>
													{experiences.map((e: any, i: number) => (
														<div key={i} className={styles.experienceItem}>
															<div className={styles.experienceDot}>
																<div className={styles.experienceDotInner} />
															</div>
															<div className={styles.experienceContent}>
																<div className={styles.experienceRole}>
																	<div className={styles.experienceTitle}>{e?.title || "Position"}</div>
																	{e?.company && <div className={styles.experienceCompany}>{e.company}</div>}
																</div>
																<div className={styles.experienceMeta}>
																	{(e?.starts_at || e?.ends_at) && (
																		<div className={styles.experienceDate}>
																			<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
																				<path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
																			</svg>
																			{formatRange(e?.starts_at, e?.ends_at)}
																		</div>
																	)}
																	{e?.location && (
																		<div className={styles.experienceLocation}>
																			<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
																				<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
																			</svg>
																			{e.location}
																		</div>
																	)}
																</div>
															</div>
														</div>
													))}
												</div>
											</div>
										)}
										
										{Array.isArray((candidate as any).pros) && (candidate as any).pros.length > 0 && (
											<div className={styles.prosSection}>
												<div className={styles.sectionHeader}>
													<div className={styles.sectionIcon}>
														<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
															<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
														</svg>
													</div>
													<h4 className={styles.sectionTitle}>Strengths</h4>
												</div>
												<div className={styles.prosConsList}>
													{(candidate as any).pros.map((p: string, i: number) => (
														<div key={i} className={`${styles.prosConsItem} ${styles.prosItem}`}>
															<div className={styles.prosConsIcon}>
																<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
																	<path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
																</svg>
															</div>
															<span className={styles.prosConsText}>{p}</span>
														</div>
													))}
												</div>
											</div>
										)}
										
										{Array.isArray((candidate as any).cons) && (candidate as any).cons.length > 0 && (
											<div className={styles.consSection}>
												<div className={styles.sectionHeader}>
													<div className={styles.sectionIcon}>
														<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
															<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
														</svg>
													</div>
													<h4 className={styles.sectionTitle}>Areas of Concern</h4>
												</div>
												<div className={styles.prosConsList}>
													{(candidate as any).cons.map((c: string, i: number) => (
														<div key={i} className={`${styles.prosConsItem} ${styles.consItem}`}>
															<div className={styles.prosConsIcon}>
																<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
																	<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
																</svg>
															</div>
															<span className={styles.prosConsText}>{c}</span>
														</div>
													))}
												</div>
											</div>
										)}
									</div>
								</div>
							)}
                                    </div>
                                </div>
                            );
						})
					) : (
						<p>No candidates found.</p>
					)}
				</div>
			</main>
		</div>
	);
}
