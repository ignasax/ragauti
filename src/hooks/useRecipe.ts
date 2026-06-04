import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Recipe } from '../types/app'

export function useRecipe(id: string) {
  return useQuery({
    queryKey: ['recipe', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes').select('*').eq('id', id).single()
      if (error) throw error
      return data as Recipe
    },
    enabled: !!id,
  })
}
