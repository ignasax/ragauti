import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { RecipeForm } from '../components/recipes/RecipeForm'
import { useRecipe } from '../hooks/useRecipe'
import { useUpdateRecipe } from '../hooks/useRecipes'
import { useGeminiKey } from '../contexts/GeminiKeyContext'
import { generateIngredientTags } from '../lib/gemini'
import { generateIngredientTagsWithGroq } from '../lib/groq'

export function EditRecipePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: recipe, isLoading } = useRecipe(id!)
  const { mutateAsync, isPending } = useUpdateRecipe()
  const { geminiKey, groqKey, provider } = useGeminiKey()
  const activeKey = provider === 'groq' ? groqKey : geminiKey

  if (isLoading) return <div className="min-h-screen bg-warm-base" />

  return (
    <div className="bg-warm-base min-h-screen">
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <button type="button" onClick={() => navigate(-1)} aria-label="Go back"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 cursor-pointer touch-manipulation">
          <ChevronLeft className="w-5 h-5 text-warm-primary" />
        </button>
        <h1 className="font-serif text-xl font-bold text-warm-primary">Edit Recipe</h1>
      </div>
      <RecipeForm
        initialData={recipe}
        submitLabel="Save Changes"
        isSubmitting={isPending}
        onSubmit={async (data) => {
          const ingredient_tags = activeKey
            ? await (provider === 'groq'
                ? generateIngredientTagsWithGroq(data.ingredients, activeKey)
                : generateIngredientTags(data.ingredients, activeKey)
              ).catch(() => recipe?.ingredient_tags ?? [])
            : (recipe?.ingredient_tags ?? [])
          await mutateAsync({ id: id!, ...data, ingredient_tags })
          navigate(`/recipes/${id}`)
        }}
      />
    </div>
  )
}
