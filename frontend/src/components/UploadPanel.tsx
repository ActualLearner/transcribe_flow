import { useRef, useState } from "react";
import { uploadTranscription } from "../api";
import { validateFileClientSide, type Transcription } from "../types";

interface UploadPanelProps {
  onStarted: (transcription: Transcription) => void;
}

export function UploadPanel({ onStarted }: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File) {
    setError(null);
    const validationError = validateFileClientSide(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setProgress(0);
    try {
      const started = await uploadTranscription(file, setProgress);
      setProgress(null);
      onStarted({
        id: started.id,
        status: "pending",
        original_filename: file.name,
        duration: null,
        segments: [],
        summary: null,
        error_message: "",
        created_at: new Date().toISOString(),
      });
    } catch (uploadError) {
      setProgress(null);
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    }
  }

  return (
    <section aria-label="Upload a media file">
      <div
        data-testid="dropzone"
        role="button"
        tabIndex={0}
        aria-disabled={progress !== null}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          if (progress === null && event.dataTransfer.files.length > 0) {
            void handleFile(event.dataTransfer.files[0]);
          }
        }}
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 text-center transition-colors cursor-pointer ${
          dragOver ? "border-indigo-500 bg-indigo-50" : "border-slate-300 hover:border-indigo-400"
        }`}
      >
        <p className="text-lg font-medium text-slate-700">
          Drag &amp; drop an audio or video file here
        </p>
        <p className="text-sm text-slate-500">
          or click to browse — .mp3, .wav, .mp4, .m4a up to 25MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".mp3,.wav,.mp4,.m4a"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = "";
          }}
        />
      </div>

      {progress !== null && (
        <div className="mt-4" role="status" aria-label="Uploading">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all"
              style={{ width: `${Math.round(progress * 100)}%` }}
              data-testid="upload-progress-bar"
            />
          </div>
          <p className="mt-1 text-sm text-slate-500">Uploading… {Math.round(progress * 100)}%</p>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
