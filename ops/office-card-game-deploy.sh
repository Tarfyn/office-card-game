#!/usr/bin/env bash
set -euo pipefail

readonly REPO="/opt/office-card-game/repo"
readonly RELEASES="/srv/office-card-game/releases"
readonly CURRENT="/srv/office-card-game/current"
readonly RELEASE_HELPER="/usr/local/sbin/ocg-release-helper"
readonly DB_HELPER="/usr/local/sbin/ocg-db-helper"
readonly PUBLIC_URL="https://office-card-game-185-94-29-30.nip.io"
readonly CUTOVER_MARKER_REL="deploy/postgres-persistence-ready"
readonly CUTOVER_MARKER_VALUE="OFFICE_CARD_GAME_POSTGRES_PERSISTENCE_READY=1"

TARGET="${1:-origin/main}"

die() {
    echo "ERROR: $*" >&2
    exit 1
}

echo "=== Office Card Game deployment ==="
echo "Target: $TARGET"

cd "$REPO"

echo
echo "=== Fetching Git ==="
git fetch --tags origin

echo
echo "=== Checking out target ==="
git checkout --detach "$TARGET"
git reset --hard "$TARGET"

COMMIT="$(git rev-parse HEAD)"
SHORT="$(git rev-parse --short=8 HEAD)"
VERSION="$(node -e "console.log(JSON.parse(require('fs').readFileSync('package.json','utf8')).version)")"

RELEASE_NAME="v${VERSION}-${SHORT}"
RELEASE_DIR="${RELEASES}/${RELEASE_NAME}"
CUTOVER_MARKER="${RELEASE_DIR}/${CUTOVER_MARKER_REL}"

RELEASE_PREPARED=0
RELEASE_ACTIVATED=0

cleanup_incomplete_release() {
    local status=$?

    if [[ "$RELEASE_PREPARED" -eq 1 && "$RELEASE_ACTIVATED" -eq 0 ]]; then
        echo
        echo "=== Cleaning up incomplete release ==="
        if ! sudo -n "$RELEASE_HELPER" discard "$RELEASE_NAME"; then
            echo "ERROR: Failed to discard incomplete release: $RELEASE_NAME" >&2
            status=1
        fi
    fi

    trap - EXIT
    exit "$status"
}

validate_cutover_marker() {
    local marker_value=""
    local marker_size=0
    local expected_size=$((${#CUTOVER_MARKER_VALUE} + 1))

    [[ -f "$CUTOVER_MARKER" && ! -L "$CUTOVER_MARKER" ]] ||
        die "PostgreSQL readiness marker is not a regular release file."
    marker_size="$(stat --format='%s' "$CUTOVER_MARKER")"
    [[ "$marker_size" -eq "$expected_size" ]] ||
        die "PostgreSQL readiness marker has invalid content."
    if ! IFS= read -r marker_value < "$CUTOVER_MARKER"; then
        die "PostgreSQL readiness marker must end with one newline."
    fi
    [[ "$marker_value" == "$CUTOVER_MARKER_VALUE" ]] ||
        die "PostgreSQL readiness marker has invalid content."
}

trap cleanup_incomplete_release EXIT

echo "Commit:  $COMMIT"
echo "Version: $VERSION"
echo "Release: $RELEASE_NAME"

if sudo -n "$RELEASE_HELPER" exists "$RELEASE_NAME"; then
    ACTIVE="$(sudo -n "$RELEASE_HELPER" current || true)"

    if [[ "$ACTIVE" == "$RELEASE_DIR" ]]; then
        echo
        echo "Release is already active: $RELEASE_DIR"
        exit 0
    fi

    echo
    echo "Release already exists: $RELEASE_DIR"
    echo "Refusing to overwrite an immutable release."
    exit 1
fi

echo
echo "=== Cleaning workspace ==="
git clean -fdx

echo
echo "=== Installing dependencies ==="
npm ci

echo
echo "=== Building ==="
npm run build

echo
echo "=== Running tests ==="
npm test

echo
echo "=== Installing production runtime dependencies ==="
npm ci --omit=dev
node --input-type=module -e "await import('argon2'); await import('pg');"

PREVIOUS="$(sudo -n "$RELEASE_HELPER" current || true)"
PREVIOUS_RELEASE=""
if [[ -n "$PREVIOUS" ]]; then
    PREVIOUS_RELEASE="$(basename "$PREVIOUS")"
    if ! sudo -n "$RELEASE_HELPER" exists "$PREVIOUS_RELEASE"; then
        die "Current release is not a validated helper release: $PREVIOUS"
    fi
fi

echo
echo "=== Creating release ==="
sudo -n "$RELEASE_HELPER" prepare "$RELEASE_NAME"
RELEASE_PREPARED=1

# prepare temporarily gives the new directory to ocgadmin, so extraction stays unprivileged.
# Production runtime dependencies are intentionally included; the server and migration runner
# require argon2 and pg after the source checkout has been finalized into an isolated release.
tar \
  --exclude="./.git" \
  --exclude="./runtime" \
  --exclude="./reports" \
  -cf - . | tar -xf - -C "$RELEASE_DIR"

[[ -f "$RELEASE_DIR/node_modules/argon2/package.json" ]] ||
    die "Prepared release is missing the Argon2 runtime dependency."
[[ -f "$RELEASE_DIR/node_modules/pg/package.json" ]] ||
    die "Prepared release is missing the PostgreSQL runtime dependency."

sudo -n "$RELEASE_HELPER" finalize "$RELEASE_NAME"

echo
echo "Previous: ${PREVIOUS:-none}"
echo "New:      $RELEASE_DIR"

if [[ -e "$CUTOVER_MARKER" || -L "$CUTOVER_MARKER" ]]; then
    validate_cutover_marker
    echo
    echo "=== Applying required PostgreSQL migrations ==="
    if ! sudo -n "$DB_HELPER" migrate "$RELEASE_NAME"; then
        die "PostgreSQL migration failed; the previous release remains active."
    fi
fi

rollback() {
    if [[ -n "$PREVIOUS_RELEASE" ]]; then
        echo "Rolling back to $PREVIOUS"
        sudo -n "$RELEASE_HELPER" activate "$PREVIOUS_RELEASE"
    fi
}

echo
echo "=== Activating release ==="
if ! sudo -n "$RELEASE_HELPER" activate "$RELEASE_NAME"; then
    echo "Release activation failed."
    rollback
    exit 1
fi
RELEASE_ACTIVATED=1

echo
echo "=== Waiting for readiness ==="

READY=0

for i in $(seq 1 20); do
    if curl -fsS "${PUBLIC_URL}/api/ready" 2>/dev/null |
        python3 -c 'import json,sys; d=json.load(sys.stdin); sys.exit(0 if d.get("ok") is True and d.get("status") == "READY" else 1)' 2>/dev/null
    then
        READY=1
        break
    fi

    sleep 1
done

if [[ "$READY" -ne 1 ]]; then
    echo
    echo "Readiness check failed."
    rollback
    exit 1
fi

echo
echo "=== Deployment successful ==="
echo "Release: $RELEASE_NAME"
echo "Commit:  $COMMIT"
echo "URL:     $PUBLIC_URL"
