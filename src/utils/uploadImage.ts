import { supabase } from '../lib/supabase'

async function compressImage(file: File, maxPx = 1200, quality = 0.82): Promise<Blob> {
  return new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(b => resolve(b!), 'image/jpeg', quality)
    }
    img.src = url
  })
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']

export async function uploadRecipeImage(file: File, userId: string): Promise<string> {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error('Only image files are allowed (JPEG, PNG, WebP, GIF)')
  }
  const compressed = await compressImage(file)
  const path = `${userId}/${Date.now()}.jpg`
  const { error } = await supabase.storage
    .from('recipe-images')
    .upload(path, compressed, { contentType: 'image/jpeg', upsert: false })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage
    .from('recipe-images')
    .getPublicUrl(path)
  return publicUrl
}
