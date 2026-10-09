# Buddy Pixel 9A offline verification record

Status: **not run**. Fill this on a physical Pixel 9A with an Android development build. Use synthetic account, onboarding, notes, and photos. Record only state, counts, hashes, durations, and error codes; do not copy prompt, memory, note, image, transcript, token, URI, or account contents into evidence.

## Build and protocol identity

| Field | Result |
|---|---|
| Device model and Android version (no device serial) | Pending |
| Git commit (`git rev-parse HEAD`) | Pending |
| Android build artifact SHA-256 | Pending |
| `llama.rn` and Expo versions (`apps/buddy/package.json`) | Pending |
| Model catalog ID, pinned revision, model SHA-256, projector SHA-256 | Pending |
| Installed model SHA-256 verified by app | Pending |
| Tool protocol hash (`sha256sum apps/buddy/src/features/buddy/contracts/tool-protocol.ts apps/buddy/src/features/buddy/tools/tool-registry.ts`) | Pending |
| Date/time and tester | Pending |

## Before airplane mode

- [ ] Install a development build from the recorded commit. Confirm the app starts and reports the selected model ID and readiness honestly.
- [ ] Use the manual model UI to install the pinned model and projector with explicit consent. Confirm size and SHA-256 verification before readiness becomes `ready`.
- [ ] With a synthetic account, complete onboarding; check that eight stats and Insight 1/2 are derived from the saved answers rather than the preview profile.
- [ ] Save a synthetic quest, check-in, XP award, and note. Close and reopen the app; confirm the same namespace and expected revisions return.

## Airplane-mode execution

Enable airplane mode and separately verify Wi-Fi is off. Do not infer offline operation solely from a mocked network failure.

- [ ] Launch the app cold while offline. Record model readiness and initialization outcome, duration, and any error code.
- [ ] Ask Buddy to read onboarding, profile, stats, ordered insights, quest board/detail, current check-in, XP/level/rank, notes, USER/BOT memory, and model/input status. Record returned tool names and result metadata; do not record result bodies.
- [ ] Ask Buddy to create one synthetic todo. Check that the exact body and metadata appear on a confirmation surface and the note count has not changed.
- [ ] Reject once; verify no note is written and no model-authored success statement appears. Repeat and confirm; verify one local note is written and read back by ID before a success statement appears.
- [ ] Force a matching idempotency-key retry after restart; verify one logical note. Try the same key with changed content and a new key with a stale revision; verify typed conflict/stale errors and no extra write.
- [ ] Test six-call exhaustion and a malformed/mixed final/tool envelope with a scripted build if the physical model cannot be induced reliably. Verify no raw reasoning or tool JSON is shown.
- [ ] Verify quest proof-photo URI/path is absent from all model/tool input and widget/share snapshots. Confirm audio capability reports false; do not claim audio comprehension.
- [ ] Restart offline. Check completion ledger, daily XP cap, profile, check-in, note receipt, and USER/BOT namespace isolation. Switch account/guest only through the app's explicit flow; verify no automatic merge.

## Failure and recovery observations

- [ ] Stop generation and verify cancellation state. Repeat with model missing/incompatible and with low storage; record only readiness/error state.
- [ ] Interrupt one local memory write in a controlled test build; verify last validated backup recovery, without copying memory text into logs.
- [ ] Toggle connectivity only after the offline checks. Verify ADR-010 max-XP backup never lowers the device total; note any pending sync or conflict indication.

## Result

| Gate | Pass / Fail / Not run | Evidence reference without private content |
|---|---|---|
| Android build and model integrity | Not run | — |
| Physical offline tool loop | Not run | — |
| Confirmation, write, read-back, retry | Not run | — |
| Restart and namespace recovery | Not run | — |
| Privacy and presentation | Not run | — |

Do not mark Phase 5 or Android offline acceptance complete until the recorded build and all required gates pass. This checklist makes no iOS claim; iOS needs its own physical-device record.
