# Android App — 股票倉位計算器

Native Android port of the web app, with 1:1 feature parity. Reuses the
Vercel `/api/quotes` proxy and Supabase backend — the web and Android apps
share the same account and trade history.

## Stack

- Jetpack Compose + Material 3 (dark theme)
- Hilt DI, Ktor HTTP, supabase-kt (auth + postgrest), DataStore
- Clean Architecture (`domain` / `data` / `ui`)
- Min SDK 26 (Android 8), Target SDK 35

## Build

```bash
cd android

# one-time: write local.properties pointing at your Android SDK
echo "sdk.dir=$HOME/Library/Android/sdk" > local.properties

# debug APK
./gradlew :app:assembleDebug
# output: app/build/outputs/apk/debug/app-debug.apk

# install on connected device / emulator
./gradlew :app:installDebug

# run unit tests
./gradlew :app:testDebugUnitTest
```

## Sideload (personal device)

1. On your Android phone: Settings → Security → enable "Install unknown apps"
   for the app you'll transfer the APK with (Files, Drive, etc.).
2. Copy `android/app/build/outputs/apk/debug/app-debug.apk` to the phone.
3. Tap the APK file to install.

## Release signing (when you're ready to ship)

```bash
# one-time: generate a keystore
keytool -genkey -v -keystore release.keystore \
  -alias stockcalc -keyalg RSA -keysize 2048 -validity 10000

# create android/app/keystore.properties (gitignored) with:
#   storeFile=../release.keystore
#   storePassword=...
#   keyAlias=stockcalc
#   keyPassword=...

# wire signing into app/build.gradle.kts inside the android { } block
#   (before buildTypes):
#   val keystoreProps = java.util.Properties().apply {
#       val f = rootProject.file("app/keystore.properties")
#       if (f.exists()) load(f.inputStream())
#   }
#   signingConfigs {
#       if (keystoreProps.isNotEmpty()) create("release") { ... }
#   }
# and in buildTypes.release:
#   if (keystoreProps.isNotEmpty()) signingConfig = signingConfigs.getByName("release")

./gradlew :app:assembleRelease
```
