#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repository_dir="$(cd "$project_dir/.." && pwd)"
keystore="${XSISTEN_UPLOAD_STORE_FILE:-$project_dir/xsisten-upload.keystore}"
manifest="$project_dir/twa-manifest.json"
package_name="$(node -p 'require(process.argv[1]).packageId' "$manifest")"
version_name="$(node -p 'require(process.argv[1]).appVersionName' "$manifest")"
version_code="$(node -p 'require(process.argv[1]).appVersionCode' "$manifest")"

if [[ ! -f "$keystore" ]]; then
    echo "Keystore not found: $keystore" >&2
    exit 1
fi

if [[ -z "${XSISTEN_UPLOAD_STORE_PASSWORD:-}" ]]; then
    read -r -s -p "Keystore password: " XSISTEN_UPLOAD_STORE_PASSWORD
    echo
fi
if [[ -z "${XSISTEN_UPLOAD_KEY_PASSWORD:-}" ]]; then
    read -r -s -p "Key password: " XSISTEN_UPLOAD_KEY_PASSWORD
    echo
fi

export XSISTEN_UPLOAD_STORE_FILE="$keystore"
export XSISTEN_UPLOAD_STORE_PASSWORD
export XSISTEN_UPLOAD_KEY_ALIAS="${XSISTEN_UPLOAD_KEY_ALIAS:-xsisten-upload}"
export XSISTEN_UPLOAD_KEY_PASSWORD

if [[ -z "${ANDROID_HOME:-}" && -d "$HOME/.bubblewrap/android_sdk" ]]; then
    export ANDROID_HOME="$HOME/.bubblewrap/android_sdk"
fi

if [[ -z "${ANDROID_HOME:-}" || ! -d "$ANDROID_HOME" ]]; then
    echo "Android SDK not found. Set ANDROID_HOME before releasing." >&2
    exit 1
fi

cd "$project_dir"
./gradlew --no-daemon clean assembleRelease bundleRelease

apk="$project_dir/app/build/outputs/apk/release/app-release.apk"
aab="$project_dir/app/build/outputs/bundle/release/app-release.aab"
if [[ ! -f "$apk" || ! -f "$aab" ]]; then
    echo "Signed release artifacts were not generated." >&2
    exit 1
fi

if ! jarsigner -verify "$aab" >/dev/null; then
    echo "AAB signature verification failed." >&2
    exit 1
fi

build_tools="$(find "$ANDROID_HOME/build-tools" -mindepth 1 -maxdepth 1 -type d -print | sort -V | tail -n 1)"
aapt="$build_tools/aapt"
apksigner="$build_tools/apksigner"
if [[ ! -x "$aapt" || ! -x "$apksigner" ]]; then
    echo "aapt or apksigner was not found in the Android SDK." >&2
    exit 1
fi
if ! "$apksigner" verify "$apk"; then
    echo "APK signature verification failed." >&2
    exit 1
fi

certificate="$(keytool -printcert -jarfile "$apk")"
fingerprint="$(sed -n 's/^[[:space:]]*SHA256: //p' <<< "$certificate" | head -n 1)"
if [[ -z "$fingerprint" ]]; then
    echo "Unable to read the APK signing fingerprint." >&2
    exit 1
fi

assetlinks="$repository_dir/public/.well-known/assetlinks.json"
if ! node -e '
const fs = require("node:fs");
const [file, packageName, fingerprint] = process.argv.slice(1);
const links = JSON.parse(fs.readFileSync(file, "utf8"));
const trusted = links.some(({ target }) =>
    target?.package_name === packageName && target.sha256_cert_fingerprints?.includes(fingerprint),
);
if (!trusted) process.exit(1);
' "$assetlinks" "$package_name" "$fingerprint"; then
    echo "APK fingerprint is not trusted by public/.well-known/assetlinks.json: $fingerprint" >&2
    exit 1
fi

badging="$("$aapt" dump badging "$apk" | sed -n '1p')"

if [[ "$badging" != *"name='$package_name'"* || "$badging" != *"versionCode='$version_code'"* || "$badging" != *"versionName='$version_name'"* ]]; then
    echo "APK identity does not match twa-manifest.json: $badging" >&2
    exit 1
fi

echo "Verified signed APK: $apk"
echo "Verified signed AAB: $aab"
echo "Package: $package_name"
echo "Version: $version_name ($version_code)"
echo "SHA-256: $fingerprint"
