CREATE TABLE public.users (
  id uuid PRIMARY KEY,
  email text NOT NULL CHECK (length(email) BETWEEN 3 AND 254),
  email_normalized text NOT NULL CHECK (length(email_normalized) BETWEEN 3 AND 254),
  password_hash text NOT NULL CHECK (length(password_hash) BETWEEN 32 AND 1024),
  password_algorithm text NOT NULL DEFAULT 'ARGON2ID' CHECK (password_algorithm IN ('ARGON2ID')),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISABLED')),
  role text NOT NULL DEFAULT 'PLAYER' CHECK (role IN ('PLAYER', 'OPS', 'ADMIN')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email_normalized)
);

CREATE TABLE public.sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz NULL,
  UNIQUE (token_hash),
  CHECK (expires_at > created_at)
);
CREATE INDEX sessions_active_token_idx ON public.sessions(token_hash, expires_at) WHERE revoked_at IS NULL;
CREATE INDEX sessions_expiry_idx ON public.sessions(expires_at) WHERE revoked_at IS NULL;
CREATE INDEX sessions_user_idx ON public.sessions(user_id) WHERE revoked_at IS NULL;

CREATE TABLE public.player_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  profile_data jsonb NOT NULL CHECK (jsonb_typeof(profile_data) = 'object'),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.player_decks (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  deck_id text NOT NULL CHECK (length(deck_id) BETWEEN 1 AND 128),
  deck_data jsonb NOT NULL CHECK (jsonb_typeof(deck_data) = 'object'),
  revision integer NOT NULL CHECK (revision > 0),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (user_id, deck_id)
);

CREATE TABLE public.reward_grants (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  source_ref text NOT NULL CHECK (length(source_ref) BETWEEN 1 AND 256),
  grant_data jsonb NOT NULL CHECK (jsonb_typeof(grant_data) = 'object'),
  granted_at timestamptz NOT NULL,
  PRIMARY KEY (user_id, source_ref)
);

CREATE TABLE public.achievement_progress (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  achievement_id text NOT NULL CHECK (length(achievement_id) BETWEEN 1 AND 128),
  progress_data jsonb NOT NULL CHECK (jsonb_typeof(progress_data) = 'object'),
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (user_id, achievement_id)
);

CREATE TABLE public.persistence_metadata (
  key text PRIMARY KEY CHECK (length(key) BETWEEN 1 AND 80),
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.persistence_metadata(key, value)
VALUES ('alpha_reset', '{"legacyPlayerProgressMigrated":false,"accountProfilesStartFresh":true}'::jsonb)
ON CONFLICT (key) DO NOTHING;
