-- Add multi-image support to recipes
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}';

-- Seed existing single image_url into the new array
UPDATE recipes
  SET image_urls = ARRAY[image_url]
  WHERE image_url IS NOT NULL AND image_url <> '';
