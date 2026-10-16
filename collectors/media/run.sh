#!/usr/bin/env bash
set -u
cd "$(dirname "$0")" || exit 1
# Bounded restart only for process failures. Blocked sites stay paused in state/.
for attempt in 1 2 3; do
  timeout 600 python3 collect.py && exit 0
  [ "$attempt" = 3 ] && exit 1
  sleep 60
done
