# Runtime and export version ownership

The application release version is the `version` field in `package.json`; release automation and
health/readiness checks must derive runtime identity from the packaged application metadata. Schema,
content, and analytics export versions are independent compatibility identifiers.

The playtest analytics JSON field `version: "4.6.0"` is an export schema/version marker retained for
consumer compatibility. It does not describe the deployed application release. Reports may add an
explicit application version alongside it when a consumer needs both values; never rewrite the
export schema value to a `7.69.x` release number.

Operational reports use explicit status values (`PASS`, `BLOCKED`, `UNAVAILABLE`, or `DEGRADED`) and
must state the actually executed browser viewports, direct database availability, and installed
deployment-wrapper parity. Historical handovers remain historical records.
