# Play

Play is a mobile-first audio streaming app built with Expo and React Native.

## Project Structure

```text
play/
├── app/            # Expo Router app
├── assets/         # App assets
├── components/     # UI components
├── Makefile        # Project management
└── README.md

```

The app uses Expo Router and is designed for high-performance audio playback.

### Local setup

```bash
npm install
npx expo start
```


Useful commands:

- `npm run start:clear` clears Expo cache
- `npm run android` runs the native Android app
- `npm run android:rebuild` rebuilds the Android native app
- `npm run ios` runs the iOS app
- `npm run lint` runs ESLint

### Android worklets mismatch fix

If you see a warning like:

```text
[Worklets] Mismatch between C++ code version and JavaScript code version
```

the installed Android app was built with older native code. Rebuild it:

```bash
npm install
npx expo prebuild --clean --platform android
npm run android:rebuild
```


If needed, uninstall the existing app from the device/emulator first.

### EAS builds

The EAS profiles are defined in [`eas.json`](./eas.json).

Build production Android:

```bash
eas build --profile production --platform android
```

Build development client:

```bash
eas build --profile development --platform android
```


## Quick Start

```bash
npm install
npx expo start
```

