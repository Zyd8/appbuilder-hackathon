# PocketOps Local-First Mobile Demo Plan

- Status: active
- Planner: GPT-5.6 Sol via `openai-codex` (session `20261009_080724_b2dbc7`)
- Product: PocketOps — an offline field guide and incident notebook with optional LAN-local AI assistance

## Goal

Deliver a React Native demo that remains useful when cloud access disappears. A technician can browse synthetic guides, search locally, ask a grounded question, complete a checklist, save notes, and queue work without a network. An optional LAN host can use a local model such as Ollama to synthesize answers from phone-selected passages.

## Options considered

| Option | Offline value | Expo Go fit | Demo value | Risk |
|---|---:|---:|---:|---:|
| PocketOps offline field assistant | High | High | High | Keep domain narrow |
| Personal knowledge vault | High | High | Medium | Can feel generic |
| Maintenance inspector | High | High | High | Needs credible workflow |
| Travel/evacuation planner | High | High | High | Maps and routing expand scope |
| Local meeting assistant | High | Medium | High | Audio/transcription/native work |
| Private symptom journal | High | High | Medium | Safety and medical positioning |
| Receipt/inventory assistant | Medium | Medium | Medium | OCR/camera complexity |

PocketOps is recommended because local retrieval remains valuable even with no model, it supports a clear offline demo, and it has a credible path to LAN-local inference without pretending Expo Go can run an arbitrary LLM.

## MVP scope

Screens:

- Home: connectivity, active mode, pending work, recent activity.
- Library: synthetic guides and sections.
- Search: deterministic local lexical search with ranked snippets.
- Ask: source-linked retrieval response, optional LAN-local answer, explicit mode label.
- Checklist: persisted checklist completion and notes.
- Activity: pending, acknowledged, failed, and conflict states.
- Settings: Fixture/Offline/LAN mode, editable host URL, health check, reset synthetic data.

Synthetic dataset:

- Six short guides, four categories, three checklists, scripted questions, overlapping sections for ranking tests, and a conflict fixture.
- No real manuals, customer data, personal information, API keys, or copied operational content.

Non-goals:

- Cloud accounts, production sync, arbitrary PDF/OCR, speech, maps, widgets, push notifications, background sync, and production handling of sensitive data.

## Expo Go boundary

Expo Go can validate the JavaScript UI, bundled fixtures, Expo-supported SQLite, local lexical retrieval, foreground persistence, fixture answers, manual sync, and foreground HTTP requests to an accessible LAN host.

Expo Go cannot honestly be used to claim support for embedded GGUF/llama.cpp/ONNX LLM execution, arbitrary custom native modules, production background synchronization, custom Android network-security policy, or standalone cold launch without Metro. Those require an Expo development build or another native build. Native inference is a stretch goal, never the critical path.

The demo uses three modes:

1. `Fixture`: deterministic synthetic responses for repeatable demos and tests.
2. `Offline`: retrieval-only output with visible source passages; no network calls.
3. `LAN`: phone retrieves locally, then sends bounded passages to a local host that may adapt Ollama or llama.cpp. The app validates citations and falls back to Offline mode on failure.

## Architecture

Use TypeScript with strict mode, Expo, Expo Router or React Navigation, Expo-supported SQLite, Jest, React Native Testing Library, and runtime validation at HTTP/fixture boundaries. Keep domain/application code free of React Native, Expo, SQLite, HTTP, and model-vendor imports.

Suggested layout:

```text
apps/expo-go-sample/      Expo Go demo
services/local-host/      optional LAN adapter and sync target
packages/contracts/       versioned request/response contracts
packages/domain/          entities and policies
packages/retrieval/       tokenizer, index, deterministic ranker
packages/inference/       fixture, offline, LAN adapters
packages/sync/            outbox and conflict policies
docs/plans/               implementation and demo plans
docs/decisions/           architecture decisions
```

For the first executable slice, it is acceptable to keep shared logic inside the Expo app while the boundaries remain explicit. Do not add a monorepo abstraction only for appearance.

## Local data and sync

Persist guides, sections, checklists, notes, activity, inference metadata, and outbox operations locally. User mutations must write the entity and its outbox entry atomically. Generate a stable opaque idempotency key once per logical operation and reuse it on retries.

Outbox states:

- `pending`
- `sending`
- `acknowledged`
- `failed`
- `conflict`

A successful HTTP response is not enough to show `acknowledged`; the client must read back the exact operation. Duplicate keys return the original acknowledgement. Stale revisions preserve local and remote copies and require explicit resolution. Never silently discard local notes or checklist work.

## Local retrieval and inference

Start with deterministic lexical retrieval: normalized tokens, exact phrase and heading boosts, bounded snippets, and deterministic tie-breaking. Return source IDs, titles, snippets, scores, and matched terms. Limit context before sending to the LAN host.

The inference port returns the answer, mode, model/provider metadata, cited source IDs, warnings, and request ID. Unknown citation IDs are rejected. If the model host fails or produces malformed output, show the retrieval passages and a clear fallback state.

## Local host

The host should expose versioned endpoints only after implementation and verification:

- `GET /v1/health`
- `GET /v1/capabilities`
- `POST /v1/answer`
- `POST /v1/sync/push`
- `GET /v1/sync/pull?cursor=...`

It must not silently forward to cloud providers. Default to controlled LAN exposure, use a non-committed pairing/session token if needed, bound prompt size and source count, and avoid logging note bodies.

## Phases

1. Record decisions and contracts; scaffold the Expo Go sample.
2. Add synthetic fixtures, SQLite migrations, library, notes, and checklists.
3. Add deterministic local retrieval and source-linked Ask screen.
4. Add Fixture and Offline adapters with timeout/malformed-response tests.
5. Add the optional LAN host and one verified local-model adapter.
6. Add transactional outbox, idempotent sync, read-back, and conflict fixture.
7. Harden the physical-device demo, reset flow, accessibility, and documentation.

## Acceptance criteria

- Expo Go sample runs on a physical Android device.
- Guides, search, notes, and checklist edits work with phone radios disabled after bundle/fixture load.
- Notes and checklist progress survive app restart.
- Offline Ask returns useful cited passages without a model.
- Fixture responses are visibly labeled and never presented as on-device LLM output.
- LAN mode works over trusted local Wi-Fi with Internet unavailable, if the host is implemented.
- Host failure falls back to local retrieval without blocking local work.
- Queued work remains visible until push plus read-back verification.
- Duplicate delivery does not duplicate records.
- At least one conflict preserves both versions.
- Only synthetic data is committed or shown.

## Device verification

Use the connected Android device and the exact `exp://` URL printed by the active Expo server. Scan in Expo Go, open/reset synthetic data, create a note, complete a checklist item, restart the project, and verify persistence. Enable airplane mode and repeat browsing, search, notes, and checklist edits. If a LAN host exists, reconnect only to trusted local Wi-Fi, use the host address shown by its verified startup output, test health, run a LAN answer, stop the host, and verify retrieval fallback. Do not use `localhost` or claim standalone cold launch from Expo Go.

## Four-minute demo

1. Show synthetic-data and mode labels.
2. Open a generator or battery guide and checklist.
3. Search a known question and show ranked source passages.
4. Enable airplane mode; add a note, complete a checklist step, and ask again.
5. Show offline retrieval remains useful.
6. Optionally restore LAN-only connectivity and show local-host inference.
7. Stop the host and show safe fallback.
8. Show queued activity, read-back acknowledgement, duplicate protection, and a conflict fixture.
9. Close by stating exactly what Expo Go supports and what requires a native development build.
