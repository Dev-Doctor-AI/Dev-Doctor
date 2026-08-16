#!/usr/bin/env bash

set -Eeuo pipefail

APP_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
APP_URL="http://127.0.0.1:3000/"
LM_UPSTREAM="${LM_UPSTREAM:-http://127.0.0.1:1234}"
LM_PROXY_URL="${VITE_LM_ENDPOINT:-http://127.0.0.1:1235/v1/chat/completions}"
SERVER_LOG="${APP_DIR}/vite.log"
SERVER_PID=""
PROXY_PID=""
AUTH_PID=""
SHUTTING_DOWN="false"
OPENAI_KEYCHAIN_SERVICE="${DEV_DOCTOR_OPENAI_KEYCHAIN_SERVICE:-Dev Doctor AI — OpenAI}"
GEMINI_KEYCHAIN_SERVICE="${DEV_DOCTOR_GEMINI_KEYCHAIN_SERVICE:-Dev Doctor AI — Gemini}"

stop_process_tree() {
  local parent_pid="$1"
  local child_pid

  while read -r child_pid; do
    [[ -n "${child_pid}" ]] || continue
    stop_process_tree "${child_pid}"
  done < <(pgrep -P "${parent_pid}" 2>/dev/null || true)

  kill "${parent_pid}" 2>/dev/null || true
}

cleanup() {
  if [[ -n "${SERVER_PID}" ]] && kill -0 "${SERVER_PID}" 2>/dev/null; then
    stop_process_tree "${SERVER_PID}"
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
  if [[ -n "${AUTH_PID}" ]] && kill -0 "${AUTH_PID}" 2>/dev/null; then
    stop_process_tree "${AUTH_PID}"
    wait "${AUTH_PID}" 2>/dev/null || true
  fi
  if [[ -n "${PROXY_PID}" ]] && kill -0 "${PROXY_PID}" 2>/dev/null; then
    stop_process_tree "${PROXY_PID}"
    wait "${PROXY_PID}" 2>/dev/null || true
  fi
}

shutdown() {
  [[ "${SHUTTING_DOWN}" == "true" ]] && return
  SHUTTING_DOWN="true"
  cleanup
  exit 130
}

trap cleanup EXIT
trap shutdown INT TERM

if ! command -v npm >/dev/null 2>&1; then
  printf 'Error: npm is required but was not found in PATH.\n' >&2
  exit 1
fi

if ! command -v open >/dev/null 2>&1; then
  printf 'Error: macOS open command was not found in PATH.\n' >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  printf 'Error: curl is required but was not found in PATH.\n' >&2
  exit 1
fi

cd "${APP_DIR}"

: > "${SERVER_LOG}"
: > "${APP_DIR}/proxy.log"
printf 'Starting Dev Doctor from %s\n' "${APP_DIR}"
printf 'Vite output is being written to %s\n' "${SERVER_LOG}"
printf 'LM proxy output is being written to %s\n' "${APP_DIR}/proxy.log"
printf 'Checking LM Studio at %s\n' "${LM_UPSTREAM}"

if ! curl -fsS --max-time 3 -o /dev/null "${LM_UPSTREAM%/}/v1/models"; then
  printf 'Warning: LM Studio is not reachable at %s/v1/models. The UI will still start; AI requests will be unavailable until LM Studio is running.\n' "${LM_UPSTREAM%/}" >&2
fi

# Start the CORS proxy and explicitly point the Vite client at it.
LM_UPSTREAM="${LM_UPSTREAM}" npm run start-proxy >"${APP_DIR}/proxy.log" 2>&1 &
PROXY_PID=$!

# The proxy is optional for loading the UI. Check it once, then let Vite start
# immediately so a missing LM Studio instance cannot block the application.
if curl -fsS --max-time 1 -o /dev/null "http://127.0.0.1:1235/v1/models"; then
  printf 'LM proxy is ready.\n'
else
  printf 'Warning: LM proxy is not ready. The UI will still start; AI requests will be unavailable until LM Studio is running.\n' >&2
fi

# The localhost auth process also provides the macOS Keychain credential bridge.
# Disable explicitly with START_AUTH_SERVER=false when cloud credentials are not needed.
if [[ "${START_AUTH_SERVER:-true}" == "true" ]]; then
  if [[ ! -x /usr/bin/security ]]; then
    printf 'Warning: macOS Keychain command is unavailable; cloud credentials will require session-only entry.\n' >&2
  else
    if /usr/bin/security find-generic-password -s "${OPENAI_KEYCHAIN_SERVICE}" >/dev/null 2>&1; then
      printf 'OpenAI Keychain credential is available.\n'
    else
      printf 'Notice: OpenAI Keychain credential was not found under service "%s".\n' "${OPENAI_KEYCHAIN_SERVICE}" >&2
    fi
    if /usr/bin/security find-generic-password -s "${GEMINI_KEYCHAIN_SERVICE}" >/dev/null 2>&1; then
      printf 'Gemini Keychain credential is available.\n'
    else
      printf 'Notice: Gemini Keychain credential was not found under service "%s".\n' "${GEMINI_KEYCHAIN_SERVICE}" >&2
    fi
  fi

  BRIDGE_READY="false"
  if curl -fsS --max-time 1 -o /dev/null "http://127.0.0.1:1236/health"; then
    BRIDGE_READY="true"
    printf 'Reusing the existing Keychain credential bridge at http://127.0.0.1:1236.\n'
  else
    : > "${APP_DIR}/auth.log"
    DEV_DOCTOR_OPENAI_KEYCHAIN_SERVICE="${OPENAI_KEYCHAIN_SERVICE}" \
    DEV_DOCTOR_GEMINI_KEYCHAIN_SERVICE="${GEMINI_KEYCHAIN_SERVICE}" \
      npm run start-auth >"${APP_DIR}/auth.log" 2>&1 &
    AUTH_PID=$!

    for attempt in {1..20}; do
      if curl -fsS --max-time 1 -o /dev/null "http://127.0.0.1:1236/health"; then
        BRIDGE_READY="true"
        printf 'Keychain credential bridge is ready at http://127.0.0.1:1236.\n'
        break
      fi
      if ! kill -0 "${AUTH_PID}" 2>/dev/null; then
        printf 'Warning: Keychain credential bridge exited before becoming ready; continuing with LM Studio and session-only cloud keys.\n' >&2
        cat "${APP_DIR}/auth.log" >&2
        AUTH_PID=""
        break
      fi
      sleep 1
    done
  fi
  if [[ "${BRIDGE_READY}" != "true" ]] && [[ -n "${AUTH_PID}" ]]; then
    printf 'Warning: Keychain credential bridge did not become ready; continuing with LM Studio and session-only cloud keys.\n' >&2
  fi
else
  printf 'Keychain credential bridge disabled by START_AUTH_SERVER=false.\n'
fi

VITE_LM_ENDPOINT="${LM_PROXY_URL}" npm run dev -- --host 127.0.0.1 --port 3000 --strictPort >"${SERVER_LOG}" 2>&1 &
SERVER_PID=$!
 
for attempt in {1..30}; do
  if curl -fsS --max-time 1 -o /dev/null "${APP_URL}"; then
    printf 'Opening %s\n' "${APP_URL}"
    open "${APP_URL}"
    printf 'Dev Doctor is running. Switch AI providers in the header; saved OpenAI/Gemini keys load automatically when available. Press Ctrl-C to stop.\n'
    wait "${SERVER_PID}"
    exit $?
  fi

  if ! kill -0 "${SERVER_PID}" 2>/dev/null; then
    printf 'Error: Vite exited before becoming ready.\n' >&2
    cat "${SERVER_LOG}" >&2
    exit 1
  fi

  sleep 1
done
 
printf 'Error: Vite did not become ready at %s within 30 seconds.\n' "${APP_URL}" >&2
cat "${SERVER_LOG}" >&2
exit 1