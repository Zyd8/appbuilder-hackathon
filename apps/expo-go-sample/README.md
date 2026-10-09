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

## Build the native Qwen target

This requires Android SDK/Gradle for Android or Xcode/CocoaPods on macOS for iOS. It is not an Expo Go feature.

```bash
npx expo prebuild --clean --no-install
npx expo run:android
# or, on macOS:
npx expo run:ios
```

The repository has the `llama.rn` config plugin and New Architecture enabled. The native build still needs to be exercised on a real Android device and a real iOS device; the current Linux host cannot perform the iOS build.


This mode requires a custom Expo development build. Expo Go cannot load the native runtime. The model file must be installed on the device before airplane-mode testing; do not commit the GGUF file to Git.

The current code accepts a local `file://` model path and uses a bounded, source-grounded prompt. Start with the verified official model file `Qwen3-1.7B-Q8_0.gguf` from [Qwen's GGUF repository](https://huggingface.co/Qwen/Qwen3-1.7B-GGUF). Do not commit the model file; it is too large and has its own license terms.

Native runtime and model loading still require real-device verification on Android and iOS.
