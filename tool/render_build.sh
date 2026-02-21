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
flutter build web --release --pwa-strategy none

echo "OK: build/web is ready"
