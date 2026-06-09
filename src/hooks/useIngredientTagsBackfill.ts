import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRecipes } from './useRecipes'
import { useGeminiKey } from '../contexts/GeminiKeyContext'
import { generateIngredientTags } from '../lib/gemini'
import { generateIngredientTagsWithGroq } from '../lib/groq'
import { supabase } from '../lib/supabase'

export function useIngredientTagsBackfill() {
  const { data: recipes } = useRecipes()
  const { geminiKey, groqKey, provider } = useGeminiKey()
  const activeKey = provider === 'groq' ? groqKey : geminiKey
  const qc = useQueryClient()

  useEffect(() => {
    if (!activeKey || !recipes?.length) return
    const untagged = recipes.filter(r => !r.ingredient_tags?.length).slice(0, 10)
    if (!untagged.length) return

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
        await new Promise(r => setTimeout(r, 500))
      }
      if (didUpdate && !cancelled) {
        qc.invalidateQueries({ queryKey: ['recipes'] })
      }
    })()
    return () => { cancelled = true }
  }, [recipes?.length, activeKey]) // eslint-disable-line react-hooks/exhaustive-deps
}
