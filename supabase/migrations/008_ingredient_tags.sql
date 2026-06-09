-- Add ingredient_tags column to recipes table for multi-language ingredient search support.
-- Stores normalized English ingredient names as a text array.
ALTER TABLE recipes ADD COLUMN ingredient_tags text[] NOT NULL DEFAULT '{}';
