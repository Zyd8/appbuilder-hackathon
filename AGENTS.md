# AGENTS.md

## Project

AppBuilder Hackathon is a local-first AI project. The app must remain useful when cloud services are temporarily unavailable, then synchronize safely when connectivity returns.

The repository is intentionally at the planning stage. Do not assume a framework, runtime, database, or deployment target until the project plan records that decision.

## Repository Layout

- `README.md` — short public project overview.
- `docs/` — durable project documentation.
- `docs/plans/` — product, architecture, implementation, and demo plans.
- `docs/decisions/` — architecture decision records (ADRs).
- `AGENTS.md` — instructions for AI agents and contributors.

When implementation begins, use the chosen stack's conventional folders for source and tests. Keep domain logic separate from UI, storage, model adapters, and network synchronization.

## Working Rules

- Read the relevant plan and decision records before changing behavior.
- Make small, reviewable changes. Do not rewrite unrelated files.
- Do not invent commands, APIs, dependencies, or infrastructure. Verify them in the repository or official documentation first.
- Keep offline behavior a first-class workflow, not an afterthought.
- Treat local storage as the source of truth for unsynchronized user work.
- Make cloud synchronization optional, observable, retryable, and idempotent.
- Surface stale data, queued actions, conflicts, and sync failures to the user.
- Never claim an external action completed until it has been verified after synchronization.

## Local-First Architecture

- Local reads and writes must work without network access.
- AI features should use local models where practical; cloud models are optional adapters.
- Keep provider-specific SDKs and HTTP calls outside core domain logic.
- Use narrow ports/adapters for model inference, persistence, OCR, transcription, and sync.
- Store stable external identifiers and sync metadata beside normalized records.
- Use append-only or otherwise idempotent sync events where practical.
- Design for retries, duplicate delivery, out-of-order events, offline edits, and conflict visibility.
- Do not silently discard local data when connectivity returns.

## Security and Privacy

- Never commit secrets, API keys, tokens, credentials, personal data, model weights, or local databases.
- Keep `.env`, credential files, logs, caches, transcripts, and runtime state out of version control.
- Use synthetic data in fixtures, screenshots, demos, and tests unless explicit permission says otherwise.
- Do not send local documents, audio, images, or prompts to a cloud provider without an explicit user-controlled path.
- Validate untrusted input at system boundaries and avoid logging sensitive content.

## Documentation

- Update `README.md` when setup, usage, or project purpose changes.
- Put new plans in `docs/plans/` using `YYYY-MM-DD-<slug>.md` or the next numbered plan filename.
- Record decisions that affect architecture, privacy, sync semantics, model choice, or deployment in `docs/decisions/`.
- Each plan must state scope, assumptions, risks, acceptance criteria, and how it will be verified.
- Keep plans honest: label unresolved decisions and blockers instead of filling them with placeholders that look complete.

## Testing and Verification

- Every feature begins with a testable behavior or acceptance criterion.
- Every bug fix adds a regression test when implementation exists.
- Test offline mode with network access disabled, not only with mocked errors.
- Test restart recovery, queued work, retries, duplicate events, stale data, and sync conflicts.
- Verify public workflows through the repository's declared commands once those commands exist.
- Before declaring work complete, run the relevant tests, inspect `git diff --check`, and confirm `git status` is clean or explain remaining changes.

## Git Conventions

- Branches: `feature/<slug>`, `fix/<slug>`, `docs/<slug>`, or `chore/<slug>`.
- Commits: Conventional Commit prefixes such as `feat:`, `fix:`, `docs:`, `test:`, and `chore:`.
- One logical change per commit.
- Never force-push or delete remote work unless the user explicitly authorizes it.

## Definition of Done

- [ ] Scope and affected files are clear.
- [ ] Relevant plan or decision record is updated.
- [ ] Tests or explicit verification steps exist and pass.
- [ ] Offline behavior and cloud-dependent behavior are clearly distinguished.
- [ ] No secrets, personal data, generated output, or unrelated changes are included.
- [ ] Documentation and README instructions match the actual repository.
- [ ] Diff and working-tree status were inspected before reporting completion.
