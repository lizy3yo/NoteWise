"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useMemo } from "react";

// Map specific route segments to user‑friendly labels
const LABEL_MAP: Record<string, string> = {
  student_page: "Dashboard", // base handled separately
  dashboard: "Dashboard",
  
  flashcards: "Flashcards",
  create: "Create",
  upload: "Upload",
  practice_tests: "Practice Tests",
  study_mode: "Generate",
  library: "Library",

  profile: "Profile",
  achievements: "Achievements",
  analytics: "Analytics",
  help: "Help",
  privacy_policy: "Privacy Policy",
  settings: "Settings",
  folder: "Folder",
  flashcard: "Flashcard",
  learn: "Learn",
  match: "Match",
  test: "Test",
  analyze: "Analyze",
  history: "History",
  about: "About",
};

// Inline SVG icons matching those used in the sidebar (scaled to 16px for breadcrumbs)
const ICON_MAP: Record<string, React.ReactNode> = {
  dashboard: (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 15v-4a2 2 0 012-2h4a2 2 0 012 2v4" />
    </svg>
  ),

  library: (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  flashcards: (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  practice_tests: (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  study_mode: (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  achievements: (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  ),
  settings: (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  help: (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  privacy_policy: (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5-6v6a7 7 0 11-14 0V6a7 7 0 1114 0z" />
    </svg>
  ),
  summary: (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  set_preview: (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  flashcard: (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  history: (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 3v4M8 3v4" />
    </svg>
  ),
  profile: (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  about: (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

function humanize(segment: string, prevSegment?: string): string {
  if (LABEL_MAP[segment]) return LABEL_MAP[segment];
  // Heuristic: treat likely IDs (mongo/object/uuid-ish) generically
  if (/^[a-f0-9]{24}$/i.test(segment)) {
    // If previous segment is "library", this is a flashcard set
    if (prevSegment === "library") return "Set Preview";
    // If previous segment is "summaries", this is a summary
    if (prevSegment === "summaries") return "Summary";
    return "Item"; // Mongo ObjectId
  }
  if (/^[0-9a-f-]{8,}$/i.test(segment)) return segment.slice(0, 8) + "…"; // UUID/truncate
  return segment
    .replace(/[-_]+/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function Breadcrumbs() {
  const pathname = usePathname();

  const crumbs = useMemo(() => {
    if (!pathname || pathname.startsWith("/auth")) return null;
    const segments = pathname.split("/").filter(Boolean);
    const studentIdx = segments.indexOf("student_page");
    if (studentIdx === -1) return null; // Only show for student area

    let tail = segments.slice(studentIdx + 1);
    if (tail[0] === "dashboard") tail = tail.slice(1); // treat dashboard as home

    // Remove top-level 'assessment' and the next segment after it when present.
    // This prevents showing "Assessment > Item" at the top of the breadcrumb trail.
    // For summaries: keep 'library' but remove 'summaries' segment itself.
    const filtered: string[] = [];
    for (let i = 0; i < tail.length; i++) {
      if (tail[i] === 'assessment') {
        // skip this segment and also skip the immediate next segment if present
        i++; // increment to skip the next segment as well
        continue;
      }
      if (tail[i] === 'summaries') {
        // skip 'summaries' but keep the next segment (the ID)
        continue;
      }
      filtered.push(tail[i]);
    }
    tail = filtered;

    const list: { label: string; href?: string; icon?: React.ReactNode }[] = [
      { label: "Home", href: "/student_page/dashboard", icon: ICON_MAP["dashboard"] },
    ];

    let accPath = "/student_page";
    // Track the original segments to determine context for humanize
    const originalTail = segments.slice(studentIdx + 1);
    tail.forEach((seg, i) => {
      accPath += `/${seg}`;
      const isLast = i === tail.length - 1;
      // Find the previous segment in the original path (before filtering)
      const segIdx = originalTail.indexOf(seg);
      const prevSeg = segIdx > 0 ? originalTail[segIdx - 1] : undefined;
      const label = humanize(seg, prevSeg);
      // Use appropriate icon based on label
      let icon = ICON_MAP[seg];
      if (label === "Summary") icon = ICON_MAP["summary"];
      else if (label === "Set Preview") icon = ICON_MAP["set_preview"];
      else if (label === "Flashcard") icon = ICON_MAP["flashcard"];
      list.push({ label, href: isLast ? undefined : accPath, icon });
    });
    return list;
  }, [pathname]);

  if (!crumbs) return null;

  return (
    <nav aria-label="Breadcrumb" className="hidden lg:block mb-6 text-sm">
      <ol className="flex flex-wrap items-center gap-1 text-slate-500 dark:text-slate-400">
        {crumbs.map((c, idx) => {
          const isLast = idx === crumbs.length - 1;
          const common = "inline-flex items-center gap-1 max-w-[220px] truncate";
          return (
            <li key={idx} className="flex items-center group">
              {isLast || !c.href ? (
                <span
                  className={`${common} font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md`}
                  aria-current="page"
                >
                  {c.icon}
                  <span className="truncate">{c.label}</span>
                </span>
              ) : (
                <Link
                  href={c.href}
                  className={`${common} px-2 py-1 rounded-md hover:bg-[#1C2B1C]/10 hover:text-[#1C2B1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C2B1C] transition-colors`}
                >
                  {c.icon}
                  <span className="truncate">{c.label}</span>
                </Link>
              )}
              {!isLast && (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="mx-1 text-slate-300 dark:text-slate-600 group-last:hidden"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}