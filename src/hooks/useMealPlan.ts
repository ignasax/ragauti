import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { MealPlanSlot } from '../types/app'

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
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['meal-plan', getMondayOf(v.slot_date)] }),
  })
}

export function useRemoveMealSlot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; slot_date: string }) => {
      const { error } = await supabase.from('meal_plan_slots').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['meal-plan', getMondayOf(v.slot_date)] }),
  })
}

export function getMondayOf(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}
