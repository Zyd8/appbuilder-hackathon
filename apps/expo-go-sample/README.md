# PocketOps Expo Go sample

This is the first physical-device demo for the AppBuilder Hackathon.

## What works in Expo Go

- Synthetic local guides and checklists
- Local lexical search
- Offline retrieval answers with visible source passages
- AsyncStorage persistence for notes, checklist progress, and queued work
- Optional foreground request to a reachable LAN host

## What this does not claim

Expo Go is not running an embedded LLM on the phone. A real on-device model runtime would require a separate Expo development build and native module. The default demo is complete without that capability.

## Run it

From this directory:

```bash
npm install
npx expo start --lan
```

Scan the displayed `exp://` QR code in Expo Go. After the bundle loads, enable airplane mode and verify that guides, search, notes, and checklist progress still work. Expo Go itself may need Metro for a fresh project load; this sample does not claim standalone cold launch.

## Modes

- Offline retrieval: no network calls; source passages only.
- Fixture response: deterministic synthetic response mode.
- LAN local model: optional request to `services/local-host` on the same trusted Wi-Fi network.

The app labels synthetic data and never treats queued work as synchronized without a host acknowledgement.
