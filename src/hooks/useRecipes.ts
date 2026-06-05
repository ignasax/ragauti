import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Recipe } from '../types/app'

export function useRecipes() {
  return useQuery({
    queryKey: ['recipes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('title', { ascending: true })
      if (error) throw error
      return data as Recipe[]
    },
  })
}

export function useAddRecipe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (recipe: Omit<Recipe, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data, error } = await supabase.from('recipes').insert({ ...recipe, user_id: user.id }).select().single()
      if (error) throw error
      return data as Recipe
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recipes'] }),
  })
}

export function useUpdateRecipe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Recipe> & { id: string }) => {
      const { data, error } = await supabase
        .from('recipes').update(updates).eq('id', id).select().single()
      if (error) throw error
      return data as Recipe
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['recipes'] })
      qc.invalidateQueries({ queryKey: ['recipe', data.id] })
    },
  })
}

export function useDeleteRecipe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recipes').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recipes'] }),
  })
}

export function useToggleFavourite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, is_favourite }: { id: string; is_favourite: boolean }) => {
      const { error } = await supabase
        .from('recipes').update({ is_favourite }).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, is_favourite }) => {
      await qc.cancelQueries({ queryKey: ['recipes'] })
      await qc.cancelQueries({ queryKey: ['recipe', id] })
      const previousList = qc.getQueryData<Recipe[]>(['recipes'])
      const previousDetail = qc.getQueryData<Recipe>(['recipe', id])
      qc.setQueryData<Recipe[]>(['recipes'], old =>
        old?.map(r => r.id === id ? { ...r, is_favourite } : r) ?? []
      )
      qc.setQueryData<Recipe>(['recipe', id], old =>
        old ? { ...old, is_favourite } : old
      )
      return { previousList, previousDetail, id }
    },
    onError: (_err, { id }, ctx) => {
      if (ctx?.previousList) qc.setQueryData(['recipes'], ctx.previousList)
      if (ctx?.previousDetail) qc.setQueryData(['recipe', id], ctx.previousDetail)
    },
    onSettled: (_data, _err, { id }) => {
      qc.invalidateQueries({ queryKey: ['recipes'] })
      qc.invalidateQueries({ queryKey: ['recipe', id] })
    },
  })
}
