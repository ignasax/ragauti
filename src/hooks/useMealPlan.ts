import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { MealPlanSlot, Recipe } from '../types/app'

export function useMealPlan(weekStart: string) {
  return useQuery({
    queryKey: ['meal-plan', weekStart],
    queryFn: async () => {
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      const { data, error } = await supabase
        .from('meal_plan_slots')
        .select('*, recipe:recipes(id, title, image_url)')
        .gte('slot_date', weekStart)
        .lte('slot_date', weekEnd.toISOString().split('T')[0])
        .order('slot_date')
      if (error) throw error
      return data as MealPlanSlot[]
    },
  })
}

export function useAddMealSlot() {
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
      const weekStart = getMondayOf(slot_date)
      await qc.cancelQueries({ queryKey: ['meal-plan', weekStart] })
      const previous = qc.getQueryData<MealPlanSlot[]>(['meal-plan', weekStart])
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
      qc.setQueryData<MealPlanSlot[]>(['meal-plan', weekStart], old => {
        const filtered = (old ?? []).filter(s => !(s.slot_date === slot_date && s.meal_type === meal_type))
        return [...filtered, tempSlot]
      })
      return { previous, weekStart }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['meal-plan', ctx.weekStart], ctx.previous)
    },
    onSettled: (_d, _e, v) => qc.invalidateQueries({ queryKey: ['meal-plan', getMondayOf(v.slot_date)] }),
  })
}

export function useRemoveMealSlot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; slot_date: string }) => {
      const { error } = await supabase.from('meal_plan_slots').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, slot_date }) => {
      const weekStart = getMondayOf(slot_date)
      await qc.cancelQueries({ queryKey: ['meal-plan', weekStart] })
      const previous = qc.getQueryData<MealPlanSlot[]>(['meal-plan', weekStart])
      qc.setQueryData<MealPlanSlot[]>(['meal-plan', weekStart], old =>
        old?.filter(s => s.id !== id) ?? []
      )
      return { previous, weekStart }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['meal-plan', ctx.weekStart], ctx.previous)
    },
    onSettled: (_d, _e, v) => qc.invalidateQueries({ queryKey: ['meal-plan', getMondayOf(v.slot_date)] }),
  })
}

export function getMondayOf(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}
