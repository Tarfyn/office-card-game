# Database migrations

The PostgreSQL migration runner reads only `NNNN_lowercase_name.sql` files from this directory.
Numeric prefixes must be unique and migrations run in lexical order. The runner owns transaction
boundaries, so migration files must not contain `BEGIN`, `COMMIT`, `ROLLBACK`, or psql meta-commands.

Migrations are forward-only, additive, and recorded with a SHA-256 checksum in
`public.schema_migrations`. Never edit a migration after it has reached a deployed release. Add a
new migration instead.

The application candidate includes the additive Account/profile foundation migration. It still
intentionally omits `deploy/postgres-persistence-ready`: that marker is a separate release/cutover
gate and may be added only after explicit approval and the production checks described in
`docs/database-operations.md`.
