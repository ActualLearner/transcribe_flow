# TranscribeFlow

## 1. Project Goal

To build a transcription website that accepts audio & video files, transcribes them, then allows editing to the generated text, as well as downloading in subtitle & text format. An AI summary of the text is also available.

---

## 2. Functional Requirements

### FR1: File Upload

System must accept .mp3, .mp4 & .wav files.

- Acceptance Criteria:
  - AC1: User can select .mp3, .mp4, or .wav files via file picker.
  - AC2: System rejects files larger than 50MB immediately with an error message.
  - AC3: System displays loading while the file is uploading/processing.

### FR2: File transcription

System must convert speech to text with timestamps.

- Acceptance Criteria:
  - AC1: System sends file to Transcription Provider (e.g., OpenAI Whisper).
  - AC2: System parses the response to capture Text and Timestamps (Start/End) for every segment.

### FR3: Interactive Editor

System must allow viewing/editing of the text.

- Acceptance Criteria:
  - AC1: User can edit the text of any timestamped segment.
  - AC2: User can click "Save" to update the internal state with the new text.

### FR4: Download Transcription

System must allow download of transcription in text & subtitle formats.

- Acceptance Criteria:
  - AC1: Download as .txt (Plain text without timestamps).
  - AC2: Download as .srt (Formatted subtitles with timestamps).

### FR5: AI Summary

System must generate a summary of transcription using an LLM.

- Acceptance Criteria:
  - AC1: User clicks "Summarize" to trigger the LLM request.
  - AC2: System passes the current (potentially edited) transcript text to the LLM.
    AC3: System displays the returned summary in a read-only view.

---

## 4. Non-Functional Requirements (NFRs)

### NFR1: Performance

- NFR1.1: The interface must remain responsive during file uploads or transcription process.
- NFR1.2: System must stream uploads and processing to avoid blocking the UI thread.

### NFR2: Security

- NFR2.1: User files should be immediately discarded after processing and should not be stored on the server.
- NFR2.2: System must validate file types & size before upload.

### NFR3: Reliability

- NFR3.1: System must attempt to restore previous state after a refresh.

### NFR4: Usability

- NFR4.1: System must provide real-time status updates during long-running process.

### NFR5: Cost Efficiency

- NFR5.1: AI calls should be minimized and explicit user-triggered.
- NFR5.2: No background or automatic summarization.

### NFR6: Observability

- NFR6.1: System must surface clear error states to the user.
- NFR6.2: Failures from external AI providers must be detectable.

---

## 5. Out of Scope

- Authorization & Authentication.
- **Live Recording:** No browser-based microphone recording (Upload only).
- **Large Files:** No files over 50MB (to avoid killing local CPU/RAM during AI processing).
- Payment integration: Free tool for now.
