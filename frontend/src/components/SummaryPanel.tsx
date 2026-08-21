import { useState } from "react";
import { summarizeTranscription } from "../api";

interface SummaryPanelProps {
  transcriptionId: string;
  summary: string | null;
  onSummarized: (summary: string) => void;
}

export function SummaryPanel({ transcriptionId, summary, onSummarized }: SummaryPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      onSummarized(await summarizeTranscription(transcriptionId));
    } catch (summarizeError) {
      setError(summarizeError instanceof Error ? summarizeError.message : "Summary failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 p-4" aria-label="AI summary">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          AI Summary
        </h2>
        <button
          type="button"
          onClick={() => void generate()}
          disabled={loading}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {summary ? "Regenerate summary" : loading ? "Summarizing…" : "Summarize"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {summary && !error && (
        <p className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
          {summary}
        </p>
      )}
    </section>
  );
}
