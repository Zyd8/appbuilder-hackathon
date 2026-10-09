# Simple Local-AI Chat MVP

- Status: active
- Scope: hackathon demo only
- Authentication: none
- Target: React Native app that can run in Expo Go

## Goal

Create the smallest useful local-AI demo: open the app, type a question, and talk to a bot even when cloud access is unavailable.

## User experience

1. Open the app directly to the chat screen.
2. Type a question.
3. The app searches its bundled synthetic local knowledge first.
4. It shows a source-grounded answer without requiring a network.
5. Optionally, it sends the question plus selected local context to a local host on the same Wi-Fi network.
6. If the host is unavailable, the app falls back to the local answer.
7. Chat history is stored on-device and survives restart.

## Explicit non-goals

- No sign-in, accounts, roles, or authentication.
- No cloud database.
- No payments or analytics.
- No multi-user sync.
- No background jobs.
- No camera, audio, OCR, maps, or notifications.
- No custom native LLM runtime in Expo Go.

## Expo Go truth

The Expo Go demo can support the chat UI, local message history, bundled synthetic knowledge, deterministic local retrieval, and a foreground HTTP request to a local host. Expo Go cannot honestly be used to claim that an arbitrary LLM runs directly on the phone. Direct on-device inference requires a future development build with a native model runtime.

## Modes

- Offline: no network request; answer from bundled local knowledge.
- Fixture: deterministic demo answers for repeatable judging.
- LAN local model: optional request to a developer-controlled local host. The app displays the mode and falls back safely when the host is down.

## Minimum implementation

- One chat screen.
- Message list with user and bot bubbles.
- Text input and Send button.
- Clear mode badge: Offline, Fixture, or LAN local model.
- AsyncStorage message history.
- Local retrieval over a small synthetic knowledge file.
- Optional `POST /v1/chat` local-host endpoint.
- Settings field for the local-host URL and a connection test.
- Reset chat button.

## Demo script

1. Open the app; no login is shown.
2. Ask: “How do I prepare the generator when the internet is down?”
3. Show a local answer and its source label.
4. Enable airplane mode.
5. Ask another question and show that the conversation still works.
6. Restart the app and show that chat history remains.
7. Optionally reconnect to trusted local Wi-Fi and use the local host.
8. Stop the host and show the app falling back to offline mode.
9. State clearly that Expo Go is using local retrieval/fixture mode, not an embedded phone LLM.

## Done means

- A user can chat without authentication.
- The core conversation works with the phone offline after the bundle loads.
- Messages survive restart.
- Answers identify their source/mode.
- Local-host failure does not break chat.
- No secrets or real personal data are committed.
