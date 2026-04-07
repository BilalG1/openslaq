# Design: Huddle CLI & Agent Participation

## Goal

Enable CLI-based huddle participation, primarily for AI agents (e.g. Claude Code joining a huddle, listening to conversation, and responding).

## Architecture Overview

```
LiveKit Room (huddle audio)
  │
  ├── Per-participant audio tracks
  │
  ▼
Server-side Transcription Service (runs on API server)
  │
  ├── Subscribes to tracks via @livekit/rtc-node
  ├── Energy-based VAD detects utterance boundaries
  ├── POSTs each utterance to Groq (Whisper large-v3-turbo)
  ├── Writes transcripts to database (huddle_transcripts table)
  └── Emits updates via Socket.IO
  │
  ▼
REST API
  │
  ├── GET  /huddle/:id/transcript  — read transcript (long-poll for new utterances)
  ├── POST /huddle/:id/speak       — TTS + publish audio into room
  └── GET  /workspaces/:slug/huddles — list active huddles
  │
  ▼
CLI Commands (thin REST clients, no audio processing)
```

## CLI Commands

```bash
# List active huddles in workspace
openslaq huddle list --workspace default

# Join a huddle, returns a huddle-id for subsequent commands
openslaq huddle join --channel general
# → huddle-a1b2c3

# Block until conversation lull, return new transcript lines
openslaq huddle listen --huddle-id huddle-a1b2c3

# Speak into the huddle (server-side TTS)
openslaq huddle send --huddle-id huddle-a1b2c3 "The migration handles nullables but not defaults"

# List available screens/windows to share
openslaq huddle screens
# SCREEN-ID    TYPE      NAME
# 1            display   Built-in Retina Display
# 42991        window    Google Chrome — localhost:3000
# 42850        window    iOS Simulator — iPhone 16 Pro
# 42777        window    Terminal — zsh

# Share a screen or window into the huddle
openslaq huddle share --huddle-id huddle-a1b2c3 42991

# Stop sharing
openslaq huddle unshare --huddle-id huddle-a1b2c3

# Leave the huddle
openslaq huddle leave --huddle-id huddle-a1b2c3
```

## Claude Code Usage Pattern

```
1. openslaq huddle join --channel general       → get huddle-id
2. openslaq huddle listen --huddle-id <id>      → blocks, returns transcript when lull detected
3. Claude reads transcript, uses tools (grep, read files, run tests, etc.)
4. openslaq messages send --channel general "…" → or huddle send for voice
5. openslaq huddle listen --huddle-id <id>      → wait for next conversation
6. Repeat

Screen sharing example:
1. open http://localhost:3000                              → launch browser with dev server
2. openslaq huddle screens                                 → find browser window ID
3. openslaq huddle share --huddle-id <id> <window-id>      → share browser window
4. Claude navigates/interacts via Puppeteer                → participants watch live
5. openslaq huddle unshare --huddle-id <id>                → stop sharing
```

## Speech-to-Text: Groq + Whisper

Using Groq's hosted Whisper large-v3-turbo (batch API, not streaming).

- **Why Groq over Deepgram/streaming STT:** Cheaper (~$0.04/hr vs ~$0.36/hr), better accuracy (~4-5% WER vs ~8%), and latency is comparable for our use case since we only care about finalized utterances, not partial streaming results.
- **API is OpenAI-compatible:** `POST https://api.groq.com/openai/v1/audio/transcriptions`. Drop-in swap to OpenAI Whisper or self-hosted if needed.
- **No streaming needed:** We buffer complete utterances (using energy-based silence detection), then POST the whole segment. Groq transcribes faster than real-time.

### Latency Breakdown

```
Speaker stops → silence detection (~300ms) → network (~100ms) → Groq inference (~200-300ms) → DB write
Total: ~600-700ms from end of speech to transcript available
```

## VAD / Utterance Segmentation

Simple energy-based silence detection on the server:

- Compute RMS of incoming audio frames per track
- When energy drops below threshold for ~300ms, consider utterance complete
- Fire the buffered audio to Groq
- No external VAD library needed — WebRTC audio is clean enough for energy-based detection

## Text-to-Speech

For `huddle send` (agent speaking into the huddle):

- Server receives text via REST
- Calls OpenAI gpt-4o-mini-tts (best quality, style control via prompt, ~$0.012/1K chars)
- Publishes resulting audio into the LiveKit room via @livekit/rtc-node
- CLI never touches audio

## Server-side Transcription Service

Runs on the API server (not a separate service). Acceptable because:

- Using hosted STT (Groq API call), not local Whisper — minimal CPU on our end
- Just forwarding audio frames over HTTP, not doing inference
- Can extract to a separate service later if needed

Lifecycle:

1. Huddle starts → API spawns a transcription worker (connects to LiveKit room via @livekit/rtc-node)
2. Subscribes to all participant audio tracks
3. Per-track: buffers audio, runs energy-based VAD, POSTs utterances to Groq
4. Writes results to `huddle_transcripts` table
5. Emits via Socket.IO for live consumers (web/mobile captions, etc.)
6. Huddle ends → worker disconnects and cleans up

## Speaker Attribution

Each LiveKit participant has their own audio track, tagged with their userId (set during token generation). STT runs per-track, so speaker attribution is free — no diarization needed.

## Transcript Persistence

Transcripts are stored centrally in the database:

- Searchable meeting history ("what did we discuss yesterday?")
- Available to any consumer (CLI, web, mobile, agents)
- Single source of truth — no local whisper, no duplicate STT work

## Screen Sharing

Agents share screens the same way human users do — native OS screen capture. The agent runs on a Mac with access to the display server, so it can capture any screen or window.

### How it works

1. `huddle screens` — lists available macOS displays and windows via ScreenCaptureKit
2. `huddle share <screen-id>` — captures frames from the specified display/window, publishes as a video track into the LiveKit room via `@livekit/rtc-node`
3. Other huddle participants see it as a normal screen share

### What an agent can share

- **Browser windows** — open `localhost:3000` in Chrome, share that window. Navigate and interact via Puppeteer; participants watch live.
- **iOS Simulator** — share the simulator window to demo mobile UI changes.
- **Terminal windows** — share a terminal to show test output, build logs, etc.
- **Full display** — share the entire screen if multiple things are relevant.
- **Any application** — VS Code, Figma, whatever the agent launches.

### Client-side daemon

Screen sharing requires `@livekit/rtc-node` on the agent's machine (can't capture a local screen from the cloud server). The `huddle join` command spawns a local background daemon that:

- Connects to the LiveKit room as a participant
- Publishes video track when `huddle share` is called (frames from ScreenCaptureKit)
- Publishes audio track when `huddle send` is called (TTS audio played into the room)
- Listens on a local unix socket for commands from subsequent CLI calls

This daemon is the agent's full LiveKit participant connection. Audio transcription still happens server-side (the transcription service subscribes to all tracks in the room independently).

### Implementation notes

- macOS ScreenCaptureKit (macOS 12.3+) provides the capture API — need a small native helper (Swift) or use it via ffmpeg's `avfoundation` input
- `@livekit/rtc-node` `VideoSource` + `VideoFrame` publish captured frames
- Frame rate: 5-15 fps is sufficient for screen content (not gaming)
- Resolution: capture at native resolution, LiveKit handles encoding/adaptation

## New API Routes Needed

| Route | Purpose |
|---|---|
| `GET /workspaces/:slug/huddles` | List active huddles with participants |
| `GET /huddle/:id/transcript?after=<cursor>` | Read transcript (long-poll support for `listen`) |
| `POST /huddle/:id/speak` | Submit text for TTS, publish audio into room |

## Dependencies

| Component | Package/Service | Where |
|---|---|---|
| LiveKit room connection | `@livekit/rtc-node` | Server (transcription) + Client (daemon for screen share/audio) |
| Screen capture | macOS ScreenCaptureKit | Client (agent's machine) |
| STT | Groq API (OpenAI-compatible) | Server |
| TTS | OpenAI gpt-4o-mini-tts | Server |
| CLI HTTP client | Existing Hono RPC client | Client |
| Browser automation (optional) | Puppeteer/Playwright | Client (for navigating shared browser) |

## Open Questions

- Transcript retention policy — keep forever or auto-expire?
- Should `huddle listen` support a `--timeout` flag for agents that want to give up after N seconds of silence?
- How to handle overlapping speech from multiple participants in the transcript output format?
- Should the web/mobile UI also show live captions using the same transcript data?
- ScreenCaptureKit requires a one-time macOS permission grant — how to handle first-run UX?
- Should the daemon also subscribe to other participants' screen shares and make them available to the agent (e.g. as screenshots)?
- Linux/Windows support for screen capture — ScreenCaptureKit is macOS-only. PipeWire on Linux, DXGI on Windows.
