import { fromPartial } from "@total-typescript/shoehorn";
import { http, HttpResponse } from "msw";
import type { Segment, Transcription } from "../types";

export const SEGMENTS: Segment[] = [
  { id: "seg-1", start_time: 0.0, end_time: 3.2, text: "Hello and welcome." },
  { id: "seg-2", start_time: 3.2, end_time: 7.5, text: "This is a test." },
];

export const COMPLETED: Transcription = fromPartial<Transcription>({
  id: "t-1",
  status: "completed",
  original_filename: "meeting.mp3",
  duration: 7.5,
  segments: SEGMENTS,
  summary: null,
  error_message: "",
  created_at: "2026-08-21T12:00:00Z",
});

export const handlers = [
  http.post("/api/transcriptions/", () =>
    HttpResponse.json({ id: "t-1", status: "pending" }, { status: 202 }),
  ),
  http.get("/api/transcriptions/:id/", () => HttpResponse.json(COMPLETED)),
  http.patch("/api/segments/:id/", async ({ request }) => {
    const body = (await request.json()) as { text?: string };
    if (!body.text?.trim()) {
      return HttpResponse.json({ detail: "Segment text cannot be empty." }, { status: 400 });
    }
    return HttpResponse.json(fromPartial<Segment>({ ...SEGMENTS[0], text: body.text }));
  }),
  http.post("/api/transcriptions/:id/summarize/", () =>
    HttpResponse.json({ summary: "Fake summary." }),
  ),
];
