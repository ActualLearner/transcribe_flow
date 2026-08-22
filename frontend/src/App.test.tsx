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

    expect(await screen.findByText("Hello and welcome.", {}, { timeout: 15000 })).toBeInTheDocument();
    expect(pollCount).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId("status-badge")).toHaveTextContent("Ready");
  }, 30000);

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
    expect(await screen.findByRole("alert", {}, { timeout: 10000 })).toHaveTextContent(
      "Provider down.",
    );
  }, 20000);

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

  it("filters segments case-insensitively as you type", async () => {
    const user = userEvent.setup();
    await renderWithCompleted();

    await user.type(screen.getByLabelText(/search transcript/i), "WeLcOmE");

    expect(screen.getByLabelText(/segment at 00:00/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/segment at 00:03/i)).not.toBeInTheDocument();
  });

  it("highlights matching substrings within filtered segments", async () => {
    const user = userEvent.setup();
    await renderWithCompleted();

    await user.type(screen.getByLabelText(/search transcript/i), "welcome");

    const marks = document.querySelectorAll("mark");
    expect(marks).toHaveLength(1);
    expect(marks[0]).toHaveTextContent(/welcome/i);
    expect(marks[0].parentElement?.textContent).toBe("Hello and welcome.");
  });

  it("shows an explicit empty state when nothing matches", async () => {
    const user = userEvent.setup();
    await renderWithCompleted();

    await user.type(screen.getByLabelText(/search transcript/i), "zzz-not-there");

    expect(screen.getByText(/no segments match/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/segment at 00:00/i)).not.toBeInTheDocument();
  });

  it("persists edits made while filtered after clearing the filter", async () => {
    const user = userEvent.setup();
    await renderWithCompleted();

    await user.type(screen.getByLabelText(/search transcript/i), "welcome");
    await user.click(screen.getByRole("button", { name: /edit segment at 00:00/i }));

    const textarea = screen.getByLabelText(/segment at 00:00/i);
    await user.clear(textarea);
    await user.type(textarea, "Changed while filtered.");
    await user.tab();

    expect(screen.getByText(/no segments match/i)).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/search transcript/i));

    expect(
      await screen.findByDisplayValue("Changed while filtered.", {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/segment at 00:03/i)).toBeInTheDocument();
  });

  it("keeps the editor open when a filtered edit fails to save", async () => {
    const user = userEvent.setup();
    await renderWithCompleted();

    await user.type(screen.getByLabelText(/search transcript/i), "welcome");
    await user.click(screen.getByRole("button", { name: /edit segment at 00:00/i }));

    const textarea = screen.getByLabelText(/segment at 00:00/i);
    await user.clear(textarea);
    await user.tab();

    expect(await screen.findByText(/could not save/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/segment at 00:00/i)).toBeInTheDocument();
  });
});
