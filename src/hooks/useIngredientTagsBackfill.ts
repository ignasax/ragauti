import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRecipes } from './useRecipes'
import { useGeminiKey } from '../contexts/GeminiKeyContext'
import { generateIngredientTags } from '../lib/gemini'
import { generateIngredientTagsWithGroq } from '../lib/groq'
import { supabase } from '../lib/supabase'

const BACKFILL_SESSION_KEY = 'ragauti_ingredient_tags_backfill_ran'
const BACKFILL_BATCH_SIZE = 3
const BACKFILL_DELAY_MS = 3000

export function useIngredientTagsBackfill() {
  const { data: recipes } = useRecipes()
  const { geminiKey, groqKey, provider } = useGeminiKey()
  const activeKey = provider === 'groq' ? groqKey : geminiKey
  const qc = useQueryClient()

  useEffect(() => {
    if (!activeKey || !recipes?.length) return
    if (sessionStorage.getItem(BACKFILL_SESSION_KEY)) return
    const untagged = recipes.filter(r => !r.ingredient_tags?.length).slice(0, BACKFILL_BATCH_SIZE)
    if (!untagged.length) return

    sessionStorage.setItem(BACKFILL_SESSION_KEY, '1')
    let cancelled = false
    let didUpdate = false
    ;(async () => {
      for (const recipe of untagged) {
        if (cancelled) break
        const tags = await (provider === 'groq'
          ? generateIngredientTagsWithGroq(recipe.ingredients, activeKey)
          : generateIngredientTags(recipe.ingredients, activeKey)
        ).catch(() => null)
        if (!tags || cancelled) break
        const { error } = await supabase.from('recipes').update({ ingredient_tags: tags }).eq('id', recipe.id)
        if (!error) didUpdate = true
        await new Promise(r => setTimeout(r, BACKFILL_DELAY_MS))
      }
      if (didUpdate && !cancelled) {
        qc.invalidateQueries({ queryKey: ['recipes'] })
      }
    })()
    return () => { cancelled = true }
  }, [recipes?.length, activeKey]) // eslint-disable-line react-hooks/exhaustive-deps
}
