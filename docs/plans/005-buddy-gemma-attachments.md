# Buddy Gemma Chat + Attachments Integration Plan

- Status: implemented (native build + device verification pending)
- Branch: `feat/buddy-gemma-attachments`
- Base SHA: `5694238667f14e238005d784e31f747fc497a601`
- Planner: GPT-5.6 Sol via `openai-codex` (planning session `20261009_164227_b605db`)
- Scope: `apps/buddy` only; preserve the other developers’ app and design system

## Goal

Replace the Buddy chatbot’s preview timer reply with a local Gemma 4 runtime. Default to the user-facing `Gemma Default (Gemma 4 E2B)` option, allow switching to `Gemma Pro (Gemma 4 E4B)`, and support local file, image, and audio attachments without cloud inference or broad UI refactoring.

The chatbot page is `apps/buddy/src/app/(tabs)/buddy.tsx`. It currently uses the preview Zustand store’s `sendChat` placeholder reply. The app uses Expo SDK 57, Expo Router, Zustand, Expo SQLite, and the Angat design system.

## KISS decisions

- Keep the existing Buddy screen, `AppText`, `Screen`, theme tokens, mascot, bubbles, typing state, and navigation.
- Add one small feature module under `apps/buddy/src/features/buddy/` rather than introducing a new state framework or data layer.
- Keep one native model loaded at a time.
- Default model: Gemma Default (Gemma 4 E2B) GGUF, run on device through `llama.rn` (llama.cpp).
- Optional model: Gemma Pro (Gemma 4 E4B) GGUF, same runtime.
- One runtime for Android and iOS. `llama.rn` is the least-friction cross-platform option: it ships prebuilt iOS and Android binaries and has an Expo config plugin, so no custom native module is required.
- No cloud chat API, cloud transcription, RAG/vector database, tools, or background inference.
- No silent model fallback. If the selected model is unavailable, show the actionable error.

## Branch and source boundaries

The branch was created from the recorded `origin/main` SHA above. Do not edit the separate `apps/expo-go-sample` application in this branch.

An earlier revision of this plan added a local LiteRT-LM Expo module. That approach was abandoned: Google's LiteRT-LM path is Android-first, its iOS story needs a separate Swift Package integration, and a Linux dev machine cannot build or verify either. `llama.rn` covers both platforms from one dependency, so the custom module was removed.

## Files to change

Existing:

- `apps/buddy/src/app/(tabs)/buddy.tsx`
  - Wire the native chat service in place of the preview timer.
  - Add model selector, attachment button/chips, send/cancel states, and clear model status.
- `apps/buddy/src/state/preview-store.ts`
  - Remove only the placeholder reply path or delegate chat state to the new Buddy feature store. Preserve unrelated preview state.
- `apps/buddy/src/domain/types.ts`
  - Extend `ChatMessage` with model and attachment metadata.
- `apps/buddy/package.json`, `app.json`, and lockfile
  - Add only what the first slice needs: `llama.rn`, `expo-document-picker`, `expo-file-system`, `expo-build-properties`, and the `llama.rn` plugin entry in `app.json`.

New:

- `apps/buddy/src/features/buddy/types.ts` — model catalog and attachment contract
- `apps/buddy/src/features/buddy/chat-service.ts` — `llama.rn` load, generate, unload
- `apps/buddy/src/features/buddy/attachment-service.ts` — picker, limits, local text extraction
- `apps/buddy/src/features/buddy/prompt-builder.ts` — pure prompt and media selection
- `apps/buddy/src/features/buddy/__tests__/buddy-gemma.test.ts`
- `docs/decisions/007-buddy-gemma-native-runtime.md`

## Model/runtime contract

Expose one narrow service in `chat-service.ts`:

- `isOnDeviceRuntimeAvailable()`
- `generateBuddyReply({ modelId, modelPath, mmprojPath, prompt, attachments })` → reply text
- `unloadBuddyModel()`

One `LlamaContext` is cached per model id; switching models releases the old context first, and a failed generation drops the context so the next attempt starts clean. JavaScript state stores only serializable status, messages, paths, and metadata, never native handles. Token streaming is deferred: the UI keeps its existing typing indicator.

Model states shown in the UI:

- Not installed
- Downloading
- Verifying
- Ready
- Loading
- Generating
- Failed

`Gemma Default (Gemma 4 E2B)` is selected initially; `Gemma Pro (Gemma 4 E4B)` requires explicit selection and installation. Do not resolve `latest` at runtime: pin official artifact URLs, revisions, licenses, and SHA-256 checksums in the catalog.

## Attachments

Use the smallest practical picker surface:

- Generic files: `expo-document-picker`.
- Images: `expo-image-picker` or document-picker image MIME filters.
- Audio files: document-picker audio MIME filters.
- Microphone recording: defer unless the first attachment slice is stable; add the SDK-57-compatible audio package only then.

Supported first-slice content:

- Images accepted by the pinned Gemma 4 GGUF model, sent through its `mmproj` vision projector.
- WAV/MP3 audio accepted by that model/runtime.
- `.txt`, `.md`, `.json`, and `.csv` as locally extracted text.
- Other files can be retained as attachments but must display `unsupported for model input`; do not pretend arbitrary PDF/DOCX/archive parsing works.

Attachment contract:

```ts
type AttachmentKind = 'file' | 'image' | 'audio';
type AttachmentStatus = 'pending' | 'ready' | 'unsupported' | 'failed';
type ChatAttachment = {
  id: string;
  kind: AttachmentKind;
  name: string;
  uri: string;
  mimeType: string | null;
  sizeBytes: number | null;
  status: AttachmentStatus;
  extractedText?: string;
  error?: string;
};
```

Copy selected files into app-controlled storage. Persist metadata and local URIs, never base64 media in Zustand/SQLite. Limit each message to 3 attachments, images to 10 MiB, audio to 25 MiB/10 minutes, generic files to 10 MiB, and extracted text to 100,000 characters per file. Reject before inference.

## Offline behavior

- Model download/install requires connectivity once.
- After checksum verification and successful probe generation, the model is ready for airplane-mode chat.
- Chat messages, attachment metadata, model selection, and installation state persist locally.
- No cloud fallback, cloud transcription, or remote upload.
- A missing/corrupt model or unsupported attachment produces a visible error and preserves the user’s draft.
- Model switching cancels the active generation, unloads the old engine, then loads the selected model.

## Android/iOS boundary

Shared by design:

- One runtime, `llama.rn`, for both platforms. It ships prebuilt binaries for iOS (`rnllama.xcframework`, Metal) and Android (`jniLibs/arm64-v8a`), so there is one code path and one model format.
- UI, picker orchestration, model catalog, limits, prompt construction, and error states are platform-neutral.

Android:

- Build and verify on a physical arm64 device.

iOS:

- Uses the same shared code and the same GGUF artifacts.
- Requires a development build. iOS simulators do not support the Metal path, so real-device or Metal-capable verification is needed.
- Metal needs Apple7-class GPU hardware.

Constraint that has not changed: this environment (Linux VPS, Linux laptop) cannot build iOS. Verifying iOS requires EAS Build or a Mac, and until that happens iOS must be reported as unverified rather than working.

Expo Go is not a valid native-model test target. Use a development build.

## Phases

1. Baseline: run Buddy typecheck/lint/tests; record branch/base and inspect existing dirty state.
2. Contracts: add model catalog, attachment types, native bridge interface, persistence shape, and unit tests.
3. Model install: add `Gemma Default (Gemma 4 E2B)` installation first, then optional `Gemma Pro (Gemma 4 E4B)` download/checksum/ready states.
4. Android text: wire the default E2B generation into the existing Buddy chat and stream typing output.
5. Attachments: add file/image/audio picker chips, app-owned copies, limits, and supported media input.
6. Model switching: add E4B selection, cancellation, unload/load lifecycle, and visible failures.
7. iOS: implement and verify Swift native bridge; leave it explicitly unavailable until complete.
8. Device gates: Android airplane-mode run, model load, text generation, image/audio samples, restart persistence, cancellation, memory/reload cycle.

## Acceptance criteria

- Buddy opens with `Gemma Default (Gemma 4 E2B)` selected by default.
- `Gemma Pro (Gemma 4 E4B)` is selectable and never silently substitutes the default model.
- The selected model/runtime and installation state are visible.
- Text chat runs fully offline after model installation.
- Typing/streaming, stop, error, and model-switch states work.
- File, image, and audio attachments can be picked, previewed, removed, sent, and restored.
- Supported image/audio inputs reach Gemma; supported text files are extracted locally; unsupported files are clearly rejected.
- No attachment or prompt is uploaded to a cloud endpoint.
- Conversations and attachment metadata survive restart.
- Corrupt/missing model and interrupted download cases are recoverable.
- Android native tests pass on a physical device.
- iOS remains marked unavailable until its native bridge and physical-device test pass.
- Existing Buddy navigation, design tokens, onboarding, notes, quests, and account flows remain intact.

## Non-goals

- No broad UI redesign.
- No remote sync for attachments.
- No PDF/DOCX/OCR/archive parsing in the first slice.
- No background model downloads.
- No simultaneous models.
- No RAG/vector search, tools, web search, or cloud fallback.
- No claim of iOS support before the Swift native bridge is tested.

## Execution status

Implemented on `feat/buddy-gemma-attachments`:

- One shared runtime: `llama.rn` 0.13.0-rc.7, configured through the `llama.rn` Expo config plugin plus `expo-build-properties`, both registered in `apps/buddy/app.json`.
- Model catalog with `Gemma Default (Gemma 4 E2B)` as the default and `Gemma Pro (Gemma 4 E4B)` as the opt-in alternative, each pointing at a real published GGUF plus its `mmproj` vision projector.
- `chat-service.ts` keeps one `LlamaContext` per model id, releases it on switch, attaches the projector when present, and passes images through `media_paths`. When the projector is missing it says so in the prompt instead of pretending the image was read.
- `sendChat` in `preview-store.ts` calls the on-device model instead of the 900 ms placeholder timer, appends a real Buddy reply, and surfaces failures as both an inline error and a failed message.
- Attachment picker (`expo-document-picker`) with local validation and limits: 3 per message, 10 MB images, 25 MB audio, 10 MB files, 100k extracted characters. `.txt`/`.md`/`.json`/`.csv` are read locally via `expo-file-system`. Images are sent to the model. Audio and other files stay attached but are labelled as not model-readable.
- Buddy screen keeps the existing Angat design system and adds a model selector, attachment chips, an error banner, and an attach button.
- Unit tests cover model selection and artifact wiring, prompt building, turn capping, and attachment routing.

Gates run in `apps/buddy`: `npx tsc --noEmit` (0 errors), `npx expo lint` (0 errors), `npx jest` (7 suites, 59 tests passing).

Not yet done (do not treat as verified):

- No development build has been produced or installed for this branch, so on-device generation has not been exercised on either platform.
- No Gemma 4 GGUF is installed on a device. The catalog URLs are real, published artifacts, but no checksum pinning or in-app download/verify flow exists yet.
- Audio input is not implemented. The pinned Gemma 4 `mmproj` carries a vision projector, so audio attachments are stored and labelled rather than sent.
- Chat history and staged attachments are still in-memory, consistent with the existing preview store; restart persistence is not implemented.
- Token streaming is not wired; the UI shows the existing typing indicator until the whole reply lands.
- iOS shares the code and the dependency, but nothing on iOS has been built or run. This machine is Linux, so iOS needs EAS Build or a Mac.
- Device free space matters: Gemma Default is roughly 3.2 GB and Gemma Pro roughly 4.2 GB with the projector. The test device had about 4 GB free, so only the default model realistically fits.

## Model and runtime decision notes

This plan originally targeted Gemma 3n E2B/E4B, then Gemma 4 through a local LiteRT-LM module. It now uses Gemma 4 GGUF through `llama.rn`.

- Gemma 4 instead of Gemma 3n: Gemma 4 is the newer mobile/edge-targeted family.
- `llama.rn` instead of LiteRT-LM: the requirement is Android and iOS out of the box with the least friction. `llama.rn` ships prebuilt binaries for both platforms and has an Expo plugin, so one dependency replaces a platform-specific native integration. LiteRT-LM remains the better long-term path if Gemma's `.litertlm` packaging becomes important, but it is Android-first and cannot be verified from Linux.
- GGUF `UD-Q2_K_XL` instead of another quantization: it is the smallest published mobile build, and device free space is the binding constraint.

Nothing in the architecture depends on the family or runtime beyond the catalog and the adapter: swapping either means editing `types.ts` and `chat-service.ts`, not the UI, the store, or the attachments.
