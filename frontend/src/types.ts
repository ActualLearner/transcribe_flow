export type TranscriptionStatus = "pending" | "processing" | "completed" | "failed";

export interface Segment {
  id: string;
  start_time: number;
  end_time: number;
  text: string;
}

export interface Transcription {
  id: string;
  status: TranscriptionStatus;
  original_filename: string;
  duration: number | null;
  segments: Segment[];
  summary: string | null;
  error_message: string;
  created_at: string;
}

export const MAX_UPLOAD_BYTES = 25_000_000;
export const ALLOWED_EXTENSIONS = [".mp3", ".wav", ".mp4", ".m4a"] as const;

export function validateFileClientSide(file: File): string | null {
  const dot = file.name.lastIndexOf(".");
  const extension = dot === -1 ? "" : file.name.slice(dot).toLowerCase();
  if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(extension)) {
    return `Unsupported file type "${extension || "(none)"}". Allowed: ${ALLOWED_EXTENSIONS.join(", ")}.`;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `File is too large (${(file.size / 1_000_000).toFixed(1)}MB). Maximum is 25MB.`;
  }
  return null;
}
