import { useEffect, useState, type ReactNode } from "react";
import { updateSegmentText } from "../api";
import type { Segment } from "../types";

function formatTimestamp(seconds: number): string {
  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const parts: ReactNode[] = [];
  const lowerText = text.toLowerCase();
  let cursor = 0;
  while (true) {
    const index = lowerText.indexOf(query, cursor);
    if (index === -1) {
      parts.push(text.slice(cursor));
      break;
    }
    if (index > cursor) parts.push(text.slice(cursor, index));
    parts.push(<mark key={index}>{text.slice(index, index + query.length)}</mark>);
    cursor = index + query.length;
  }
  return <>{parts}</>;
}

interface SegmentRowProps {
  segment: Segment;
  query: string;
  onSaved: (segment: Segment) => void;
}

function SegmentRow({ segment, query, onSaved }: SegmentRowProps) {
  const [text, setText] = useState(segment.text);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setText(segment.text);
  }, [segment.text]);

  async function save() {
    const trimmed = text.trim();
    if (!trimmed || trimmed === segment.text) {
      setText(segment.text);
      return;
    }
    setSaveState("saving");
    try {
      const updated = await updateSegmentText(segment.id, trimmed);
      onSaved(updated);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  const timestampLabel = `Segment at ${formatTimestamp(segment.start_time)}`;

  if (query && !editing) {
    return (
      <li className="flex gap-4 rounded-lg p-2">
        <span className="mt-1 shrink-0 font-mono text-xs text-slate-400">
          {formatTimestamp(segment.start_time)}
        </span>
        <div className="flex-1">
          <button
            type="button"
            aria-label={`Edit ${timestampLabel}`}
            onClick={() => setEditing(true)}
            className="w-full rounded p-1 text-left leading-relaxed text-slate-800 hover:bg-slate-100 [&>mark]:rounded-sm [&>mark]:bg-yellow-200"
          >
            <HighlightedText text={segment.text} query={query} />
          </button>
          <StateLine state={saveState} />
        </div>
      </li>
    );
  }

  return (
    <li className="group flex gap-4 rounded-lg p-2 hover:bg-slate-50">
      <span className="mt-1 shrink-0 font-mono text-xs text-slate-400">
        {formatTimestamp(segment.start_time)}
      </span>
      <div className="flex-1">
        <textarea
          aria-label={timestampLabel}
          value={text}
          rows={Math.max(1, Math.ceil(text.length / 80))}
          onChange={(event) => {
            setText(event.target.value);
            setSaveState("idle");
          }}
          onBlur={() => {
            void save();
            if (query) setEditing(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
          className="w-full resize-none rounded border border-transparent bg-transparent p-1 text-slate-800 hover:border-slate-200 focus:border-indigo-500 focus:bg-white focus:outline-none"
        />
        <StateLine state={saveState} />
      </div>
    </li>
  );
}

function StateLine({ state }: { state: "idle" | "saving" | "saved" | "error" }) {
  return (
    <span aria-live="polite" className="text-xs text-slate-400">
      {state === "saving" && "Saving…"}
      {state === "saved" && "Saved ✓"}
      {state === "error" && (
        <span className="text-red-600">Could not save — text cannot be empty.</span>
      )}
    </span>
  );
}

interface SegmentListProps {
  segments: Segment[];
  onSegmentSaved: (segment: Segment) => void;
}

export function SegmentList({ segments, onSegmentSaved }: SegmentListProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const visibleSegments = normalizedQuery
    ? segments.filter((segment) =>
        segment.text.toLowerCase().includes(normalizedQuery),
      )
    : segments;

  return (
    <div>
      <div className="border-b border-slate-100 p-3">
        <input
          type="search"
          aria-label="Search transcript"
          placeholder="Search transcript…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </div>
      {normalizedQuery && visibleSegments.length === 0 && (
        <p className="p-6 text-center text-sm text-slate-500">No segments match your search.</p>
      )}
      <ul className="divide-y divide-slate-100">
        {visibleSegments.map((segment) => (
          <SegmentRow
            key={segment.id}
            segment={segment}
            query={normalizedQuery}
            onSaved={onSegmentSaved}
          />
        ))}
      </ul>
    </div>
  );
}
