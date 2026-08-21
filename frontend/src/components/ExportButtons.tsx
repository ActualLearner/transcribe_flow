import { useEffect, useRef, useState } from "react";

const outlineButton =
  "rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100";

interface ExportButtonsProps {
  transcriptionId: string;
  originalFilename: string;
  fullText: string;
}

export function ExportButtons({
  transcriptionId,
  originalFilename,
  fullText,
}: ExportButtonsProps) {
  const baseName = originalFilename.replace(/\.[^.]+$/, "") || "transcript";
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current !== null) clearTimeout(resetTimer.current);
    };
  }, []);

  async function copyTranscript() {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
    if (resetTimer.current !== null) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopyState("idle"), 2000);
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => void copyTranscript()}
        aria-live="polite"
        className={outlineButton}
      >
        {copyState === "copied" && "Copied ✓"}
        {copyState === "error" && "Copy failed"}
        {copyState === "idle" && "Copy transcript"}
      </button>
      <a
        href={`/api/transcriptions/${transcriptionId}/export/?format=txt`}
        download={`${baseName}.txt`}
        className={outlineButton}
      >
        Download .txt
      </a>
      <a
        href={`/api/transcriptions/${transcriptionId}/export/?format=srt`}
        download={`${baseName}.srt`}
        className={outlineButton}
      >
        Download .srt
      </a>
    </div>
  );
}
