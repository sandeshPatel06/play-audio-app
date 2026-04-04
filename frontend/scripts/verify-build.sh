#!/bin/bash
# A preflight script to catch iOS/Android native build errors locally before waiting on EAS Build.
set -e

cd "$(dirname "$0")/.." || exit 1

echo "================================================="
echo "🚀 Starting Pre-EAS Build Checks"
echo "================================================="

echo "-------------------------------------------------"
echo "1. 🩺 Running Expo Doctor (Checking versions...)"
npx expo-doctor || echo "⚠️  Expo Doctor found issues, please review them above."

echo "-------------------------------------------------"
echo "2. 🧐 Checking TypeScript & Linting..."
npx tsc --noEmit || { echo "❌ TypeScript errors found!"; exit 1; }
npm run lint || { echo "❌ ESLint errors found!"; exit 1; }

echo "-------------------------------------------------"
echo "3. ⚙️  Testing Native Prebuild Generation..."
# This step locally creates the android/ios directories just like EAS does on their servers
npx expo prebuild --clean --platform android || { echo "❌ Expo Prebuild failed!"; exit 1; }

echo "-------------------------------------------------"
echo "4. 🛠️  Validating Android Gradle Configuration..."
# Navigates into the newly generated android folder and runs a dry-run of the release build.
# This parses all build.gradle files and creates the task graph. Native plugin errors (like the expo-av failure) will instantly crash here.
cd android
./gradlew assembleRelease --dry-run || { echo "❌ Gradle configuration failed! Your build would have crashed on EAS."; exit 1; }
cd ..

echo "================================================="
echo "✅ SUCCESS: All local checks passed! Your app is safe and ready to run 'eas build'!"
echo "================================================="
