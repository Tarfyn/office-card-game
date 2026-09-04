#!/usr/bin/env bash
set -Eeuo pipefail
umask 0022

REPO="${OCG_DEPLOY_REPO:-/opt/office-card-game/repo}"
RELEASES="${OCG_RELEASES_DIR:-/srv/office-card-game/releases}"
CURRENT="${OCG_CURRENT_LINK:-/srv/office-card-game/current}"
RELEASE_HELPER="${OCG_RELEASE_HELPER:-/usr/local/sbin/ocg-release-helper}"
DB_HELPER="/usr/local/sbin/ocg-db-helper"
SERVICE="${OCG_SERVICE:-office-card-game.service}"
PUBLIC_URL="${PUBLIC_URL:-https://office-card-game-185-94-29-30.nip.io}"
LOCK_FILE="${OCG_DEPLOY_LOCK:-/tmp/office-card-game-deploy.lock}"
NPM_CI_TIMEOUT_SECONDS="${NPM_CI_TIMEOUT_SECONDS:-600}"
BUILD_TIMEOUT_SECONDS="${BUILD_TIMEOUT_SECONDS:-300}"
TEST_TIMEOUT_SECONDS="${TEST_TIMEOUT_SECONDS:-900}"
REGISTRY_TIMEOUT_SECONDS="${REGISTRY_TIMEOUT_SECONDS:-30}"
MIN_FREE_KB="${MIN_FREE_KB:-1048576}"
CUTOVER_MARKER_REL="deploy/postgres-persistence-ready"
CUTOVER_MARKER_VALUE="OFFICE_CARD_GAME_POSTGRES_PERSISTENCE_READY=1"
MIGRATION_RUNNER_REL="scripts/db-migrate.mjs"

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
CUTOVER_MARKER=""
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
  if ! PREVIOUS="$(sudo -n "$RELEASE_HELPER" current)"; then
    die "release helper failed to report the active release"
  fi
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
  CUTOVER_MARKER="$RELEASE_DIR/$CUTOVER_MARKER_REL"
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
  if [[ "$CHECK_ONLY" -eq 1 ]]; then
    log "4" "preflight passed: node=$(node --version) npm=$(npm --version) free=${available}KB registry=$registry"
  fi
  return 0
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
  STAGE="8 production dependencies"
  run_timed "$NPM_CI_TIMEOUT_SECONDS" npm ci --omit=dev --no-audit --no-fund --foreground-scripts \
    --fetch-retries=2 --fetch-retry-factor=2 --fetch-retry-mintimeout=1000 \
    --fetch-retry-maxtimeout=10000 --fetch-timeout=30000
  run_timed 30 node --input-type=module -e "await import('argon2'); await import('pg');"
}

validate_cutover_marker() {
  [[ -f "$CUTOVER_MARKER" && ! -L "$CUTOVER_MARKER" ]] || die "PostgreSQL cutover marker must be a regular non-symlink file"
  local expected_size marker_value
  expected_size=$((${#CUTOVER_MARKER_VALUE} + 1))
  [[ "$(stat -c '%s' "$CUTOVER_MARKER")" == "$expected_size" ]] || die "PostgreSQL cutover marker has an invalid size"
  IFS= read -r marker_value < "$CUTOVER_MARKER" || die "PostgreSQL cutover marker must end with one newline"
  [[ "$marker_value" == "$CUTOVER_MARKER_VALUE" ]] || die "PostgreSQL cutover marker content is invalid"
}

normalize_postgres_release_modes() {
  local runner="$RELEASE_DIR/$MIGRATION_RUNNER_REL"
  local marker="$RELEASE_DIR/$CUTOVER_MARKER_REL"
  local runner_mode marker_mode

  if [[ ! -e "$marker" && ! -L "$marker" ]]; then
    return 0
  fi

  [[ -d "$RELEASE_DIR/scripts" && ! -L "$RELEASE_DIR/scripts" ]] || die "prepared release scripts path must be a regular directory"
  [[ -d "$RELEASE_DIR/deploy" && ! -L "$RELEASE_DIR/deploy" ]] || die "prepared release deploy path must be a regular directory"
  [[ -f "$runner" && ! -L "$runner" ]] || die "prepared release is missing a regular non-symlink migration runner"
  [[ -f "$marker" && ! -L "$marker" ]] || die "prepared release cutover marker must be a regular non-symlink file"
  [[ "$(readlink -f -- "$runner")" == "$runner" ]] || die "prepared release migration runner escaped its fixed path"
  [[ "$(readlink -f -- "$marker")" == "$marker" ]] || die "prepared release cutover marker escaped its fixed path"

  validate_cutover_marker
  chmod 0644 -- "$runner" "$marker"
  runner_mode="$(stat -c '%a' "$runner")"
  marker_mode="$(stat -c '%a' "$marker")"
  [[ "$runner_mode" == "644" && "$marker_mode" == "644" ]] || die "could not normalize PostgreSQL release security modes"
  log "9" "normalized PostgreSQL release contract files to mode 0644"
}

prepare_release() {
  STAGE="9 prepare release"
  sudo -n "$RELEASE_HELPER" prepare "$RELEASE_NAME"
  PREPARED=1
  tar --exclude="./.git" --exclude="./runtime" --exclude="./reports" -cf - . | tar -xf - -C "$RELEASE_DIR"
  [[ -f "$RELEASE_DIR/package.json" && -f "$RELEASE_DIR/server/server.mjs" ]] || die "prepared release is missing runtime files"
  [[ -f "$RELEASE_DIR/node_modules/argon2/package.json" && -f "$RELEASE_DIR/node_modules/pg/package.json" ]] || die "prepared release is missing required production dependencies"
  normalize_postgres_release_modes
  sudo -n "$RELEASE_HELPER" finalize "$RELEASE_NAME"
  local owner
  owner="$(stat -c '%U:%G' "$RELEASE_DIR")"
  [[ "$owner" == "officecardgame:officecardgame" ]] || die "unexpected release ownership: $owner"
  log "9" "prepared immutable release: $RELEASE_DIR owner=$owner"
}

migrate_if_required() {
  STAGE="10 database migration gate"
  if [[ -e "$CUTOVER_MARKER" || -L "$CUTOVER_MARKER" ]]; then
    validate_cutover_marker
    sudo -n "$DB_HELPER" migrate "$RELEASE_NAME" || die "PostgreSQL migration failed; release activation is blocked"
    log "10" "PostgreSQL migrations completed for $RELEASE_NAME"
  else
    log "10" "no PostgreSQL cutover marker; migration gate skipped"
  fi
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
  local pid
  pid="$(systemctl show -p MainPID --value "$SERVICE")"
  [[ "$pid" =~ ^[0-9]+$ && "$pid" -gt 0 ]] || return 1
}

verify_live() {
  STAGE="12 readiness and health"
  local i
  for i in $(seq 1 30); do
    if check_endpoint /api/ready "$VERSION" ready && check_endpoint /api/health "$VERSION" health && service_is_current; then
      log "12" "READY and HEALTHY version=$VERSION service=$SERVICE path=$(readlink -f "$CURRENT")"
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
  STAGE="13 smoke"
  curl -fsS --max-time 15 "$PUBLIC_URL/" >/dev/null || return 1
  curl -fsS --max-time 15 "$PUBLIC_URL/app.js" >/dev/null || return 1
  log "13" "root and application shell smoke passed"
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
  migrate_if_required
  STAGE="11 atomic cutover"
  sudo -n "$RELEASE_HELPER" activate "$RELEASE_NAME" || abort_after_cutover "release activation failed"
  ACTIVATED=1
  log "11" "activated $RELEASE_DIR"
  verify_live || abort_after_cutover "bounded ready/health/service verification failed"
  smoke || abort_after_cutover "production smoke failed"
  STAGE="14 complete"
  log "14" "deployment successful target=$TARGET release=$RELEASE_NAME previous=$PREVIOUS_RELEASE"
}

main "$@"
