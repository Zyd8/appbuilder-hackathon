# PocketOps local host

Optional LAN host for the Expo Go demo. It provides deterministic local responses and sync acknowledgement without requiring a cloud service or an LLM installation. This keeps the demo testable; a real Ollama adapter can be added later behind the same endpoint.

Run:

```bash
node src/server.mjs
```

The host listens on `0.0.0.0:8787` and exposes:

- `GET /health`
- `POST /v1/answer`
- `POST /v1/sync/push`

Use the host machine's LAN IP in the app Settings screen, not `localhost`.
