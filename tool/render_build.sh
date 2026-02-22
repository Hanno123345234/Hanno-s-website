#!/usr/bin/env bash

set -euo pipefail

FLUTTER_HOME="${FLUTTER_HOME:-$HOME/flutter}"

if [ ! -d "$FLUTTER_HOME" ]; then
  echo "Installing Flutter SDK to $FLUTTER_HOME ..."
  git clone --depth 1 --branch stable https://github.com/flutter/flutter.git "$FLUTTER_HOME"
fi

export PATH="$FLUTTER_HOME/bin:$PATH"

flutter --version
flutter config --enable-web

flutter pub get
# iOS Safari is more reliable with the HTML renderer.
flutter build web --release --web-renderer html --dart-define=FLUTTER_WEB_USE_SKIA=false

echo "OK: build/web is ready"
