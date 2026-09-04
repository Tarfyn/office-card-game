# Database migrations

The PostgreSQL migration runner reads only `NNNN_lowercase_name.sql` files from this directory.
Numeric prefixes must be unique and migrations run in lexical order. The runner owns transaction
boundaries, so migration files must not contain `BEGIN`, `COMMIT`, `ROLLBACK`, or psql meta-commands.

Migrations are forward-only, additive, and recorded with a SHA-256 checksum in
`public.schema_migrations`. Never edit a migration after it has reached a deployed release. Add a
new migration instead.

This ops-foundation change intentionally contains no production schema migration and does not add
`deploy/postgres-persistence-ready`. The first application release that genuinely supports the
PostgreSQL profile/account store must add at least one migration and the readiness marker described
in `docs/database-operations.md`.
