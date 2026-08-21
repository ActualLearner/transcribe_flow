import type { Segment, Transcription } from "./types";

const BASE = `${import.meta.env.VITE_API_BASE_URL ?? ""}/api`;

class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseError(response: Response): Promise<never> {
  let detail = `Request failed (${response.status})`;
  try {
    const body = (await response.json()) as { detail?: string };
    if (body.detail) detail = body.detail;
  } catch {
    // keep default detail
  }
  throw new ApiError(detail, response.status);
}

export async function uploadTranscription(
  file: File,
  onProgress: (fraction: number) => void,
): Promise<{ id: string; status: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE}/transcriptions/`);
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    });
    xhr.addEventListener("load", () => {
      if (xhr.status === 202) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        let detail = `Upload failed (${xhr.status})`;
        try {
          detail = JSON.parse(xhr.responseText).detail ?? detail;
        } catch {
          // keep default
        }
        reject(new ApiError(detail, xhr.status));
      }
    });
    xhr.addEventListener("error", () => reject(new ApiError("Network error during upload.", 0)));

    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}

export async function fetchTranscription(id: string): Promise<Transcription> {
  const response = await fetch(`${BASE}/transcriptions/${id}/`);
  if (!response.ok) await parseError(response);
  return (await response.json()) as Transcription;
}

export async function updateSegmentText(id: string, text: string): Promise<Segment> {
  const response = await fetch(`${BASE}/segments/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) await parseError(response);
  return (await response.json()) as Segment;
}

export async function summarizeTranscription(id: string): Promise<string> {
  const response = await fetch(`${BASE}/transcriptions/${id}/summarize/`, {
    method: "POST",
  });
  if (!response.ok) await parseError(response);
  const body = (await response.json()) as { summary: string };
  return body.summary;
}
