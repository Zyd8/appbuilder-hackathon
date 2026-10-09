# ADR-002: Native Cross-Platform On-Device Inference

- Status: proposed
- Date: 2026-10-09
- Scope: Android and iOS hackathon demo

## Context

The defining requirement is that the LLM itself runs inside the mobile app. A LAN host or cloud API is not an acceptable primary path. Expo Go cannot load arbitrary native inference libraries, so the real demo cannot remain Expo Go-only.

## Decision

Keep the React Native UI and chat application layer shared, but deliver the inference demo as an Expo development build/native app for both Android and iOS.

The first runtime to evaluate is `llama.rn`, a React Native binding of `llama.cpp` with Android and iOS support. The first model candidate is a small quantized Qwen3 GGUF model:

- Start with Qwen3 0.6B for the lowest device risk.
- Test Qwen3 1.7B as the quality upgrade if memory and latency are acceptable.
- Treat Qwen3.5-0.8B as an experimental newer candidate until its GGUF/mobile runtime path is verified.

The model must be downloaded or bundled before the offline test. Once installed, chat inference must run with network disabled.

## Expo boundary

- Expo Go remains useful for UI-only development and the deterministic fallback.
- Expo Go is not the acceptance target for native LLM inference.
- The acceptance target is a custom Expo development build or native build on one Android phone and one iOS device/simulator where the native runtime is supported.
- Adding `llama.rn` requires native project generation/configuration and cannot be verified honestly through Expo Go alone.

## Alternatives

- Gemma 3n with LiteRT-LM: strong mobile-oriented model, but the first integration path is more platform-specific and less direct for shared React Native code.
- ExecuTorch: credible native runtime, but the Java/Kotlin and Swift integration work is larger for this hackathon.
- Cloud or LAN inference: rejected as the primary demo because the model would not run inside the mobile app.

## Consequences

Benefits:

- The demo proves the actual local-AI requirement.
- No request to a cloud or laptop is needed after the model is installed.
- One React Native chat UI can target Android and iOS.

Costs:

- Expo Go cannot be the final inference target.
- Native builds, model packaging, memory use, and device performance must be tested.
- iOS model distribution and app-size constraints need explicit handling.
- A smaller model and short context are required for predictable mobile performance.

## Acceptance criteria

- Android inference works in airplane mode after model installation.
- iOS inference works in airplane mode after model installation.
- The app visibly reports the model name and native runtime.
- Chat history persists locally.
- No network request occurs when native mode is active.
- If native model loading fails, the app shows a clear error and does not silently claim local inference.
- Expo Go remains documented as a UI/fallback preview only.
