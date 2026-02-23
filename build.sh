#!/bin/bash
set -e

echo "==> Building frontend..."
npm run build

echo "==> Building Tauri app..."
cargo build --release --manifest-path src-tauri/Cargo.toml

echo "==> Done: src-tauri/target/release/journal-gui"
