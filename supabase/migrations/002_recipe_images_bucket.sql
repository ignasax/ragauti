-- Create the recipe-images storage bucket (public reads, per-user writes)
INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-images', 'recipe-images', true)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload to their own folder (path: {user_id}/{filename})
CREATE POLICY "recipe_images_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'recipe-images'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- Public read access
CREATE POLICY "recipe_images_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'recipe-images');

-- Users can delete their own images
CREATE POLICY "recipe_images_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'recipe-images'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);
