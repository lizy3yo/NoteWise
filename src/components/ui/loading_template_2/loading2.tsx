"use client";

import React from "react";

type Props = {
  title?: string;
  subtitle?: string;
  compact?: boolean;
  // accent color used for the spinner and text (hex or CSS color string)
  accentColor?: string;
};

export default function LoadingTemplate2({ title = "", subtitle = "", compact = false, accentColor = "#1C2B1C" }: Props) {
  // Inline styles are used for the spinner and text color so callers can pass any accent color
  const spinnerStyle: React.CSSProperties = { borderColor: "transparent", borderBottomColor: accentColor };
  const textStyle: React.CSSProperties = { color: accentColor };

  return (
    <div className={`min-h-screen p-6 flex items-center justify-center loading2-root ${compact ? "py-12" : ""}`} role="status" aria-live="polite">
      <div className="text-center">
        <div
          className="animate-spin rounded-full h-12 w-12 border-4 mx-auto mb-4"
          style={spinnerStyle}
          aria-hidden="true"
        ></div>

        <p className="text-lg" style={textStyle}>{title}</p>

        {subtitle ? <p className="text-sm mt-2 opacity-90" style={textStyle}>{subtitle}</p> : null}
      </div>
    </div>
  );
}