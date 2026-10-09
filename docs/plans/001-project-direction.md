# Project Direction: Local-First AI Hackathon

- Status: proposed
- Owner: Hackathon team
- Last updated: 2026-10-09

## Goal

Build an application whose core workflow remains useful when cloud services are temporarily unavailable, using local AI for meaningful assistance and synchronizing safely when connectivity returns.

## Candidate Directions

- Offline emergency coordination
- Offline field technician assistant
- Local meeting recorder and action-item generator
- Offline school or library tutor
- Offline document and form assistant
- Offline incident-response copilot
- Local-first personal knowledge base
- Offline inventory and supply coordinator

## Recommended Starting Point

Evaluate the offline field technician assistant first because it has a clear workflow, a bounded document set, useful local retrieval, and a strong offline demonstration.

The product could store manuals, schematics, service history, inspection notes, equipment photos, and draft reports locally. A local model could answer grounded troubleshooting questions and generate a report. Parts requests or external updates would queue locally and synchronize later.

This recommendation is not final until the team confirms the target user, available hardware, model runtime, and demo constraints.

## Offline Contract

Must work without network access:

- Open previously synchronized manuals and records.
- Search and retrieve local documents.
- Run the selected local AI workflow.
- Create and edit notes.
- Draft reports.
- Queue outbound actions.

May require connectivity:

- Live external data.
- Remote notifications.
- Account or permission validation.
- Final delivery of queued external actions.
- Synchronization with shared server state.

## Initial Acceptance Criteria

- The main workflow completes with network access disabled.
- Local data survives app restart.
- AI answers cite or identify the local source material used.
- Queued work is visible to the user.
- Reconnection does not silently lose local work.
- Duplicate delivery and at least one conflict scenario are tested.
- The demo clearly shows what is local, queued, synchronized, and unavailable.

## Open Decisions

- Final product direction and target user.
- Supported device and operating system.
- Local model runtime and model size.
- Storage and indexing approach.
- Sync protocol and conflict policy.
- Whether the first release is a desktop app, mobile app, web app, or local-network app.
