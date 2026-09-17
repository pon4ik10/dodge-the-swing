# The Android app

The same game as the website, packaged so it installs like a normal app:
its own icon, fullscreen, and it works with no signal because the music
and sprites ship inside it.

## Rebuilding after changing the game

    cd native
    npm install          # first time only
    npm run apk

The APK is copied to your Desktop as `DodgeTheSwing.apk`, from:

    native/android/app/build/outputs/apk/debug/app-debug.apk

Copy that file to a phone and tap it. Android warns that it is from an
unknown source because it is not from the Play Store - that is expected,
and the warning is dismissible.

## Why the version number matters

`npm run apk` bumps `versionCode` before every build. Left at 1, each new APK
looks to Android like the same version already installed: the install is
refused, and the usual way past that is to uninstall first - which deletes the
app's storage, taking the signed-in account and every level with it.

Always install the new APK **over** the old one. Do not uninstall.

## What goes inside

`tools/build_www.js` assembles `native/www`: the page, the sprites, the
icons, and the **published** music copies from `music/web` - never the
full-quality originals, which stay on this machine.

It also injects `window.DTS_NATIVE = true`. The packaged app runs on
localhost just like a dev server does, so without that flag the game
would look for a test server on a laptop that is not there, and likes,
levels and accounts would all be dead. The flag means: use the live
server, use the bundled music, skip the web offline cache, hide the
Install button.

## Needed to build

- Java 21            `brew install openjdk@21`  (Capacitor 7 needs 21, not 17)
- Android SDK        command-line tools, in `~/Library/Android/sdk`
- `ANDROID_HOME` pointing at that SDK

The Play Store is not involved. Publishing there costs a one-time $25 and
needs a release key instead of the debug one this produces.
