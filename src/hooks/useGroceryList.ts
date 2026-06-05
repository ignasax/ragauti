import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { GroceryItem, MealPlanSlot } from '../types/app'

export function useGroceryList(weekStart: string) {
  return useQuery({
    queryKey: ['grocery', weekStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grocery_items')
        .select('*, recipe:recipes(id, title)')
        .eq('week_start', weekStart)
        .order('sort_order')
      if (error) throw error
      return data as GroceryItem[]
    },
  })
}

export function useGenerateGroceryList(weekStart: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      const { data: slots, error } = await supabase
        .from('meal_plan_slots')
        .select('*, recipe:recipes(id, title, ingredients)')
        .gte('slot_date', weekStart)
        .lte('slot_date', weekEnd.toISOString().split('T')[0])
      if (error) throw error

      const items: Omit<GroceryItem, 'id' | 'user_id' | 'created_at' | 'recipe'>[] = []
      let order = 0
      for (const slot of (slots as (MealPlanSlot & { recipe: { id: string; title: string; ingredients: string } })[]) ?? []) {
        if (!slot.recipe) continue
        const lines = (slot.recipe.ingredients ?? '').split('\n').filter(l => l.trim())
        for (const line of lines) {
          items.push({
            week_start: weekStart,
            recipe_id: slot.recipe.id,
            ingredient_text: line.trim(),
            is_checked: false,
            sort_order: order++,
          })
        }
      }

      await supabase.from('grocery_items').delete().eq('week_start', weekStart)

      if (items.length) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')
        const { error: insertError } = await supabase.from('grocery_items').insert(items.map(i => ({ ...i, user_id: user.id })))
        if (insertError) throw insertError
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['grocery', weekStart] }),
  })
}

export function useToggleGroceryItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, is_checked, week_start }: { id: string; is_checked: boolean; week_start: string }) => {
      const { error } = await supabase.from('grocery_items').update({ is_checked }).eq('id', id)
      if (error) throw error
      return { week_start }
    },
    onMutate: async ({ id, is_checked, week_start }) => {
      await qc.cancelQueries({ queryKey: ['grocery', week_start] })
      const previous = qc.getQueryData<GroceryItem[]>(['grocery', week_start])
      qc.setQueryData<GroceryItem[]>(['grocery', week_start], old =>
        old?.map(item => item.id === id ? { ...item, is_checked } : item) ?? []
      )
      return { previous, week_start }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['grocery', ctx.week_start], ctx.previous)
    },
    onSettled: (_data, _err, vars) => qc.invalidateQueries({ queryKey: ['grocery', vars.week_start] }),
  })
}

export function useToggleAllGroceryItems(weekStart: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ ids, is_checked }: { ids: string[]; is_checked: boolean }) => {
      const { error } = await supabase.from('grocery_items').update({ is_checked }).in('id', ids)
      if (error) throw error
    },
    onMutate: async ({ ids, is_checked }) => {
      await qc.cancelQueries({ queryKey: ['grocery', weekStart] })
      const previous = qc.getQueryData<GroceryItem[]>(['grocery', weekStart])
      qc.setQueryData<GroceryItem[]>(['grocery', weekStart], old =>
        old?.map(item => ids.includes(item.id) ? { ...item, is_checked } : item) ?? []
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['grocery', weekStart], ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['grocery', weekStart] }),
  })
}

export function useDeleteGroceryGroup(weekStart: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ ids }: { ids: string[] }) => {
      const { error } = await supabase.from('grocery_items').delete().in('id', ids)
      if (error) throw error
    },
    onMutate: async ({ ids }) => {
      await qc.cancelQueries({ queryKey: ['grocery', weekStart] })
      const previous = qc.getQueryData<GroceryItem[]>(['grocery', weekStart])
      qc.setQueryData<GroceryItem[]>(['grocery', weekStart], old =>
        old?.filter(item => !ids.includes(item.id)) ?? []
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['grocery', weekStart], ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['grocery', weekStart] }),
  })
}

export function useDeleteAllGroceryItems(weekStart: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('grocery_items').delete().eq('week_start', weekStart)
      if (error) throw error
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['grocery', weekStart] })
      const previous = qc.getQueryData<GroceryItem[]>(['grocery', weekStart])
      qc.setQueryData(['grocery', weekStart], [])
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['grocery', weekStart], ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['grocery', weekStart] }),
  })
}

export function useDeleteGroceryItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; week_start: string }) => {
      const { error } = await supabase.from('grocery_items').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, week_start }) => {
      await qc.cancelQueries({ queryKey: ['grocery', week_start] })
      const previous = qc.getQueryData<GroceryItem[]>(['grocery', week_start])
      qc.setQueryData<GroceryItem[]>(['grocery', week_start], old =>
        old?.filter(item => item.id !== id) ?? []
      )
      return { previous, week_start }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['grocery', ctx.week_start], ctx.previous)
    },
    onSettled: (_data, _err, vars) => qc.invalidateQueries({ queryKey: ['grocery', vars.week_start] }),
  })
}

export function useAddGroceryItem(weekStart: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (text: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data, error } = await supabase.from('grocery_items').insert({
        week_start: weekStart, recipe_id: null, ingredient_text: text, is_checked: false,
        sort_order: Math.floor(Date.now() / 1000), user_id: user.id,
      }).select().single()
      if (error) throw error
      return data as GroceryItem
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['grocery', weekStart] }),
  })
}
