# AppBuilder Hackathon

A local-first hackathon project exploring apps that remain useful when cloud services are temporarily unavailable.

## Theme

Build for graceful degradation:

- Core data and workflows remain available offline.
- AI inference runs locally where practical.
- New work is saved on-device instead of being lost.
- Cloud-dependent actions are queued and synchronized later.
- The app makes its offline and sync state visible to users.

## Possible Directions

- Offline emergency coordination
- Offline field technician assistant
- Local meeting recorder and action-item generator
- Offline school or library tutor
- Offline document and form assistant
- Offline incident-response copilot
- Local-first personal knowledge base
- Offline inventory and supply coordinator

## Working Principles

1. Design the offline workflow first.
2. Keep the local database authoritative for unsynchronized work.
3. Use local AI for retrieval, transcription, summarization, and assistance.
4. Treat cloud services as optional synchronization and enrichment layers.
5. Make retries, conflicts, stale data, and queued actions visible.
6. Never claim an external action completed until it has been verified after synchronization.

## Current direction

PocketOps is now intentionally small: an unauthenticated local-AI chat demo. Open the app, type a question, and talk to the bot. It answers from bundled synthetic local knowledge without cloud access, stores chat history on-device, and can optionally call a local host on the same Wi-Fi network.

The Expo Go sample is in `apps/expo-go-sample/`. The optional deterministic local host is in `services/local-host/`.

See `docs/plans/003-simple-local-chat.md` for the current scope. The earlier field-operations plan remains in `docs/plans/002-pocketops-mvp.md` as a future expansion, not a requirement for the hackathon demo.

## Run the Expo Go sample

```bash
cd apps/expo-go-sample
npm install
npx expo start --lan
```

Scan the displayed `exp://` URL in Expo Go. After the bundle loads, enable airplane mode and verify local guides, search, notes, and checklist progress. Expo Go may need Metro for a fresh load; the sample does not claim standalone cold launch.

## Run the optional local host

```bash
cd services/local-host
node src/server.mjs
```

Use the host machine's LAN IP in the app Settings screen. The current host is deterministic and cloud-free; it is a verified demo bridge, not yet a real Ollama integration.

## Documentation

- Product and implementation plan: `docs/plans/002-pocketops-mvp.md`
- Expo Go/native boundary: `docs/decisions/001-expo-go-local-ai-boundary.md`
- Contributor and agent rules: `AGENTS.md`

## Status

Expo Go demo scaffolded and verified through TypeScript, Expo Android export, local-host health/answer/sync checks, and duplicate-event behavior. Physical-device QR scan still needs to be exercised on the target Android device.

## License

To be decided.
