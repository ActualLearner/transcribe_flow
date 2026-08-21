import type { TranscriptionStatus } from "../types";

const LABELS: Record<TranscriptionStatus, string> = {
  pending: "Waiting to start…",
  processing: "Transcribing…",
  completed: "Ready",
  failed: "Failed",
};

const STYLES: Record<TranscriptionStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  processing: "bg-blue-100 text-blue-800",
  completed: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-800",
};

export function StatusBadge({ status }: { status: TranscriptionStatus }) {
  return (
    <span
      data-testid="status-badge"
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${STYLES[status]}`}
    >
      {!isTerminal(status) && (
        <span
          aria-hidden
          className="h-2 w-2 animate-pulse rounded-full bg-current"
        />
      )}
      {LABELS[status]}
    </span>
  );
}

function isTerminal(status: TranscriptionStatus): boolean {
  return status === "completed" || status === "failed";
}
