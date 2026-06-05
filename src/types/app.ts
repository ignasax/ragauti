export interface Profile {
  id: string
  gemini_api_key: string | null
  created_at: string
}

export interface Recipe {
  id: string
  user_id: string
  title: string
  ingredients: string
  instructions: string
  image_url: string | null
  image_urls: string[]
  cook_time_mins: number | null
  prep_time_mins: number | null
  servings: number | null
  rating: number | null
  categories: string[]
  comments: string | null
  is_favourite: boolean
  source_url: string | null
  created_at: string
  updated_at: string
}

export interface MealPlanSlot {
  id: string
  user_id: string
  slot_date: string
  meal_type: 'lunch' | 'dinner'
  recipe_id: string
  created_at: string
  recipe?: Pick<Recipe, 'id' | 'title' | 'image_url'>
}

export interface GroceryItem {
  id: string
  user_id: string
  week_start: string
  recipe_id: string | null
  ingredient_text: string
  is_checked: boolean
  sort_order: number
  created_at: string
  recipe?: Pick<Recipe, 'id' | 'title'>
}
