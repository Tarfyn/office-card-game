#!/usr/bin/env bash
set -Eeuo pipefail

REPO="${OCG_DEPLOY_REPO:-/opt/office-card-game/repo}"
RELEASES="${OCG_RELEASES_DIR:-/srv/office-card-game/releases}"
CURRENT="${OCG_CURRENT_LINK:-/srv/office-card-game/current}"
RELEASE_HELPER="${OCG_RELEASE_HELPER:-/usr/local/sbin/ocg-release-helper}"
SERVICE="${OCG_SERVICE:-office-card-game.service}"
PUBLIC_URL="${PUBLIC_URL:-https://office-card-game-185-94-29-30.nip.io}"
LOCK_FILE="${OCG_DEPLOY_LOCK:-/tmp/office-card-game-deploy.lock}"
NPM_CI_TIMEOUT_SECONDS="${NPM_CI_TIMEOUT_SECONDS:-600}"
BUILD_TIMEOUT_SECONDS="${BUILD_TIMEOUT_SECONDS:-300}"
TEST_TIMEOUT_SECONDS="${TEST_TIMEOUT_SECONDS:-900}"
REGISTRY_TIMEOUT_SECONDS="${REGISTRY_TIMEOUT_SECONDS:-30}"
MIN_FREE_KB="${MIN_FREE_KB:-1048576}"

TARGET=""
CHECK_ONLY=0
STAGE="bootstrap"
PREPARED=0
ACTIVATED=0
ROLLBACK_ATTEMPTED=0
PREVIOUS=""
PREVIOUS_RELEASE=""
PREVIOUS_VERSION=""
RELEASE_NAME=""
RELEASE_DIR=""
VERSION=""

log() { printf '[%s] %s\n' "$1" "$2"; }
die() { log "FAIL" "stage=$STAGE target=${TARGET:-none} $1"; exit 1; }

cleanup_incomplete_release() {
  local status=$?
  if [[ "$status" -ne 0 && "$PREPARED" -eq 1 && "$ACTIVATED" -eq 0 ]]; then
    log "CLEANUP" "discarding incomplete release $RELEASE_NAME"
    if ! sudo -n "$RELEASE_HELPER" discard "$RELEASE_NAME"; then
      log "FAIL" "stage=cleanup target=$TARGET could not discard $RELEASE_NAME"
      status=1
    fi
  fi
  trap - EXIT
  exit "$status"
}
trap cleanup_incomplete_release EXIT

run_timed() {
  local seconds="$1"
  shift
  timeout --foreground --signal=TERM --kill-after=15s "${seconds}s" "$@"
}

parse_target() {
  if [[ "${1:-}" == "--check" ]]; then
    CHECK_ONLY=1
    TARGET="${2:-}"
  else
    TARGET="${1:-}"
  fi
  [[ -n "$TARGET" ]] || die "an explicit tag or full commit is required (usage: deploy.sh [--check] <tag|commit>)"
  if [[ ! "$TARGET" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ && ! "$TARGET" =~ ^[0-9a-fA-F]{40}$ ]]; then
    die "refusing non-release target '$TARGET'"
  fi
}

validate_target() {
  STAGE="1 validate release"
  cd "$REPO"
  git fetch --tags origin
  local target_commit
  if [[ "$TARGET" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    git show-ref --verify --quiet "refs/tags/$TARGET" || die "tag does not exist: $TARGET"
    target_commit="$(git rev-list -n 1 "$TARGET^{commit}")"
  else
    git cat-file -e "$TARGET^{commit}" || die "commit does not exist: $TARGET"
    target_commit="$(git rev-parse "$TARGET^{commit}")"
  fi
  git checkout --detach "$TARGET"
  git reset --hard "$TARGET"
  local checked_out
  checked_out="$(git rev-parse HEAD)"
  [[ "$checked_out" == "$target_commit" ]] || die "checked out commit does not match requested target"
  log "1" "validated target=$TARGET commit=$checked_out"
}

acquire_lock() {
  STAGE="2 acquire deploy lock"
  mkdir -p "$(dirname "$LOCK_FILE")"
  exec 9>"$LOCK_FILE"
  flock -n 9 || die "another deployment is active (lock=$LOCK_FILE)"
  log "2" "lock acquired: $LOCK_FILE"
}

read_active_release() {
  local active_link_target
  PREVIOUS="$(sudo -n "$RELEASE_HELPER" current || true)"
  [[ -n "$PREVIOUS" ]] || die "no active release reported by release helper"
  active_link_target="$(readlink -f "$CURRENT")"
  [[ "$PREVIOUS" == "$active_link_target" ]] || die "release helper current path differs from configured current link: helper=$PREVIOUS link=$active_link_target"
  PREVIOUS_RELEASE="$(basename "$PREVIOUS")"
  sudo -n "$RELEASE_HELPER" exists "$PREVIOUS_RELEASE" >/dev/null || die "active release is not helper-validated: $PREVIOUS_RELEASE"
  PREVIOUS_VERSION="$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).version)' "$PREVIOUS/package.json")"
  log "3" "active release protected: $PREVIOUS_RELEASE version=$PREVIOUS_VERSION"
}

validate_project() {
  local lock_version server_source
  [[ -f package.json && -f package-lock.json && -f server/server.mjs ]] || die "required release files are missing"
  VERSION="$(node -e 'console.log(JSON.parse(require("fs").readFileSync("package.json","utf8")).version)')"
  lock_version="$(node -e 'const p=require("./package-lock.json"); console.log(`${p.version}|${p.packages[""].version}`)')"
  [[ "$lock_version" == "$VERSION|$VERSION" ]] || die "package.json/package-lock.json versions disagree"
  server_source="$(cat server/server.mjs)"
  grep -Fq "version: \"$VERSION\"" <<< "$server_source" || die "server version marker does not match package version"
  grep -Fq "version:\"$VERSION\"" <<< "$server_source" || die "compact server version marker does not match package version"
  RELEASE_NAME="v${VERSION}-$(git rev-parse --short=8 HEAD)"
  RELEASE_DIR="$RELEASES/$RELEASE_NAME"
  if [[ "$CHECK_ONLY" -eq 0 && "$RELEASE_DIR" == "$PREVIOUS" ]]; then
    die "requested release is already active"
  fi
  if [[ "$CHECK_ONLY" -eq 0 && -e "$RELEASE_DIR" ]]; then
    die "refusing to reuse existing target release directory: $RELEASE_DIR"
  fi
  if [[ "$CHECK_ONLY" -eq 0 ]] && sudo -n "$RELEASE_HELPER" exists "$RELEASE_NAME" >/dev/null 2>&1; then
    die "refusing to overwrite existing immutable release: $RELEASE_NAME"
  fi
  log "3" "version surfaces agree: $VERSION; release=$RELEASE_NAME"
}

preflight() {
  STAGE="4 preflight"
  local available registry
  available="$(df --output=avail "$RELEASES" | tail -n 1 | tr -d ' ')"
  [[ "$available" =~ ^[0-9]+$ && "$available" -ge "$MIN_FREE_KB" ]] || die "insufficient free disk: ${available:-unknown}KB < ${MIN_FREE_KB}KB"
  registry="$(npm config get registry)"
  [[ "$registry" == http://* || "$registry" == https://* ]] || die "invalid npm registry configuration"
  run_timed "$REGISTRY_TIMEOUT_SECONDS" npm ping --registry="$registry" --fetch-retries=0 --fetch-timeout=10000 || die "npm registry preflight failed"
  command -v flock >/dev/null || die "flock is required"
  command -v timeout >/dev/null || die "timeout is required"
  systemctl is-enabled "$SERVICE" >/dev/null 2>&1 || die "service manager cannot see $SERVICE"
  [[ "$CHECK_ONLY" -eq 1 ]] && log "4" "preflight passed: node=$(node --version) npm=$(npm --version) free=${available}KB registry=$registry"
}

install_build_test() {
  STAGE="5 install dependencies"
  git clean -fdx
  log "5" "npm ci --no-audit with ${NPM_CI_TIMEOUT_SECONDS}s timeout"
  run_timed "$NPM_CI_TIMEOUT_SECONDS" npm ci --no-audit --no-fund --foreground-scripts \
    --fetch-retries=2 --fetch-retry-factor=2 --fetch-retry-mintimeout=1000 \
    --fetch-retry-maxtimeout=10000 --fetch-timeout=30000
  STAGE="6 build"
  run_timed "$BUILD_TIMEOUT_SECONDS" npm run build
  STAGE="7 test"
  run_timed "$TEST_TIMEOUT_SECONDS" npm test
}

prepare_release() {
  STAGE="8 prepare release"
  sudo -n "$RELEASE_HELPER" prepare "$RELEASE_NAME"
  PREPARED=1
  tar --exclude="./.git" --exclude="./node_modules" --exclude="./runtime" --exclude="./reports" -cf - . | tar -xf - -C "$RELEASE_DIR"
  sudo -n "$RELEASE_HELPER" finalize "$RELEASE_NAME"
  [[ -f "$RELEASE_DIR/package.json" && -f "$RELEASE_DIR/server/server.mjs" ]] || die "prepared release is missing runtime files"
  local owner
  owner="$(stat -c '%U:%G' "$RELEASE_DIR")"
  [[ "$owner" == "officecardgame:officecardgame" ]] || die "unexpected release ownership: $owner"
  log "8" "prepared immutable release: $RELEASE_DIR owner=$owner"
}

check_endpoint() {
  local path="$1" expected="$2" kind="$3" body
  body="$(curl -fsS --max-time 15 "$PUBLIC_URL$path")" || return 1
  printf '%s' "$body" | python3 -c 'import json,sys
kind,expected=sys.argv[1:]
d=json.load(sys.stdin)
if d.get("version") != expected or d.get("ok") is not True:
    raise SystemExit(1)
if kind == "ready" and d.get("status") != "READY":
    raise SystemExit(1)
if kind == "health" and d.get("ranked",{}).get("timerActive") is not False:
    raise SystemExit(1)
' "$kind" "$expected"
}

service_is_current() {
  systemctl is-active --quiet "$SERVICE" || return 1
  local pid cwd
  pid="$(systemctl show -p MainPID --value "$SERVICE")"
  [[ "$pid" =~ ^[0-9]+$ && "$pid" -gt 0 ]] || return 1
  cwd="$(readlink -f "/proc/$pid/cwd")"
  [[ "$cwd" == "$CURRENT" ]]
}

verify_live() {
  STAGE="11 readiness and health"
  local i
  for i in $(seq 1 30); do
    if check_endpoint /api/ready "$VERSION" ready && check_endpoint /api/health "$VERSION" health && service_is_current; then
      log "11" "READY and HEALTHY version=$VERSION service=$SERVICE path=$(readlink -f "$CURRENT")"
      return 0
    fi
    sleep 1
  done
  return 1
}

rollback_once() {
  [[ "$ROLLBACK_ATTEMPTED" -eq 0 ]] || return 1
  ROLLBACK_ATTEMPTED=1
  log "ROLLBACK" "activating previous release once: $PREVIOUS_RELEASE"
  sudo -n "$RELEASE_HELPER" activate "$PREVIOUS_RELEASE" || return 1
  local i
  for i in $(seq 1 20); do
    if check_endpoint /api/ready "$PREVIOUS_VERSION" ready && check_endpoint /api/health "$PREVIOUS_VERSION" health && service_is_current; then
      log "ROLLBACK" "previous release healthy: $PREVIOUS_RELEASE"
      return 0
    fi
    sleep 1
  done
  log "FAIL" "rollback did not restore a healthy previous release"
  return 1
}

abort_after_cutover() {
  local reason="$1"
  log "FAIL" "stage=$STAGE target=$TARGET cutover failed: $reason"
  rollback_once || log "FAIL" "rollback failed or was already attempted"
  exit 1
}

smoke() {
  STAGE="12 smoke"
  curl -fsS --max-time 15 "$PUBLIC_URL/" >/dev/null || return 1
  curl -fsS --max-time 15 "$PUBLIC_URL/app.js" >/dev/null || return 1
  log "12" "root and application shell smoke passed"
}

main() {
  parse_target "$@"
  validate_target
  acquire_lock
  read_active_release
  validate_project
  preflight
  if [[ "$CHECK_ONLY" -eq 1 ]]; then
    log "13" "preflight check complete; production unchanged"
    return 0
  fi
  install_build_test
  prepare_release
  STAGE="9 atomic cutover"
  sudo -n "$RELEASE_HELPER" activate "$RELEASE_NAME" || abort_after_cutover "release activation failed"
  ACTIVATED=1
  log "9" "activated $RELEASE_DIR"
  verify_live || abort_after_cutover "bounded ready/health/service verification failed"
  smoke || abort_after_cutover "production smoke failed"
  STAGE="13 complete"
  log "13" "deployment successful target=$TARGET release=$RELEASE_NAME previous=$PREVIOUS_RELEASE"
}

main "$@"
