#!/usr/bin/env bash
set -u
cd "$(dirname "$0")" || exit 1
# Bounded restart only for process failures. Blocked sites stay paused in state/.
for attempt in 1 2 3; do
  timeout 600 python3 collect.py
  status=$?
  [ "$status" = 0 ] && exit 0
  # Site failures/robots/blocks need review, not repeated requests.
  [ "$status" = 2 ] && exit 2
  [ "$attempt" = 3 ] && exit 1
  sleep 60
done
