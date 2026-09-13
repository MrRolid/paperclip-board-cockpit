#!/bin/bash
# Backward-compatible wrapper kept for existing installations.
exec "$(cd "$(dirname "$0")" && pwd)/install-local.sh" "$@"
