import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { fromPartial } from "@total-typescript/shoehorn";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import type { Transcription } from "./types";
import { COMPLETED, handlers } from "./test/handlers";

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterAll(() => server.close());

async function renderWithCompleted() {
  localStorage.setItem("transcribeflow:transcription-id", COMPLETED.id);
  render(<App />);
  await screen.findByText("Hello and welcome.", {}, { timeout: 5000 });
}

function uploadFile(name: string, size = 10) {
  const input = screen
    .getByTestId("dropzone")
    .querySelector("input[type=file]")! as HTMLInputElement;
  const file = new File(["x"], name, { type: "text/plain" });
  Object.defineProperty(file, "size", { value: size });
  Object.defineProperty(input, "files", { value: [file] });
  fireEvent.change(input);
}

describe("App", () => {
  beforeEach(() => {
    server.use(http.get("/api/transcriptions/:id/", () => HttpResponse.json(COMPLETED)));
  });

  it("rejects unsupported file types instantly in the browser", () => {
    render(<App />);
    uploadFile("notes.txt");
    expect(screen.getByRole("alert")).toHaveTextContent(/unsupported file type/i);
  });

  it("rejects files over 25MB instantly in the browser", () => {
    render(<App />);
    uploadFile("big.mp3", 26_000_000);
    expect(screen.getByRole("alert")).toHaveTextContent(/too large/i);
  });

  it("uploads, polls until completed, and shows segments", async () => {
    let pollCount = 0;
    server.use(
      http.post("/api/transcriptions/", () =>
        HttpResponse.json({ id: "t-1", status: "pending" }, { status: 202 }),
      ),
      http.get("/api/transcriptions/:id/", () => {
        pollCount += 1;
        return HttpResponse.json(
          pollCount >= 2
            ? COMPLETED
            : fromPartial<Transcription>({ ...COMPLETED, status: "processing", segments: [] }),
        );
      }),
    );

    render(<App />);
    uploadFile("meeting.mp3");

    expect(await screen.findByText("Hello and welcome.", {}, { timeout: 5000 })).toBeInTheDocument();
    expect(pollCount).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId("status-badge")).toHaveTextContent("Ready");
  }, 15000);

  it("edits a segment inline and shows saved feedback", async () => {
    const user = userEvent.setup();
    await renderWithCompleted();
    const textarea = screen.getByLabelText(/segment at 00:00/i);
    await user.clear(textarea);
    await user.type(textarea, "Corrected text.");
    await user.tab();

    expect(await screen.findByText("Saved ✓")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Corrected text.")).toBeInTheDocument();
  });

  it("generates a summary on explicit click only", async () => {
    let summarizeCalls = 0;
    server.use(
      http.post("/api/transcriptions/:id/summarize/", () => {
        summarizeCalls += 1;
        return HttpResponse.json({ summary: "The gist." });
      }),
    );
    const user = userEvent.setup();
    await renderWithCompleted();
    expect(summarizeCalls).toBe(0);

    await user.click(screen.getByRole("button", { name: /summarize/i }));
    expect(await screen.findByText("The gist.")).toBeInTheDocument();
    expect(summarizeCalls).toBe(1);
  });

  it("restores a stored transcription on refresh", async () => {
    await renderWithCompleted();
    expect(screen.queryByTestId("dropzone")).not.toBeInTheDocument();
  });

  it("shows the friendly error state when transcription fails", async () => {
    server.use(
      http.get("/api/transcriptions/:id/", () =>
        HttpResponse.json(
          fromPartial<Transcription>({
            ...COMPLETED,
            status: "failed",
            error_message: "Provider down.",
          }),
        ),
      ),
    );
    render(<App />);
    uploadFile("meeting.mp3");
    expect(await screen.findByRole("alert", {}, { timeout: 5000 })).toHaveTextContent(
      "Provider down.",
    );
  });

  it("offers txt and srt downloads including edits", async () => {
    await renderWithCompleted();
    expect(screen.getByRole("link", { name: /download \.txt/i })).toHaveAttribute(
      "href",
      "/api/transcriptions/t-1/export/?format=txt",
    );
    expect(screen.getByRole("link", { name: /download \.srt/i })).toHaveAttribute(
      "href",
      "/api/transcriptions/t-1/export/?format=srt",
    );
  });

  it("copies the edited transcript to the clipboard with confirmation", async () => {
    const user = userEvent.setup();
    await renderWithCompleted();

    const textarea = screen.getByLabelText(/segment at 00:00/i);
    await user.clear(textarea);
    await user.type(textarea, "Edited first line.");
    await user.tab();
    await screen.findByText("Saved ✓");

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    await user.click(screen.getByRole("button", { name: /copy transcript/i }));

    expect(writeText).toHaveBeenCalledWith("Edited first line.\nThis is a test.");
    expect(await screen.findByText("Copied ✓")).toBeInTheDocument();
  });

  it("shows feedback when copying fails", async () => {
    const user = userEvent.setup();
    await renderWithCompleted();

    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
      configurable: true,
    });

    await user.click(screen.getByRole("button", { name: /copy transcript/i }));

    expect(await screen.findByText("Copy failed")).toBeInTheDocument();
  });
});
