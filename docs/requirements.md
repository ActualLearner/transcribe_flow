# TranscribeFlow

## 1. Project Goal

To build a transcription website that accepts audio & video files, transcribes them, then allows editing to the generated text, as well as downloading in subtitle & text format. An AI summary of the text is also available.

---

## 2. Functional Requirements

### FR1: File Upload

System must accept .mp3, .mp4 & .wav files with a max of 50mb per file.

### FR2: File transcription

System must convert speech to text with timestamps.

### FR3: Interactive Editor

System must allow viewing/editing of the text.

### FR4: Download Transcription

System must allow download of transcription in text & subtitle formats.

### FR5: AI Summary

System must generate a summary of transcription using an LLM.

---

## 3. Feature Flows

### File Upload

1. User uploads files.
2. System displays a loading indicator.
3. When system completes transcription, it displays an ai summary button, a text editor for the transcription as well as download buttons for txt & srt formats.

### 3.1 Download File

3.1.1 User clicks download subtitle file.
3.1.2 Download starts.

### 3.2 AI Summary

3.2.1 User clicks summarize.
3.2.2 System displays loading.
3.2.3 System displays the summary after loading is complete.

### 3.3 Edit transcription

3.3.1 User clicks edit transcription
3.3.2 System loads transcription in text area.
3.3.3 User clicks save.
3.3.4 System updates transcription files.

---

## 4. Non-Functional Requirements (NFRs)

---

## 5. Out of Scope

- **Cloud Hosting:** AWS deployment is for the "next" project.
- **Live Recording:** No browser-based microphone recording (Upload only).
- **Large Files:** No files over 50MB (to avoid killing local CPU/RAM during AI processing).
