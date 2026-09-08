CREATE TABLE public.match_settlements (
  settlement_id text PRIMARY KEY CHECK (length(settlement_id) BETWEEN 1 AND 256),
  match_id text NOT NULL CHECK (length(match_id) BETWEEN 1 AND 256),
  settlement_kind text NOT NULL CHECK (settlement_kind = 'PROFILE_COMPLETION'),
  mode text NOT NULL CHECK (mode IN ('FRIENDLY', 'RANKED', 'TRAINING', 'TUTORIAL')),
  profile_ids jsonb NOT NULL CHECK (jsonb_typeof(profile_ids) = 'array'),
  settled_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, settlement_kind)
);

CREATE INDEX match_settlements_profile_ids_gin_idx
  ON public.match_settlements USING gin (profile_ids);
