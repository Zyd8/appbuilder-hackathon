# ADR-001: Expo Go First with Optional LAN-Local Inference

- Status: accepted for hackathon MVP
- Date: 2026-10-09
- Planner: GPT-5.6 Sol via `openai-codex`

## Context

The hackathon requires a useful local-AI workflow when cloud access disappears. React Native and Expo Go are preferred for rapid physical-device testing, but Expo Go cannot be treated as a host for arbitrary embedded LLM runtimes or custom native inference modules.

## Decision

Build PocketOps as a retrieval-first Expo Go sample. Persist guides, checklists, notes, and queued work locally. Use deterministic lexical retrieval as the always-available assistant. Add an optional LAN host adapter that can call a locally running model such as Ollama or llama.cpp. Keep a future native on-device adapter behind the same interface for a development build; it is not required for the MVP.

The UI must label Fixture, Offline retrieval, and LAN-local inference separately. A failed LAN/model request falls back to retrieval. A sync event is only acknowledged after exact-target read-back.

## Alternatives rejected

- Cloud-first assistant: violates the offline theme.
- Embedded LLM in Expo Go: unsupported claim and native-runtime risk.
- Native development build first: adds setup risk before the core workflow is proven.
- Embeddings first: unnecessary for a small synthetic corpus; deterministic lexical retrieval is easier to test and explain.

## Consequences

Benefits:

- The core workflow can be exercised in Expo Go.
- No model or cloud service is required for the offline path.
- A LAN-local model still provides a credible local-AI demo.
- Native inference can be added later without changing application use cases.

Costs:

- Offline retrieval is less fluent than a generated answer.
- LAN inference requires a trusted local network and host.
- Expo Go does not prove a standalone cold launch or terminated-app background sync.
- Native model performance and packaging remain future work.

## Verification

This decision is satisfied when a physical Android device can browse synthetic guides, search, edit notes/checklists, and inspect queued work with phone radios disabled after the bundle loads; when LAN failure falls back safely; and when no documentation claims that Expo Go runs an embedded LLM.
