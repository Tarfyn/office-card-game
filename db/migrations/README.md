# Database migrations

The PostgreSQL migration runner reads only `NNNN_lowercase_name.sql` files from this directory.
Numeric prefixes must be unique and migrations run in lexical order. The runner owns transaction
boundaries, so migration files must not contain `BEGIN`, `COMMIT`, `ROLLBACK`, or psql meta-commands.

Migrations are forward-only, additive, and recorded with a SHA-256 checksum in
`public.schema_migrations`. Never edit a migration after it has reached a deployed release. Add a
new migration instead.

The release candidate includes the additive Account/profile foundation migration and the exact
`deploy/postgres-persistence-ready` capability marker after successful real PostgreSQL QA. The
marker does not perform a migration or activate PostgreSQL; the production gates and explicit
cutover procedure remain defined in `docs/database-operations.md`.
