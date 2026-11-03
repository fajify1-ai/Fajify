# Android verification preparation — 2026-10-27

## Confirmed local state

Flutter 3.47.8 / Dart 3.13.7: `C:\Users\omola\develop\flutter`.
Java 24.0.2 is installed at `C:\Program Files\Java\jdk-24`. Flutter doctor cannot
locate Android SDK; sdkmanager/adb and Android Studio were not found in checked
locations. No Android device/emulator is listed. Flutter and Dart are not on PATH.
All 80 Flutter tests and static analysis pass. A sandboxed doctor invocation was
interrupted when it did not finish; the cache-enabled rerun completed and confirmed
the missing SDK. No successful debug APK build or native authentication run is claimed.

Repository requirements:

| Requirement | Evidence |
| --- | --- |
| AGP 9.1.0, Kotlin 2.4.0 | `apps/customer_mobile/android/settings.gradle.kts` |
| Gradle 9.3.1 | `android/gradle/wrapper/gradle-wrapper.properties` |
| compile/target API 36 | FlutterExtension.kt in installed Flutter SDK; app inherits Flutter values |
| Minimum API 24 | Flutter minimum 24; app uses maxOf(flutter.minSdkVersion, 23) |
| NDK 28.2.13676358 | Installed FlutterExtension.kt, inherited by app |
| Build Tools 36.0.0; JDK minimum 17 | Official AGP 9.1 compatibility table |
| Java/Kotlin bytecode target 17 | `android/app/build.gradle.kts` |

The system JDK 24 meets the minimum and is supported by this Gradle generation;
actual plugin/build compatibility remains unverified until the SDK is installed.
Do not change pinned Gradle/AGP/Kotlin versions to bypass a failure without review.
Release currently uses debug signing in the existing source. That configuration
was not changed; this work verifies debug builds only, not production signing.

## Exact PowerShell setup commands

These are instructions for the developer, not installations already performed.
Read the Android SDK terms on the official download page before downloading.
The URL/checksum below were verified against that page on 2026-10-27.
No release keys or machine paths should be committed.

```powershell
$ErrorActionPreference = 'Stop'
$Sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$Flutter = 'C:\Users\omola\develop\flutter\bin\flutter.bat'
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-24'
$env:ANDROID_HOME = $Sdk
$env:PATH = "$env:JAVA_HOME\bin;C:\Users\omola\develop\flutter\bin;$Sdk\platform-tools;$env:PATH"

$Stage = Join-Path $env:TEMP ('fajify-android-tools-' + [guid]::NewGuid().ToString('N'))
$null = New-Item -ItemType Directory -Path $Stage
$Zip = Join-Path $Stage 'commandlinetools.zip'
Invoke-WebRequest -Uri 'https://dl.google.com/android/repository/commandlinetools-win-15859902_latest.zip' -OutFile $Zip
if ((Get-FileHash -LiteralPath $Zip -Algorithm SHA256).Hash -ne '90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a') {
    throw 'Android tools checksum mismatch; do not install'
}
Expand-Archive -LiteralPath $Zip -DestinationPath (Join-Path $Stage 'unpacked')
$Tools = Join-Path $Sdk 'cmdline-tools\latest'
if (Test-Path -LiteralPath $Tools) { throw 'Existing command-line tools found; preserve and inspect them first' }
$null = New-Item -ItemType Directory -Path (Split-Path $Tools -Parent) -Force
Copy-Item -LiteralPath (Join-Path $Stage 'unpacked\cmdline-tools') -Destination $Tools -Recurse
$SdkManager = Join-Path $Tools 'bin\sdkmanager.bat'
& $SdkManager "--sdk_root=$Sdk" --licenses
# Review license prompts interactively; do not automatically pipe acceptance.
& $SdkManager "--sdk_root=$Sdk" --install 'platform-tools' 'platforms;android-36' 'build-tools;36.0.0' 'ndk;28.2.13676358'
& $Flutter config --android-sdk $Sdk
& $Flutter config --jdk-dir $env:JAVA_HOME
& $Flutter doctor --android-licenses
& $Flutter doctor -v
```

sdkmanager is still provided by the verified command-line tools package. Google's
current docs also describe the newer Android CLI; no CLI migration is needed for
this existing Flutter setup. For an IDE, optional installation is
`winget install --exact --id Google.AndroidStudio --source winget`; preserve the
existing SDK path when completing its setup wizard.

Debug verification (after installation succeeds):

```powershell
Set-Location 'C:\Users\omola\OneDrive\Desktop\Fajify-main\apps\customer_mobile'
& $Flutter pub get --enforce-lockfile
& $Flutter test
& $Flutter analyze
& $Flutter build apk --debug --dart-define=FAJI_CUSTOMER_NATIVE_AUTH_ENABLED=false
& (Join-Path $Sdk 'platform-tools\adb.exe') devices -l
& $Flutter devices
```

`pub get` may require Windows Developer Mode for plugin symlinks. Enable it through
Windows Settings if reported; do not remove plugins or change dependency versions.
Flutter writes SDK paths to ignored `android/local.properties`; verify it remains
untracked with `git check-ignore android/local.properties`. No manual signing edits.

For a real device, enable Developer options/USB debugging, install its vendor USB
driver if needed, then approve this PC on the device. For an optional emulator:

```powershell
& $SdkManager "--sdk_root=$Sdk" --install 'emulator' 'system-images;android-36;google_apis;x86_64'
& (Join-Path $Tools 'bin\avdmanager.bat') create avd --name FajifyM2P2_api36 --package 'system-images;android-36;google_apis;x86_64'
& (Join-Path $Sdk 'emulator\emulator.exe') -avd FajifyM2P2_api36 -no-snapshot-load
```

AVD creation is interactive and must not overwrite an existing AVD. Hardware
virtualization and Windows Hypervisor Platform may need enabling/rebooting.
Once Flutter lists a device, use `flutter run -d DEVICE_ID` with authentication
disabled first. Only use an externally reviewed, untracked public dart-define
configuration file for live OIDC after Phase 1 approval; never put a client secret
in native configuration. Verify browser handoff, callback, verification/recovery,
process restart, refresh, expiry, logout and secure-store denial on device.

Sources: [AGP 9.1 compatibility](https://developer.android.com/build/releases/agp-9-1-0-release-notes),
[official tools/download checksum](https://developer.android.com/studio),
[sdkmanager usage](https://developer.android.com/tools/sdkmanager),
[Gradle Java compatibility](https://docs.gradle.org/current/userguide/compatibility.html),
[Flutter Android setup](https://docs.flutter.dev/platform-integration/android/setup).
