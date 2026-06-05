import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { MealPlanSlot, Recipe } from '../types/app'

export function useMealPlan(windowStart: string) {
  return useQuery({
    queryKey: ['meal-plan', windowStart],
    queryFn: async () => {
      const windowEnd = new Date(windowStart)
      windowEnd.setDate(windowEnd.getDate() + 6)
      const { data, error } = await supabase
        .from('meal_plan_slots')
        .select('*, recipe:recipes(id, title, image_url)')
        .gte('slot_date', windowStart)
        .lte('slot_date', windowEnd.toISOString().split('T')[0])
        .order('slot_date')
      if (error) throw error
      return data as MealPlanSlot[]
    },
  })
}

export function useAddMealSlot(windowStart: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ slot_date, meal_type, recipe_id }: { slot_date: string; meal_type: 'lunch' | 'dinner'; recipe_id: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('meal_plan_slots')
        .upsert({ slot_date, meal_type, recipe_id, user_id: user.id }, { onConflict: 'user_id,slot_date,meal_type' })
      if (error) throw error
    },
    onMutate: async ({ slot_date, meal_type, recipe_id }) => {
      await qc.cancelQueries({ queryKey: ['meal-plan', windowStart] })
      const previous = qc.getQueryData<MealPlanSlot[]>(['meal-plan', windowStart])
      const recipes = qc.getQueryData<Recipe[]>(['recipes']) ?? []
      const recipe = recipes.find(r => r.id === recipe_id)
      const tempSlot: MealPlanSlot = {
        id: `temp-${Date.now()}`,
        user_id: '',
        slot_date,
        meal_type,
        recipe_id,
        created_at: new Date().toISOString(),
        recipe: recipe ? { id: recipe.id, title: recipe.title, image_url: recipe.image_url } : undefined,
      }
      qc.setQueryData<MealPlanSlot[]>(['meal-plan', windowStart], old => {
        const filtered = (old ?? []).filter(s => !(s.slot_date === slot_date && s.meal_type === meal_type))
        return [...filtered, tempSlot]
      })
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['meal-plan', windowStart], ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['meal-plan', windowStart] }),
  })
}

export function useRemoveMealSlot(windowStart: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; slot_date: string }) => {
      const { error } = await supabase.from('meal_plan_slots').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: ['meal-plan', windowStart] })
      const previous = qc.getQueryData<MealPlanSlot[]>(['meal-plan', windowStart])
      qc.setQueryData<MealPlanSlot[]>(['meal-plan', windowStart], old =>
        old?.filter(s => s.id !== id) ?? []
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['meal-plan', windowStart], ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['meal-plan', windowStart] }),
  })
}

export function getMondayOf(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

/** Returns the local date string (YYYY-MM-DD) for today + offset days. */
export function getLocalDateStr(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
