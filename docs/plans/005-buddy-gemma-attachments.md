# Buddy Gemma 3n Chat + Attachments Integration Plan

- Status: proposed
- Branch: `feat/buddy-gemma-attachments`
- Base SHA: `5694238667f14e238005d784e31f747fc497a601`
- Planner: GPT-5.6 Sol via `openai-codex` (planning session `20261009_164227_b605db`)
- Scope: `apps/buddy` only; preserve the other developers’ app and design system

## Goal

Replace the Buddy chatbot’s preview timer reply with a local Gemma 3n runtime. Default to Gemma 3n E2B, allow switching to E4B, and support local file, image, and audio attachments without cloud inference or broad UI refactoring.

The chatbot page is `apps/buddy/src/app/(tabs)/buddy.tsx`. It currently uses the preview Zustand store’s `sendChat` placeholder reply. The app uses Expo SDK 57, Expo Router, Zustand, Expo SQLite, and the Angat design system.

## KISS decisions

- Keep the existing Buddy screen, `AppText`, `Screen`, theme tokens, mascot, bubbles, typing state, and navigation.
- Add one small feature module under `apps/buddy/src/features/buddy/` rather than introducing a new state framework or data layer.
- Keep one native model loaded at a time.
- Default model: Gemma 3n E2B instruction-tuned LiteRT-LM artifact.
- Optional model: Gemma 3n E4B instruction-tuned LiteRT-LM artifact.
- No cloud chat API, cloud transcription, RAG/vector database, tools, or background inference.
- No silent model fallback. If the selected model is unavailable, show the actionable error.

## Branch and source boundaries

The branch must be created from the recorded `origin/main` SHA above. Do not edit the separate `apps/expo-go-sample` application in this branch. Reuse its LiteRT-LM experiment only as reference; the Buddy app gets its own local native module under `apps/buddy/modules/pocketops-litert-lm` so the app does not import source from another app.

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
  - Add only the picker/audio/filesystem/native module dependencies required by the first slice.

New:

- `apps/buddy/src/features/buddy/types.ts`
- `apps/buddy/src/features/buddy/model-catalog.ts`
- `apps/buddy/src/features/buddy/model-manager.ts`
- `apps/buddy/src/features/buddy/chat-service.ts`
- `apps/buddy/src/features/buddy/attachment-service.ts`
- `apps/buddy/src/features/buddy/prompt-builder.ts`
- `apps/buddy/src/features/buddy/persistence.ts`
- `apps/buddy/src/features/buddy/__tests__/`
- `apps/buddy/modules/pocketops-litert-lm/` with Android LiteRT-LM and iOS Swift Package implementations
- `docs/decisions/007-buddy-gemma3n-native-runtime.md`

## Model/runtime contract

Expose a narrow native API:

- `getRuntimeInfo()`
- `loadModel(modelId, modelPath)`
- `unloadModel()`
- `generate(request)` with streaming text/state callbacks
- `stopGeneration(requestId)`

The request carries text plus optional supported image/audio inputs. The native layer owns LiteRT-LM engine/conversation handles and releases them on model switch, stop, and module teardown. JavaScript state stores only serializable status, messages, paths, and metadata.

Model states shown in the UI:

- Not installed
- Downloading
- Verifying
- Ready
- Loading
- Generating
- Failed

Default E2B; E4B requires explicit selection and installation. Do not resolve `latest` at runtime: pin official artifact URLs, revisions, licenses, and SHA-256 checksums in the catalog.

## Attachments

Use the smallest practical picker surface:

- Generic files: `expo-document-picker`.
- Images: `expo-image-picker` or document-picker image MIME filters.
- Audio files: document-picker audio MIME filters.
- Microphone recording: defer unless the first attachment slice is stable; add the SDK-57-compatible audio package only then.

Supported first-slice content:

- Images accepted by the pinned Gemma 3n LiteRT-LM model.
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

Shared:

- UI, picker orchestration, model catalog, limits, persistence, prompt construction, and error states.

Android:

- First native target.
- Finish and verify the Kotlin LiteRT-LM bridge on a physical arm64 Android device.
- Use LiteRT-LM Android dependency and Gemma `.litertlm` artifacts.

iOS:

- Implement the Swift Package Manager LiteRT-LM bridge separately.
- The current iOS stub must remain visibly unavailable until the Swift runtime is linked and tested.
- Do not claim iOS Gemma support from Android success.
- If the pinned LiteRT-LM release cannot load the selected Gemma artifacts on iOS, keep the model disabled there with a clear explanation; do not silently use cloud inference.

Expo Go is not a valid native-model test target. Use a development build/native build.

## Phases

1. Baseline: run Buddy typecheck/lint/tests; record branch/base and inspect existing dirty state.
2. Contracts: add model catalog, attachment types, native bridge interface, persistence shape, and unit tests.
3. Model install: add E2B default and E4B optional download/checksum/ready states.
4. Android text: wire native E2B generation into the existing Buddy chat and stream typing output.
5. Attachments: add file/image/audio picker chips, app-owned copies, limits, and supported media input.
6. Model switching: add E4B selection, cancellation, unload/load lifecycle, and visible failures.
7. iOS: implement and verify Swift native bridge; leave it explicitly unavailable until complete.
8. Device gates: Android airplane-mode run, model load, text generation, image/audio samples, restart persistence, cancellation, memory/reload cycle.

## Acceptance criteria

- Buddy opens with Gemma 3n E2B selected by default.
- E4B is selectable and never silently substitutes E2B.
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
