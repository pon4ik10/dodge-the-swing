#!/usr/bin/env node
/* Give every build a higher versionCode.
 *
 * Left at 1, each new APK looks to Android like the same version as the one
 * already installed. Phones then refuse it ("App not installed"), and the
 * usual way round that is to uninstall first - which deletes the app's
 * storage, taking the signed-in account and every level with it.
 *
 * A higher number makes it a real update: it installs over the top and keeps
 * everything.
 */
const fs = require('fs'), path = require('path');
const gradle = path.resolve(__dirname, '..', 'native', 'android', 'app', 'build.gradle');
let s = fs.readFileSync(gradle, 'utf8');

const code = parseInt((s.match(/versionCode\s+(\d+)/) || [])[1] || '0', 10) + 1;
const name = '1.' + code;
s = s.replace(/versionCode\s+\d+/, 'versionCode ' + code);
s = s.replace(/versionName\s+"[^"]*"/, 'versionName "' + name + '"');
fs.writeFileSync(gradle, s);
console.log('  version ' + name + ' (code ' + code + ') - installs over the old app, keeping your data');
