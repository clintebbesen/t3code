#!/usr/bin/env sh
# Vite+ owns repository hooks. Keep the user's configured global policy hook active.
set -eu
hook_name="$1"
shift
case "$hook_name" in pre-commit|commit-msg|pre-push) ;; *) exit 2 ;; esac
global_hooks="$(git config --global --path --get core.hooksPath || true)"
[ -n "$global_hooks" ] || exit 0
[ -d "$global_hooks" ] || exit 0
global_hooks="$(cd "$global_hooks" && pwd -P)"
project_hooks="$(cd .vite-hooks && pwd -P)"
# A global Vite+ path already routes here. Do not recursively call it.
case "$global_hooks" in "$project_hooks"|"$project_hooks/_") exit 0 ;; esac
[ -x "$global_hooks/$hook_name" ] || exit 0
exec "$global_hooks/$hook_name" "$@"
