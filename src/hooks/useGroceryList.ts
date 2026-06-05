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
      // 1. Fetch meal plan slots FIRST (before any destructive operations)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      const { data: slots, error } = await supabase
        .from('meal_plan_slots')
        .select('*, recipe:recipes(id, title, ingredients)')
        .gte('slot_date', weekStart)
        .lte('slot_date', weekEnd.toISOString().split('T')[0])
      if (error) throw error

      // 2. Build items in memory
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

      // 3. Only now delete the old list (we have the new one ready)
      await supabase.from('grocery_items').delete().eq('week_start', weekStart)

      // 4. Insert new items
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
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['grocery', data.week_start] }),
  })
}

export function useAddGroceryItem(weekStart: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (text: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase.from('grocery_items').insert({
        week_start: weekStart, recipe_id: null, ingredient_text: text, is_checked: false, sort_order: Date.now(), user_id: user.id,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['grocery', weekStart] }),
  })
}
