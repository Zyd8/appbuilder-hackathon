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

## Status

Early hackathon setup. Product direction and implementation are to be decided.

## License

To be decided.
