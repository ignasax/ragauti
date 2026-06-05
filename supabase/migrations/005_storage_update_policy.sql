-- Add missing UPDATE RLS policy for recipe-images storage bucket
CREATE POLICY "recipe_images_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'recipe-images'
  AND (storage.foldername(name))[1] = (auth.uid())::text
)
WITH CHECK (
  bucket_id = 'recipe-images'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);
