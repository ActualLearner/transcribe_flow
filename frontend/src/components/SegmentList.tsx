import { useEffect, useState } from "react";
import { updateSegmentText } from "../api";
import type { Segment } from "../types";

function formatTimestamp(seconds: number): string {
  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

interface SegmentRowProps {
  segment: Segment;
  onSaved: (segment: Segment) => void;
}

function SegmentRow({ segment, onSaved }: SegmentRowProps) {
  const [text, setText] = useState(segment.text);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

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

  return (
    <li className="group flex gap-4 rounded-lg p-2 hover:bg-slate-50">
      <span className="mt-1 shrink-0 font-mono text-xs text-slate-400">
        {formatTimestamp(segment.start_time)}
      </span>
      <div className="flex-1">
        <textarea
          aria-label={`Segment at ${formatTimestamp(segment.start_time)}`}
          value={text}
          rows={Math.max(1, Math.ceil(text.length / 80))}
          onChange={(event) => {
            setText(event.target.value);
            setSaveState("idle");
          }}
          onBlur={() => void save()}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
          className="w-full resize-none rounded border border-transparent bg-transparent p-1 text-slate-800 hover:border-slate-200 focus:border-indigo-500 focus:bg-white focus:outline-none"
        />
        <span aria-live="polite" className="text-xs text-slate-400">
          {saveState === "saving" && "Saving…"}
          {saveState === "saved" && "Saved ✓"}
          {saveState === "error" && (
            <span className="text-red-600">Could not save — text cannot be empty.</span>
          )}
        </span>
      </div>
    </li>
  );
}

interface SegmentListProps {
  segments: Segment[];
  onSegmentSaved: (segment: Segment) => void;
}

export function SegmentList({ segments, onSegmentSaved }: SegmentListProps) {
  return (
    <ul className="divide-y divide-slate-100">
      {segments.map((segment) => (
        <SegmentRow key={segment.id} segment={segment} onSaved={onSegmentSaved} />
      ))}
    </ul>
  );
}
