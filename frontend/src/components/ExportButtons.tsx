import { useEffect, useRef, useState } from "react";

interface ExportButtonsProps {
  transcriptionId: string;
  originalFilename: string;
  transcriptText: string;
}

export function ExportButtons({
  transcriptionId,
  originalFilename,
  transcriptText,
}: ExportButtonsProps) {
  const baseName = originalFilename.replace(/\.[^.]+$/, "") || "transcript";
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current !== null) clearTimeout(resetTimer.current);
    };
  }, []);

  async function copyTranscript() {
    await navigator.clipboard.writeText(transcriptText);
    setCopied(true);
    if (resetTimer.current !== null) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => void copyTranscript()}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        {copied ? "Copied ✓" : "Copy transcript"}
      </button>
      <a
        href={`/api/transcriptions/${transcriptionId}/export/?format=txt`}
        download={`${baseName}.txt`}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        Download .txt
      </a>
      <a
        href={`/api/transcriptions/${transcriptionId}/export/?format=srt`}
        download={`${baseName}.srt`}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        Download .srt
      </a>
    </div>
  );
}
