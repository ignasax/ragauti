import { supabase } from '../lib/supabase'

export async function uploadRecipeImage(file: File, userId: string): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${userId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from('recipe-images')
    .upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage
    .from('recipe-images')
    .getPublicUrl(path)
  return publicUrl
}
