#!/usr/bin/bash
set -euo pipefail

IFS=$'\n\t'
PATH=/usr/sbin:/usr/bin:/sbin:/bin
export PATH
umask 077

readonly INSTALLER_PATH="${BASH_SOURCE[0]}"
readonly SOURCE_DIR="$(cd "$(dirname "${INSTALLER_PATH}")" && pwd -P)"
readonly HELPER_SOURCE="${SOURCE_DIR}/ocg-db-helper"
readonly SUDOERS_SOURCE="${SOURCE_DIR}/office-card-game-db.sudoers"
readonly SERVICE_SOURCE="${SOURCE_DIR}/office-card-game-db-backup.service"
readonly TIMER_SOURCE="${SOURCE_DIR}/office-card-game-db-backup.timer"
readonly HELPER_TARGET="/usr/local/sbin/ocg-db-helper"
readonly SUDOERS_TARGET="/etc/sudoers.d/office-card-game-db"
readonly SERVICE_TARGET="/etc/systemd/system/office-card-game-db-backup.service"
readonly TIMER_TARGET="/etc/systemd/system/office-card-game-db-backup.timer"
readonly EXPECTED_RELEASE_RULE="(root) NOPASSWD: /usr/local/sbin/ocg-release-helper"
readonly EXPECTED_DB_RULE="(root) NOPASSWD: /usr/local/sbin/ocg-db-helper"

die() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

[[ $# -eq 0 ]] || die "This installer accepts no arguments."
[[ ${EUID} -eq 0 ]] || die "Run this one-time installer as root after reviewing every source artifact."

nopasswd_rules_for_ocgadmin() {
  /usr/sbin/runuser --user=ocgadmin -- /usr/bin/env COLUMNS=4096 /usr/bin/sudo -n -l 2>/dev/null |
    /usr/bin/awk '/NOPASSWD:/ { sub(/^[[:space:]]*/, ""); print }' |
    /usr/bin/sort
}

for source_file in "${HELPER_SOURCE}" "${SUDOERS_SOURCE}" "${SERVICE_SOURCE}" "${TIMER_SOURCE}"; do
  [[ -f ${source_file} && ! -L ${source_file} ]] || die "Missing or unsafe source file: ${source_file}"
done

/usr/bin/bash -n "${HELPER_SOURCE}"
/usr/bin/bash -n "${INSTALLER_PATH}"
/usr/sbin/visudo -cf "${SUDOERS_SOURCE}"
/usr/bin/systemd-analyze verify "${SERVICE_SOURCE}" "${TIMER_SOURCE}"

expected_release_only="${EXPECTED_RELEASE_RULE}"
expected_with_db=$(printf '%s\n%s\n' "${EXPECTED_DB_RULE}" "${EXPECTED_RELEASE_RULE}" | /usr/bin/sort)
existing_nopasswd=$(nopasswd_rules_for_ocgadmin)
if [[ ${existing_nopasswd} != "${expected_release_only}" && ${existing_nopasswd} != "${expected_with_db}" ]]; then
  die "ocgadmin has an unexpected pre-existing NOPASSWD rule; review the complete sudoers policy before installation."
fi

/usr/bin/install --owner=root --group=root --mode=0755 "${HELPER_SOURCE}" "${HELPER_TARGET}"
/usr/bin/install --owner=root --group=root --mode=0644 "${SERVICE_SOURCE}" "${SERVICE_TARGET}"
/usr/bin/install --owner=root --group=root --mode=0644 "${TIMER_SOURCE}" "${TIMER_TARGET}"
/usr/bin/install --owner=root --group=root --mode=0440 "${SUDOERS_SOURCE}" "${SUDOERS_TARGET}"
/usr/sbin/visudo -cf "${SUDOERS_TARGET}"
/usr/bin/systemctl daemon-reload

[[ $(/usr/bin/stat --format='%U:%G:%a' "${HELPER_TARGET}") == "root:root:755" ]] || die "Installed helper metadata is unsafe."
[[ $(/usr/bin/stat --format='%U:%G:%a' "${SUDOERS_TARGET}") == "root:root:440" ]] || die "Installed sudoers metadata is unsafe."

nopasswd_rules=$(nopasswd_rules_for_ocgadmin)
[[ ${nopasswd_rules} == "${expected_with_db}" ]] ||
  die "ocgadmin has an unexpected NOPASSWD rule; review the complete sudoers policy."
if /usr/sbin/runuser --user=ocgadmin -- /usr/bin/sudo -n /usr/bin/true >/dev/null 2>&1; then
  die "ocgadmin can run a general-purpose command through sudo -n; refusing installation validation."
fi
/usr/sbin/runuser --user=ocgadmin -- /usr/bin/sudo -n "${HELPER_TARGET}" audit

printf 'Installed %s as root:root 0755.\n' "${HELPER_TARGET}"
printf 'Installed exact sudoers rule at %s as root:root 0440.\n' "${SUDOERS_TARGET}"
printf 'Installed backup unit candidates but did not enable them. Run ocg-db-helper bootstrap when approved.\n'
