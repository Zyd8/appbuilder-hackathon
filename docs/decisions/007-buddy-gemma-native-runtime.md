# ADR-007: Buddy on-device Gemma runtime — Gemma 4 GGUF through llama.rn

- Status: accepted
- Date: 2026-10-09
- Scope: `apps/buddy` chatbot (`src/app/(tabs)/buddy.tsx`, `src/features/buddy/`)
- Related: ADR-002, ADR-003, ADR-004

## Context

The Buddy chatbot needed a real on-device model instead of the preview timer reply. The requirements were: Gemma running on Android **and** iOS out of the box, with the least possible integration friction, plus file, image, and audio attachments.

Three routes were evaluated:

1. **LiteRT-LM** with Gemma `.litertlm` artifacts, wrapped in a local Expo native module.
2. **llama.rn** (llama.cpp) with Gemma 4 GGUF artifacts and its Expo config plugin.
3. **Google AI Edge / MediaPipe LLM Inference**, iOS-capable but a third integration with its own packaging.

Facts that decided it:

- `llama.rn` publishes prebuilt binaries for both platforms (`ios/rnllama.xcframework`, `android/src/main/jniLibs/arm64-v8a`) and an Expo config plugin, so one dependency covers Android and iOS with no custom native code.
- LiteRT-LM works, but it is Android/JVM-first; the iOS side needs a separate Swift Package integration, which doubles the surface to build, test, and keep in sync.
- The dev machines available are a Linux VPS and a Linux laptop. Neither can build iOS. A route that needs a hand-written iOS native module is therefore unverifiable here, while `llama.rn`'s iOS support is a shipped binary that the same code path uses.
- ADR-004 already named `llama.rn` as the intended Phase 5 on-device AI path, so this choice follows the team's own stack decision rather than diverging from it.

## Decision

Use **`llama.rn` 0.13.0-rc.7** with **Gemma 4 GGUF** artifacts.

- `Gemma Default` = Gemma 4 E2B, `gemma-4-E2B-it-qat-UD-Q2_K_XL.gguf` plus its `mmproj-F16.gguf` projector. Selected by default.
- `Gemma Pro` = Gemma 4 E4B, `gemma-4-E4B-it-qat-UD-Q2_K_XL.gguf` plus its projector. Opt-in.
- Artifacts come from the published mobile QAT GGUF repositories (`unsloth/gemma-4-E2B-it-qat-mobile-GGUF`, `unsloth/gemma-4-E4B-it-qat-mobile-GGUF`). The `UD-Q2_K_XL` build is chosen because device free space, not quality, is the binding constraint.
- `chat-service.ts` caches one `LlamaContext` per model id, releases it before switching, and attaches the projector with `initMultimodal` when the file is present.
- Images are sent through `media_paths` using the projector. If the projector is missing, the prompt states that the image could not be read rather than silently ignoring it.

## Explicitly not supported

- **Audio input.** The pinned Gemma 4 `mmproj` carries a vision projector, not an audio one. Audio files can be picked and stored, but they are labelled as not readable and never sent. No audio claim is made until a runtime and projector prove it.
- **Token streaming.** The reply arrives whole; the UI keeps its existing typing indicator.
- **Restart persistence** for chat is still the preview store's in-memory state, unchanged from before this work.
- **iOS verification.** The code and dependency are shared, but nothing has been built or run on iOS. Simulators do not support the Metal path, and this machine is Linux.

## Alternatives considered

- **LiteRT-LM local Expo module (built, then reverted).** A working Android implementation was compiled against `litertlm-android`, but it left iOS as a permanent stub, required a custom module to maintain, and added a Kotlin/Kotlin-metadata workaround. Rejected on the out-of-the-box iOS requirement.
- **Larger GGUF quantizations.** Better quality, but Gemma Default already needs roughly 3.2 GB and the test device had about 4 GB free. Rejected on storage.
- **Cloud fallback.** Rejected outright: the product is offline-first and must not quietly reach the network.

## Consequences

- One runtime, one model format, one code path for both platforms.
- The native build gains a C++ dependency; first builds are slow because llama.cpp compiles.
- Swapping the model family or the runtime means editing `types.ts` and `chat-service.ts` only. The UI, store, and attachment handling do not change.
- Swapping back to LiteRT-LM later would only make sense if `.litertlm` packaging becomes a hard requirement.

## Verification

- `apps/buddy`: `npx tsc --noEmit`, `npx expo lint`, `npx jest` all pass.
- Expo autolinking and Gradle compile must be re-run after any change to the plugin list or model catalog.
- A claim of working on-device generation requires a development build on a physical device with the model installed and the network disabled. Until that evidence exists, the feature is reported as unverified.
