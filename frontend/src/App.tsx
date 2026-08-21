import { ExportButtons } from "./components/ExportButtons";
import { SegmentList } from "./components/SegmentList";
import { StatusBadge } from "./components/StatusBadge";
import { SummaryPanel } from "./components/SummaryPanel";
import { UploadPanel } from "./components/UploadPanel";
import { useTranscription } from "./hooks/useTranscription";
import type { Segment } from "./types";

export default function App() {
  const { transcription, loadError, adopt, patchLocal, reset } = useTranscription();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">TranscribeFlow</h1>
        <p className="mt-1 text-slate-500">
          Free transcription — no signup. Your media is never stored.
        </p>
      </header>

      {loadError && (
        <p role="alert" className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {loadError}{" "}
          <button type="button" onClick={reset} className="font-medium underline">
            Start over
          </button>
        </p>
      )}

      {!transcription && <UploadPanel onStarted={adopt} />}

      {transcription && (
        <section aria-label={`Transcription of ${transcription.original_filename}`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                {transcription.original_filename}
              </h2>
              {transcription.duration !== null && (
                <p className="text-sm text-slate-500">
                  Duration: {Math.round(transcription.duration)}s ·{" "}
                  {transcription.segments.length} segments
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={transcription.status} />
              <button
                type="button"
                onClick={reset}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                New transcription
              </button>
            </div>
          </div>

          {transcription.status === "failed" && (
            <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
              {transcription.error_message || "Transcription failed."}
            </p>
          )}

          {(transcription.status === "pending" || transcription.status === "processing") && (
            <p role="status" className="animate-pulse rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
              Working on your file — this usually takes a few seconds…
            </p>
          )}

          {transcription.status === "completed" && (
            <>
              <SummaryPanel
                transcriptionId={transcription.id}
                summary={transcription.summary}
                onSummarized={(summary) => patchLocal((current) => ({ ...current, summary }))}
              />
              <div className="mt-4 rounded-xl border border-slate-200">
                <SegmentList
                  segments={transcription.segments}
                  onSegmentSaved={(saved: Segment) =>
                    patchLocal((current) => ({
                      ...current,
                      segments: current.segments.map((segment) =>
                        segment.id === saved.id ? saved : segment,
                      ),
                    }))
                  }
                />
              </div>
              <div className="mt-4">
                <ExportButtons
                  transcriptionId={transcription.id}
                  originalFilename={transcription.original_filename}
                  fullText={transcription.segments
                    .map((segment) => segment.text)
                    .join("\n")}
                />
              </div>
            </>
          )}
        </section>
      )}
    </main>
  );
}
