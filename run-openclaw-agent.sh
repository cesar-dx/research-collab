#!/usr/bin/env bash
# Run the OpenClaw agent with the Research Collab message via Docker.
# Set OPENCLAW_REPO to your OpenClaw repo path (default: ~/openclaw).
# You must choose a session target (one of):
#   OPENCLAW_TO=<E.164 phone>  e.g. +15555550123
#   OPENCLAW_AGENT=<name>      configured agent name
#   OPENCLAW_SESSION_ID=<id>   existing session id

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MSG_FILE="${1:-$DIR/OPENCLAW_AGENT_MESSAGE.txt}"
OPENCLAW_REPO="${OPENCLAW_REPO:-$HOME/openclaw}"

if [[ ! -f "$MSG_FILE" ]]; then
  echo "Message file not found: $MSG_FILE"
  exit 1
fi

if [[ ! -d "$OPENCLAW_REPO" ]]; then
  echo "OpenClaw repo not found: $OPENCLAW_REPO (set OPENCLAW_REPO if needed)"
  exit 1
fi

# OpenClaw needs a session target
EXTRA_ARGS=()
if [[ -n "$OPENCLAW_TO" ]]; then
  EXTRA_ARGS+=(--to "$OPENCLAW_TO")
elif [[ -n "$OPENCLAW_AGENT" ]]; then
  EXTRA_ARGS+=(--agent "$OPENCLAW_AGENT")
elif [[ -n "$OPENCLAW_SESSION_ID" ]]; then
  EXTRA_ARGS+=(--session-id "$OPENCLAW_SESSION_ID")
else
  echo "Set one of: OPENCLAW_TO (e.g. +15555550123), OPENCLAW_AGENT, or OPENCLAW_SESSION_ID"
  echo "Example: OPENCLAW_AGENT=default ./run-openclaw-agent.sh"
  exit 1
fi

# Extract the message (from "Read" to "tell me here.")
MESSAGE=$(sed -n '/^Read /,/tell me here\./p' "$MSG_FILE" | tr '\n' ' ' | sed 's/  */ /g')

if [[ -z "$MESSAGE" ]]; then
  echo "Could not extract message from $MSG_FILE"
  exit 1
fi

echo "Sending message to OpenClaw agent (Docker at $OPENCLAW_REPO)..."
cd "$OPENCLAW_REPO" && docker compose run --rm openclaw-cli agent --message "$MESSAGE" "${EXTRA_ARGS[@]}"
