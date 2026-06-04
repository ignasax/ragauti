import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { RecipeForm } from '../components/recipes/RecipeForm'
import { useAddRecipe } from '../hooks/useRecipes'

export function AddRecipePage() {
  const navigate = useNavigate()
  const { mutateAsync, isPending } = useAddRecipe()
  return (
    <div className="bg-warm-base min-h-screen">
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <button type="button" onClick={() => navigate(-1)} aria-label="Go back"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 cursor-pointer touch-manipulation">
          <ChevronLeft className="w-5 h-5 text-warm-primary" />
        </button>
        <h1 className="font-serif text-xl font-bold text-warm-primary">Add Recipe</h1>
      </div>
      <RecipeForm submitLabel="Save Recipe" isSubmitting={isPending}
        onSubmit={async (data) => { await mutateAsync(data); navigate('/recipes') }} />
    </div>
  )
}
