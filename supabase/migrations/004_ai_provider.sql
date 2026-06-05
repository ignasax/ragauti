ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS groq_api_key text,
  ADD COLUMN IF NOT EXISTS ai_provider text NOT NULL DEFAULT 'gemini';
