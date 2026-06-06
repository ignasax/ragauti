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
      const [y, m, d] = weekStart.split('-').map(Number)
      const weekEnd = new Date(y, m - 1, d + 6)
      const weekEndStr = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(weekEnd.getDate()).padStart(2, '0')}`
      const { data: slots, error } = await supabase
        .from('meal_plan_slots')
        .select('*, recipe:recipes(id, title, ingredients)')
        .gte('slot_date', weekStart)
        .lte('slot_date', weekEndStr)
      if (error) throw error

      const items: Omit<GroceryItem, 'id' | 'user_id' | 'created_at' | 'recipe'>[] = []
      let order = 0
      for (const slot of (slots as (MealPlanSlot & { recipe: { id: string; title: string; ingredients: string } })[]) ?? []) {
        if (!slot.recipe) continue
        const groupId = crypto.randomUUID()
        const lines = (slot.recipe.ingredients ?? '').split('\n').filter(l => l.trim())
        for (const line of lines) {
          items.push({
            week_start: weekStart,
            recipe_id: slot.recipe.id,
            group_id: groupId,
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
        week_start: weekStart, recipe_id: null, group_id: null, ingredient_text: text, is_checked: false,
        sort_order: Math.floor(Date.now() / 1000), user_id: user.id,
      }).select().single()
      if (error) throw error
      return data as GroceryItem
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['grocery', weekStart] }),
  })
}

export function useUpdateGroceryItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ingredient_text,
      week_start,
    }: {
      id: string
      ingredient_text: string
      week_start: string
    }) => {
      const { error } = await supabase
        .from('grocery_items')
        .update({ ingredient_text })
        .eq('id', id)
      if (error) throw error
      return { week_start }
    },
    onMutate: async ({ id, ingredient_text, week_start }) => {
      await qc.cancelQueries({ queryKey: ['grocery', week_start] })
      const previous = qc.getQueryData<GroceryItem[]>(['grocery', week_start])
      qc.setQueryData<GroceryItem[]>(['grocery', week_start], old =>
        old?.map(item => item.id === id ? { ...item, ingredient_text } : item) ?? []
      )
      return { previous, week_start }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['grocery', ctx.week_start], ctx.previous)
    },
    onSettled: (_data, _err, vars) => qc.invalidateQueries({ queryKey: ['grocery', vars.week_start] }),
  })
}

export function useAddGroceryItemToGroup(weekStart: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      text,
      recipeId,
      groupId,
    }: {
      text: string
      recipeId: string | null
      groupId: string | null
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('grocery_items')
        .insert({
          week_start: weekStart,
          recipe_id: recipeId,
          group_id: groupId,
          ingredient_text: text,
          is_checked: false,
          sort_order: Math.floor(Date.now() / 1000),
          user_id: user.id,
        })
        .select()
        .single()
      if (error) throw error
      return data as GroceryItem
    },
    onMutate: async ({ text, recipeId, groupId }) => {
      await qc.cancelQueries({ queryKey: ['grocery', weekStart] })
      const previous = qc.getQueryData<GroceryItem[]>(['grocery', weekStart])
      qc.setQueryData<GroceryItem[]>(['grocery', weekStart], old => [
        ...(old ?? []),
        {
          id: `temp_${Date.now()}`,
          week_start: weekStart,
          recipe_id: recipeId,
          group_id: groupId,
          ingredient_text: text,
          is_checked: false,
          sort_order: Math.floor(Date.now() / 1000),
          user_id: '',
          created_at: '',
        } as GroceryItem,
      ])
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['grocery', weekStart], ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['grocery', weekStart] }),
  })
}

export function useAddRecipeToGrocery() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      weekStart,
      recipeId,
      items,
    }: {
      weekStart: string
      recipeId: string
      items: Array<{ text: string; is_checked: boolean }>
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const groupId = crypto.randomUUID()
      const rows = items.map((item, i) => ({
        week_start: weekStart,
        recipe_id: recipeId,
        group_id: groupId,
        ingredient_text: item.text,
        is_checked: item.is_checked,
        sort_order: Math.floor(Date.now() / 1000) + i,
        user_id: user.id,
      }))
      const { error } = await supabase.from('grocery_items').insert(rows)
      if (error) throw error
    },
    onMutate: async ({ weekStart, recipeId, items }) => {
      await qc.cancelQueries({ queryKey: ['grocery', weekStart] })
      const previous = qc.getQueryData<GroceryItem[]>(['grocery', weekStart])
      const tempGroupId = `temp_${crypto.randomUUID()}`
      qc.setQueryData<GroceryItem[]>(['grocery', weekStart], old => [
        ...(old ?? []),
        ...items.map((item, i) => ({
          id: `temp_${Date.now()}_${i}`,
          week_start: weekStart,
          recipe_id: recipeId,
          group_id: tempGroupId,
          ingredient_text: item.text,
          is_checked: item.is_checked,
          sort_order: Math.floor(Date.now() / 1000) + i,
          user_id: '',
          created_at: '',
        } as GroceryItem)),
      ])
      return { previous }
    },
    onError: (_err, vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['grocery', vars.weekStart], ctx.previous)
    },
    onSettled: (_data, _err, vars) => qc.invalidateQueries({ queryKey: ['grocery', vars.weekStart] }),
  })
}
