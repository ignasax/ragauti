# Ragauti Part 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Ragauti Part 1 — mobile-first personal recipe manager with Google OAuth, recipe CRUD, Gemini URL scraping, meal planning, and grocery list generation.

**Architecture:** Seven vertical slices built sequentially, each independently testable. Auth + shell first, then recipe CRUD, then scraping, then search/filter, then planner, grocery list, and finally settings + PWA. All data private per user via Supabase RLS. Gemini calls are client-side using each user's own API key stored in their `profiles` row.

**Tech Stack:** React 18 + TypeScript, Vite 5, Tailwind CSS v3 (custom warm palette), TanStack Query v5, React Router v6, Supabase JS v2, Vitest + React Testing Library, vite-plugin-pwa, @google/generative-ai, Lucide React, Lora + Raleway (Google Fonts)

---

## File Map

```
src/
  main.tsx                     — app entry, QueryClientProvider, RouterProvider
  App.tsx                      — route definitions
  index.css                    — Tailwind directives + Google Fonts import
  lib/
    supabase.ts                — createClient() singleton
    gemini.ts                  — callGemini(prompt, key), extractRecipe(html, key)
  contexts/
    AuthContext.tsx            — session, user, loading
    GeminiKeyContext.tsx       — geminiKey, setGeminiKey, isLoading
  hooks/
    useRecipes.ts              — list + mutations (add/edit/delete/favourite)
    useRecipe.ts               — single recipe by id
    useMealPlan.ts             — week slots CRUD
    useGroceryList.ts          — grocery items CRUD + generate from plan
    useGeminiExtract.ts        — extract recipe from URL (calls api/scrape + lib/gemini)
    useRecipeFilter.ts         — pure client-side filter logic (no Supabase)
  components/
    layout/
      TabBar.tsx               — 4-tab bottom nav
      Fab.tsx                  — context-aware pill FAB
      AppShell.tsx             — wraps TabBar + Fab + <Outlet>
    auth/
      ProtectedRoute.tsx       — redirects to /login if no session
      GeminiKeyBanner.tsx      — banner shown when geminiKey is null
    recipes/
      RecipeCard.tsx           — grid card (image, title, time, rating, heart)
      RecipeGrid.tsx           — 2-col grid with filter-aware empty state
      RecipeForm.tsx           — add/edit form (all fields)
      RecipeDetail.tsx         — sticky jump bar + scaler + actions
      ServingScaler.tsx        — multiplier buttons + scaled ingredients
      ClipboardBanner.tsx      — "Found a link — extract recipe?" banner
    search/
      SearchBar.tsx            — controlled text input
      FilterChips.tsx          — star/category/favourites chips
    planner/
      WeekGrid.tsx             — 7-row table (day | lunch | dinner)
      MealSlot.tsx             — single cell (empty + with recipe)
      RecipePicker.tsx         — searchable bottom sheet
    grocery/
      GroceryGroup.tsx         — recipe section header + item list
      GroceryItem.tsx          — single checkable row
    settings/
      GeminiKeyForm.tsx        — masked input + save button
  pages/
    LoginPage.tsx
    RecipesPage.tsx
    RecipeDetailPage.tsx
    AddRecipePage.tsx
    EditRecipePage.tsx
    PlannerPage.tsx
    GroceryPage.tsx
    SettingsPage.tsx
    ShareTargetPage.tsx        — PWA share target handler
  utils/
    servingScaler.ts           — scaleIngredients(text, multiplier): string (pure, TDD)
    recipeFilter.ts            — filterRecipes(recipes, filters): Recipe[] (pure, TDD)
  types/
    supabase.ts                — generated Supabase types
    app.ts                     — shared app types (Recipe, MealSlot, GroceryItem, etc.)
api/
  scrape.ts                    — Vercel serverless: fetch(url) → return HTML (no key)
supabase/
  migrations/
    001_initial_schema.sql     — all 4 tables + RLS policies
public/
  manifest.json                — PWA manifest with share target
  icons/                       — PWA icons (192, 512)
vite.config.ts
tailwind.config.ts
postcss.config.js
vercel.json                    — SPA rewrite + /api/* functions
```

---

### Task 0: Project Scaffold

**Files:**
- Create: `vite.config.ts`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `src/index.css`
- Create: `src/types/app.ts`
- Create: `vercel.json`
- Modify: `index.html` (add Google Fonts link)

- [ ] **Step 1: Scaffold Vite project**

```bash
npm create vite@latest . -- --template react-ts
npm install
```

Expected: `src/main.tsx`, `src/App.tsx`, `index.html` created.

- [ ] **Step 2: Install all dependencies**

```bash
npm install @supabase/supabase-js @tanstack/react-query react-router-dom lucide-react @google/generative-ai
npm install -D tailwindcss@3 postcss autoprefixer vite-plugin-pwa vitest @vitest/ui @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
npx tailwindcss init -p
```

- [ ] **Step 3: Configure Tailwind with warm palette**

Replace `tailwind.config.ts` with:

```ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        warm: {
          base:            '#fdf6ee',
          card:            '#fffaf5',
          surface:         '#f5ebe0',
          border:          '#e8ddd0',
          accent:          '#c0703a',
          'accent-hover':  '#a85f2e',
          primary:         '#2c1a0e',
          secondary:       '#a08060',
          muted:           '#c4a882',
        },
      },
      fontFamily: {
        serif: ['Lora', 'Georgia', 'serif'],
        sans:  ['Raleway', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
```

- [ ] **Step 4: Create `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@media (prefers-reduced-motion: reduce) {
  * {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 5: Add Google Fonts to `index.html`**

Add inside `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=Raleway:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<meta name="theme-color" content="#fdf6ee">
<meta name="viewport" content="width=device-width, initial-scale=1">
```

- [ ] **Step 6: Create `vercel.json`**

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

- [ ] **Step 7: Configure Vitest in `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
})
```

Create `src/test-setup.ts`:

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 8: Create `src/types/app.ts`**

```ts
export interface Recipe {
  id: string
  user_id: string
  title: string
  ingredients: string
  instructions: string
  image_url: string | null
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
  recipe?: Recipe
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
```

- [ ] **Step 9: Create `.env.local`**

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_GEMINI_API_KEY=your_dev_only_key
```

- [ ] **Step 10: Verify dev server starts**

```bash
npm run dev
```

Expected: Vite dev server running on `http://localhost:5173`. No TypeScript errors.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + Tailwind + deps"
```

---

### Task 1: Supabase Client + Database Schema

**Files:**
- Create: `src/lib/supabase.ts`
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Create Supabase client**

Create `src/lib/supabase.ts`:

```ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 2: Write migration SQL**

Create `supabase/migrations/001_initial_schema.sql`:

```sql
-- profiles
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  gemini_api_key text,
  created_at    timestamptz default now()
);
alter table profiles enable row level security;
create policy "Users manage own profile"
  on profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- auto-create profile on first login
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- recipes
create table recipes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  title           text not null,
  ingredients     text not null default '',
  instructions    text not null default '',
  image_url       text,
  cook_time_mins  int,
  prep_time_mins  int,
  servings        int,
  rating          int check (rating between 1 and 5),
  categories      text[] not null default '{}',
  comments        text,
  is_favourite    bool not null default false,
  source_url      text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
alter table recipes enable row level security;
create policy "Users manage own recipes"
  on recipes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- auto-update updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger recipes_updated_at
  before update on recipes
  for each row execute procedure set_updated_at();

-- meal_plan_slots
create table meal_plan_slots (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  slot_date   date not null,
  meal_type   text not null check (meal_type in ('lunch', 'dinner')),
  recipe_id   uuid not null references recipes(id) on delete cascade,
  created_at  timestamptz default now(),
  unique (user_id, slot_date, meal_type)
);
alter table meal_plan_slots enable row level security;
create policy "Users manage own meal plan"
  on meal_plan_slots for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- grocery_items
create table grocery_items (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  week_start       date not null,
  recipe_id        uuid references recipes(id) on delete set null,
  ingredient_text  text not null,
  is_checked       bool not null default false,
  sort_order       int not null default 0,
  created_at       timestamptz default now()
);
alter table grocery_items enable row level security;
create policy "Users manage own grocery items"
  on grocery_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

- [ ] **Step 3: Apply migration to Supabase**

Option A (Supabase cloud dashboard): paste SQL into SQL editor and run.

Option B (local dev):
```bash
npx supabase start
npx supabase db reset
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase.ts supabase/
git commit -m "feat: supabase client + initial schema with RLS"
```

---

### Task 2: Auth Context + Login Page

**Files:**
- Create: `src/contexts/AuthContext.tsx`
- Create: `src/contexts/GeminiKeyContext.tsx`
- Create: `src/components/auth/ProtectedRoute.tsx`
- Create: `src/components/auth/GeminiKeyBanner.tsx`
- Create: `src/pages/LoginPage.tsx`

- [ ] **Step 1: Create `AuthContext`**

Create `src/contexts/AuthContext.tsx`:

```tsx
import { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  loading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
```

- [ ] **Step 2: Create `GeminiKeyContext`**

Create `src/contexts/GeminiKeyContext.tsx`:

```tsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

interface GeminiKeyContextValue {
  geminiKey: string | null
  setGeminiKey: (key: string) => void
  isLoading: boolean
}

const GeminiKeyContext = createContext<GeminiKeyContextValue>({
  geminiKey: null,
  setGeminiKey: () => {},
  isLoading: true,
})

export function GeminiKeyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [geminiKey, setGeminiKeyState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) { setIsLoading(false); return }
    supabase
      .from('profiles')
      .select('gemini_api_key')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setGeminiKeyState(data?.gemini_api_key ?? null)
        setIsLoading(false)
      })
  }, [user])

  const setGeminiKey = async (key: string) => {
    if (!user) return
    await supabase.from('profiles').update({ gemini_api_key: key }).eq('id', user.id)
    setGeminiKeyState(key)
  }

  return (
    <GeminiKeyContext.Provider value={{ geminiKey, setGeminiKey, isLoading }}>
      {children}
    </GeminiKeyContext.Provider>
  )
}

export const useGeminiKey = () => useContext(GeminiKeyContext)
```

- [ ] **Step 3: Create `ProtectedRoute`**

Create `src/components/auth/ProtectedRoute.tsx`:

```tsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-warm-base" />
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}
```

- [ ] **Step 4: Create `GeminiKeyBanner`**

Create `src/components/auth/GeminiKeyBanner.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'

export function GeminiKeyBanner() {
  return (
    <div className="flex items-center gap-3 bg-warm-surface border border-warm-border rounded-xl px-4 py-3">
      <Sparkles className="w-4 h-4 text-warm-secondary flex-shrink-0" />
      <p className="font-sans text-sm text-warm-secondary">
        Add your Gemini API key in{' '}
        <Link to="/settings" className="text-warm-accent underline">
          Settings
        </Link>{' '}
        to enable AI features.
      </p>
    </div>
  )
}
```

- [ ] **Step 5: Create `LoginPage`**

Create `src/pages/LoginPage.tsx`:

```tsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function LoginPage() {
  const { session } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (session) navigate('/recipes', { replace: true })
  }, [session, navigate])

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/recipes` },
    })
  }

  return (
    <div className="min-h-screen bg-warm-base flex flex-col items-center justify-center px-6">
      <div className="mb-10 text-center">
        <h1 className="font-serif text-4xl font-bold text-warm-primary mb-2">Ragauti</h1>
        <p className="font-sans text-warm-secondary text-base">Your personal recipe book</p>
      </div>
      <button
        onClick={handleGoogleLogin}
        className="w-full max-w-xs bg-warm-accent text-white font-sans font-semibold text-sm px-6 py-3 rounded-xl min-h-[44px] active:opacity-80 transition-opacity duration-150 touch-manipulation cursor-pointer"
      >
        Continue with Google
      </button>
    </div>
  )
}
```

- [ ] **Step 6: Wire providers in `src/main.tsx`**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { router } from './App'
import './index.css'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
)
```

- [ ] **Step 7: Create `src/App.tsx` with initial routes**

```tsx
import { createBrowserRouter } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '*', element: <LoginPage /> },
])
```

- [ ] **Step 8: Verify login page renders**

```bash
npm run dev
```

Navigate to `http://localhost:5173/login`. Expected: cream background, "Ragauti" heading, Google button.

- [ ] **Step 9: Commit**

```bash
git add src/
git commit -m "feat: auth context + login page + protected route"
```

---

### Task 3: App Shell — Tab Bar, FAB, Routing

**Files:**
- Create: `src/components/layout/TabBar.tsx`
- Create: `src/components/layout/Fab.tsx`
- Create: `src/components/layout/AppShell.tsx`
- Create: `src/pages/RecipesPage.tsx` (stub)
- Create: `src/pages/PlannerPage.tsx` (stub)
- Create: `src/pages/GroceryPage.tsx` (stub)
- Create: `src/pages/SettingsPage.tsx` (stub)
- Modify: `src/App.tsx`

- [ ] **Step 1: Create `TabBar`**

Create `src/components/layout/TabBar.tsx`:

```tsx
import { NavLink } from 'react-router-dom'
import { BookOpen, CalendarDays, ShoppingCart, Settings } from 'lucide-react'

const tabs = [
  { to: '/recipes',  icon: BookOpen,      label: 'Recipes'  },
  { to: '/planner',  icon: CalendarDays,  label: 'Planner'  },
  { to: '/grocery',  icon: ShoppingCart,  label: 'Grocery'  },
  { to: '/settings', icon: Settings,      label: 'Settings' },
]

export function TabBar() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-warm-base border-t border-warm-border flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[60px] cursor-pointer touch-manipulation ${
              isActive ? 'text-warm-accent' : 'text-warm-secondary'
            }`
          }
        >
          <Icon className="w-5 h-5" aria-hidden="true" />
          <span className="font-sans text-[10px] font-700 uppercase tracking-wider">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 2: Create `Fab`**

Create `src/components/layout/Fab.tsx`:

```tsx
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'

const fabConfig: Record<string, { label: string; action: string }> = {
  '/recipes':  { label: '+ Add recipe',  action: '/recipes/new' },
  '/planner':  { label: '+ Add to plan', action: '/planner?add=1' },
  '/grocery':  { label: '+ Add item',    action: '/grocery?add=1' },
}

export function Fab() {
  const location = useLocation()
  const navigate = useNavigate()
  const config = fabConfig[location.pathname]
  if (!config) return null

  return (
    <button
      onClick={() => navigate(config.action)}
      className="fixed right-4 z-20 bg-warm-accent text-white font-sans font-semibold text-sm px-4 py-2.5 rounded-full flex items-center gap-1.5 shadow-lg min-h-[44px] active:opacity-80 transition-opacity duration-150 touch-manipulation cursor-pointer"
      style={{ bottom: 'calc(60px + env(safe-area-inset-bottom) + 16px)' }}
      aria-label={config.label}
    >
      <Plus className="w-4 h-4" aria-hidden="true" />
      <span>{config.label}</span>
    </button>
  )
}
```

- [ ] **Step 3: Create `AppShell`**

Create `src/components/layout/AppShell.tsx`:

```tsx
import { Outlet } from 'react-router-dom'
import { TabBar } from './TabBar'
import { Fab } from './Fab'
import { GeminiKeyProvider } from '../../contexts/GeminiKeyContext'

export function AppShell() {
  return (
    <GeminiKeyProvider>
      <div className="min-h-screen bg-warm-base">
        <main
          className="pb-[calc(60px+env(safe-area-inset-bottom))]"
        >
          <Outlet />
        </main>
        <Fab />
        <TabBar />
      </div>
    </GeminiKeyProvider>
  )
}
```

- [ ] **Step 4: Create stub pages**

Create `src/pages/RecipesPage.tsx`:
```tsx
export function RecipesPage() {
  return <div className="px-4 pt-4"><p className="font-sans text-warm-primary">Recipes</p></div>
}
```

Create `src/pages/PlannerPage.tsx`:
```tsx
export function PlannerPage() {
  return <div className="px-4 pt-4"><p className="font-sans text-warm-primary">Planner</p></div>
}
```

Create `src/pages/GroceryPage.tsx`:
```tsx
export function GroceryPage() {
  return <div className="px-4 pt-4"><p className="font-sans text-warm-primary">Grocery</p></div>
}
```

Create `src/pages/SettingsPage.tsx`:
```tsx
export function SettingsPage() {
  return <div className="px-4 pt-4"><p className="font-sans text-warm-primary">Settings</p></div>
}
```

- [ ] **Step 5: Wire full routing in `src/App.tsx`**

```tsx
import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { RecipesPage } from './pages/RecipesPage'
import { PlannerPage } from './pages/PlannerPage'
import { GroceryPage } from './pages/GroceryPage'
import { SettingsPage } from './pages/SettingsPage'

const ProtectedShell = () => (
  <ProtectedRoute>
    <AppShell />
  </ProtectedRoute>
)

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedShell />,
    children: [
      { path: '/recipes',  element: <RecipesPage /> },
      { path: '/planner',  element: <PlannerPage /> },
      { path: '/grocery',  element: <GroceryPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/',         element: <RecipesPage /> },
    ],
  },
])
```

- [ ] **Step 6: Verify shell on device**

```bash
npm run dev
```

Open `http://localhost:5173/recipes`. Expected: warm background, 4-tab bar at bottom, FAB above tab bar with "Recipes" label. Tab switching works. Settings tab hides FAB.

- [ ] **Step 7: Commit**

```bash
git add src/
git commit -m "feat: tab bar, FAB, app shell routing"
```

---

### Task 4: Serving Scaler Utility (TDD)

**Files:**
- Create: `src/utils/servingScaler.ts`
- Create: `src/utils/servingScaler.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/utils/servingScaler.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { scaleIngredients } from './servingScaler'

describe('scaleIngredients', () => {
  it('scales a simple integer quantity', () => {
    expect(scaleIngredients('2 eggs', 2)).toBe('4 eggs')
  })
  it('scales a decimal quantity', () => {
    expect(scaleIngredients('1.5 cups flour', 2)).toBe('3 cups flour')
  })
  it('scales a fraction', () => {
    expect(scaleIngredients('1/2 tsp salt', 2)).toBe('1 tsp salt')
  })
  it('scales multiple lines independently', () => {
    expect(scaleIngredients('2 eggs\n1 cup milk', 3)).toBe('6 eggs\n3 cups milk')
  })
  it('leaves lines with no number unchanged', () => {
    expect(scaleIngredients('a pinch of salt', 2)).toBe('a pinch of salt')
  })
  it('returns original on multiplier 1', () => {
    expect(scaleIngredients('3 tomatoes', 1)).toBe('3 tomatoes')
  })
})
```

- [ ] **Step 2: Run tests — expect failures**

```bash
npx vitest run src/utils/servingScaler.test.ts
```

Expected: 6 failing (module not found).

- [ ] **Step 3: Implement `scaleIngredients`**

Create `src/utils/servingScaler.ts`:

```ts
export function scaleIngredients(text: string, multiplier: number): string {
  if (multiplier === 1) return text
  return text.split('\n').map(line => scaleLine(line, multiplier)).join('\n')
}

function scaleLine(line: string, multiplier: number): string {
  line = line.replace(/\b(\d+)\/(\d+)\b/, (_m, n, d) =>
    formatNumber((parseInt(n) / parseInt(d)) * multiplier)
  )
  line = line.replace(/\b(\d+(?:\.\d+)?)\b/, (_m, n) =>
    formatNumber(parseFloat(n) * multiplier)
  )
  return line
}

function formatNumber(n: number): string {
  if (Number.isInteger(n)) return String(n)
  return String(Math.round(n * 100) / 100)
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
npx vitest run src/utils/servingScaler.test.ts
```

Expected: 6 passing.

- [ ] **Step 5: Commit**

```bash
git add src/utils/
git commit -m "feat: serving scaler utility (TDD)"
```

---

### Task 5: Recipe Filter Utility (TDD)

**Files:**
- Create: `src/utils/recipeFilter.ts`
- Create: `src/utils/recipeFilter.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/utils/recipeFilter.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { filterRecipes } from './recipeFilter'
import type { Recipe } from '../types/app'

const base: Recipe = {
  id: '1', user_id: 'u1', title: 'Pasta', ingredients: 'garlic\npasta',
  instructions: 'cook', image_url: null, cook_time_mins: 20, prep_time_mins: 5,
  servings: 2, rating: 4, categories: ['Italian'], comments: null,
  is_favourite: false, source_url: null, created_at: '', updated_at: '',
}

describe('filterRecipes', () => {
  it('returns all when no filters', () => {
    expect(filterRecipes([base], {})).toHaveLength(1)
  })
  it('filters by search term in title', () => {
    expect(filterRecipes([base], { search: 'past' })).toHaveLength(1)
    expect(filterRecipes([base], { search: 'soup' })).toHaveLength(0)
  })
  it('filters by search term in ingredients', () => {
    expect(filterRecipes([base], { search: 'garlic' })).toHaveLength(1)
  })
  it('filters by minimum rating', () => {
    expect(filterRecipes([base], { minRating: 4 })).toHaveLength(1)
    expect(filterRecipes([base], { minRating: 5 })).toHaveLength(0)
  })
  it('filters by favourites only', () => {
    expect(filterRecipes([base], { favouritesOnly: true })).toHaveLength(0)
    expect(filterRecipes([{ ...base, is_favourite: true }], { favouritesOnly: true })).toHaveLength(1)
  })
  it('filters by category', () => {
    expect(filterRecipes([base], { categories: ['Italian'] })).toHaveLength(1)
    expect(filterRecipes([base], { categories: ['Mexican'] })).toHaveLength(0)
  })
  it('composes multiple filters', () => {
    const r2 = { ...base, id: '2', title: 'Soup', rating: 3, categories: ['French'] }
    expect(filterRecipes([base, r2], { search: 'soup', minRating: 4 })).toHaveLength(0)
    expect(filterRecipes([base, r2], { search: 'soup', minRating: 3 })).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run tests — expect failures**

```bash
npx vitest run src/utils/recipeFilter.test.ts
```

- [ ] **Step 3: Implement `filterRecipes`**

Create `src/utils/recipeFilter.ts`:

```ts
import type { Recipe } from '../types/app'

export interface RecipeFilters {
  search?: string
  minRating?: number
  favouritesOnly?: boolean
  categories?: string[]
}

export function filterRecipes(recipes: Recipe[], filters: RecipeFilters): Recipe[] {
  const { search, minRating, favouritesOnly, categories } = filters
  return recipes.filter(r => {
    if (search) {
      const q = search.toLowerCase()
      if (![r.title, r.ingredients, r.instructions, r.comments ?? ''].some(f => f.toLowerCase().includes(q)))
        return false
    }
    if (minRating != null && (r.rating ?? 0) < minRating) return false
    if (favouritesOnly && !r.is_favourite) return false
    if (categories?.length && !categories.every(c => r.categories.includes(c))) return false
    return true
  })
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
npx vitest run src/utils/recipeFilter.test.ts
```

Expected: 7 passing.

- [ ] **Step 5: Commit**

```bash
git add src/utils/
git commit -m "feat: recipe filter utility (TDD)"
```

---

### Task 6: Recipe Hooks

**Files:**
- Create: `src/hooks/useRecipes.ts`
- Create: `src/hooks/useRecipe.ts`

- [ ] **Step 1: Create `useRecipes` hook**

Create `src/hooks/useRecipes.ts`:

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Recipe } from '../types/app'

export function useRecipes() {
  return useQuery({
    queryKey: ['recipes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('recipes').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data as Recipe[]
    },
  })
}

export function useAddRecipe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (recipe: Omit<Recipe, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase.from('recipes').insert(recipe).select().single()
      if (error) throw error
      return data as Recipe
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recipes'] }),
  })
}

export function useUpdateRecipe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Recipe> & { id: string }) => {
      const { data, error } = await supabase.from('recipes').update(updates).eq('id', id).select().single()
      if (error) throw error
      return data as Recipe
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['recipes'] })
      qc.invalidateQueries({ queryKey: ['recipe', data.id] })
    },
  })
}

export function useDeleteRecipe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recipes').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recipes'] }),
  })
}

export function useToggleFavourite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, is_favourite }: { id: string; is_favourite: boolean }) => {
      const { error } = await supabase.from('recipes').update({ is_favourite }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recipes'] }),
  })
}
```

- [ ] **Step 2: Create `useRecipe` hook**

Create `src/hooks/useRecipe.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Recipe } from '../types/app'

export function useRecipe(id: string) {
  return useQuery({
    queryKey: ['recipe', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('recipes').select('*').eq('id', id).single()
      if (error) throw error
      return data as Recipe
    },
    enabled: !!id,
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/
git commit -m "feat: recipe CRUD hooks with TanStack Query"
```

---

### Task 7: Recipe Form + Add/Edit Pages

**Files:**
- Create: `src/components/recipes/RecipeForm.tsx`
- Create: `src/pages/AddRecipePage.tsx`
- Create: `src/pages/EditRecipePage.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create `RecipeForm`**

Create `src/components/recipes/RecipeForm.tsx`:

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, X } from 'lucide-react'
import type { Recipe } from '../../types/app'

type RecipeFormData = Omit<Recipe, 'id' | 'user_id' | 'created_at' | 'updated_at'>

interface RecipeFormProps {
  initialData?: Partial<RecipeFormData>
  onSubmit: (data: RecipeFormData) => Promise<void>
  isSubmitting: boolean
  submitLabel: string
  topSlot?: React.ReactNode
}

const empty: RecipeFormData = {
  title: '', ingredients: '', instructions: '', image_url: null,
  cook_time_mins: null, prep_time_mins: null, servings: null,
  rating: null, categories: [], comments: null, is_favourite: false, source_url: null,
}

export function RecipeForm({ initialData, onSubmit, isSubmitting, submitLabel, topSlot }: RecipeFormProps) {
  const navigate = useNavigate()
  const [data, setData] = useState<RecipeFormData>({ ...empty, ...initialData })
  const [categoryInput, setCategoryInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof RecipeFormData>(key: K, value: RecipeFormData[K]) =>
    setData(d => ({ ...d, [key]: value }))

  const addCategory = () => {
    const t = categoryInput.trim()
    if (t && !data.categories.includes(t)) set('categories', [...data.categories, t])
    setCategoryInput('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!data.title.trim()) { setError('Title is required'); return }
    setError(null)
    await onSubmit(data)
  }

  const inputCls = "w-full bg-warm-surface border border-warm-border rounded-lg px-3 py-3 text-warm-primary font-sans text-base placeholder:text-warm-muted focus:outline-none focus:border-warm-accent transition-colors min-h-[44px]"

  return (
    <form onSubmit={handleSubmit} className="px-4 pt-4 pb-8 flex flex-col gap-5">
      {topSlot}
      <div>
        <label htmlFor="title" className="font-sans font-700 text-warm-secondary text-[10px] uppercase tracking-wider block mb-1">Title *</label>
        <input id="title" value={data.title} onChange={e => set('title', e.target.value)} placeholder="Recipe name" className={inputCls} />
      </div>
      <div>
        <label htmlFor="image" className="font-sans font-700 text-warm-secondary text-[10px] uppercase tracking-wider block mb-1">Image</label>
        <input id="image" value={data.image_url ?? ''} onChange={e => set('image_url', e.target.value || null)} placeholder="Image URL" className={inputCls} />
        <input type="file" accept="image/*" capture="environment" className="mt-2 font-sans text-sm text-warm-secondary"
          onChange={e => { const f = e.target.files?.[0]; if (f) set('image_url', URL.createObjectURL(f)) }} />
      </div>
      <div className="flex gap-3">
        {[['prep', 'Prep (min)', 'prep_time_mins'], ['cook', 'Cook (min)', 'cook_time_mins'], ['servings', 'Servings', 'servings']].map(([id, label, key]) => (
          <div key={id} className="flex-1">
            <label htmlFor={id} className="font-sans font-700 text-warm-secondary text-[10px] uppercase tracking-wider block mb-1">{label}</label>
            <input id={id} type="number" min={0}
              value={(data[key as keyof RecipeFormData] as number | null) ?? ''}
              onChange={e => set(key as keyof RecipeFormData, e.target.value ? parseInt(e.target.value) : null as any)}
              className={inputCls} />
          </div>
        ))}
      </div>
      <div>
        <span className="font-sans font-700 text-warm-secondary text-[10px] uppercase tracking-wider block mb-2">Rating</span>
        <div className="flex gap-2">
          {[1,2,3,4,5].map(n => (
            <button key={n} type="button" onClick={() => set('rating', data.rating === n ? null : n)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer touch-manipulation" aria-label={`${n} star`}>
              <Star className={`w-6 h-6 ${(data.rating ?? 0) >= n ? 'text-warm-accent fill-warm-accent' : 'text-warm-muted'}`} />
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="font-sans font-700 text-warm-secondary text-[10px] uppercase tracking-wider block mb-2">Categories</span>
        <div className="flex flex-wrap gap-2 mb-2">
          {data.categories.map(c => (
            <span key={c} className="bg-warm-surface text-warm-secondary font-sans text-xs px-2 py-1 rounded-full flex items-center gap-1">
              {c}
              <button type="button" onClick={() => set('categories', data.categories.filter(x => x !== c))}
                aria-label={`Remove ${c}`} className="min-w-[20px] min-h-[20px] flex items-center justify-center touch-manipulation">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={categoryInput} onChange={e => setCategoryInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCategory() } }}
            placeholder="Add category" className={`${inputCls} flex-1`} />
          <button type="button" onClick={addCategory}
            className="bg-warm-surface border border-warm-border text-warm-primary font-sans text-sm px-3 py-2 rounded-lg min-h-[44px] cursor-pointer touch-manipulation">Add</button>
        </div>
      </div>
      <div>
        <label htmlFor="ingredients" className="font-sans font-700 text-warm-secondary text-[10px] uppercase tracking-wider block mb-1">Ingredients</label>
        <textarea id="ingredients" rows={6} value={data.ingredients} onChange={e => set('ingredients', e.target.value)}
          placeholder={"One ingredient per line\ne.g. 2 cloves garlic"} className={`${inputCls} resize-none`} />
      </div>
      <div>
        <label htmlFor="instructions" className="font-sans font-700 text-warm-secondary text-[10px] uppercase tracking-wider block mb-1">Instructions</label>
        <textarea id="instructions" rows={8} value={data.instructions} onChange={e => set('instructions', e.target.value)}
          placeholder="Step by step instructions..." className={`${inputCls} resize-none`} />
      </div>
      <div>
        <label htmlFor="comments" className="font-sans font-700 text-warm-secondary text-[10px] uppercase tracking-wider block mb-1">Notes</label>
        <textarea id="comments" rows={3} value={data.comments ?? ''} onChange={e => set('comments', e.target.value || null)}
          placeholder="Personal notes, tips..." className={`${inputCls} resize-none`} />
      </div>
      {error && <p className="font-sans text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button type="button" onClick={() => navigate(-1)}
          className="flex-1 border border-warm-border text-warm-primary font-sans font-500 text-sm px-4 py-3 rounded-lg min-h-[44px] bg-warm-card active:bg-warm-surface transition-colors duration-150 cursor-pointer touch-manipulation">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting}
          className="flex-1 bg-warm-accent text-white font-sans font-semibold text-sm px-4 py-3 rounded-xl min-h-[44px] active:opacity-80 disabled:opacity-50 transition-opacity duration-150 cursor-pointer touch-manipulation">
          {isSubmitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Create `AddRecipePage`**

Create `src/pages/AddRecipePage.tsx`:

```tsx
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
        <button onClick={() => navigate(-1)} aria-label="Go back"
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
```

- [ ] **Step 3: Create `EditRecipePage`**

Create `src/pages/EditRecipePage.tsx`:

```tsx
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { RecipeForm } from '../components/recipes/RecipeForm'
import { useRecipe } from '../hooks/useRecipe'
import { useUpdateRecipe } from '../hooks/useRecipes'

export function EditRecipePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: recipe, isLoading } = useRecipe(id!)
  const { mutateAsync, isPending } = useUpdateRecipe()
  if (isLoading) return <div className="min-h-screen bg-warm-base" />
  return (
    <div className="bg-warm-base min-h-screen">
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <button onClick={() => navigate(-1)} aria-label="Go back"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 cursor-pointer touch-manipulation">
          <ChevronLeft className="w-5 h-5 text-warm-primary" />
        </button>
        <h1 className="font-serif text-xl font-bold text-warm-primary">Edit Recipe</h1>
      </div>
      <RecipeForm initialData={recipe} submitLabel="Save Changes" isSubmitting={isPending}
        onSubmit={async (data) => { await mutateAsync({ id: id!, ...data }); navigate(`/recipes/${id}`) }} />
    </div>
  )
}
```

- [ ] **Step 4: Add routes in `src/App.tsx`**

```tsx
import { AddRecipePage } from './pages/AddRecipePage'
import { EditRecipePage } from './pages/EditRecipePage'
// inside protected children:
{ path: '/recipes/new',      element: <AddRecipePage /> },
{ path: '/recipes/:id/edit', element: <EditRecipePage /> },
```

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "feat: recipe form, add/edit pages"
```

---

### Task 8: Recipe Card, Grid, and List Page

**Files:**
- Create: `src/components/recipes/RecipeCard.tsx`
- Create: `src/components/recipes/RecipeGrid.tsx`
- Create: `src/components/search/SearchBar.tsx`
- Create: `src/components/search/FilterChips.tsx`
- Modify: `src/pages/RecipesPage.tsx`

- [ ] **Step 1: Create `RecipeCard`**

Create `src/components/recipes/RecipeCard.tsx`:

```tsx
import { Heart } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useToggleFavourite } from '../../hooks/useRecipes'
import type { Recipe } from '../../types/app'

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  const navigate = useNavigate()
  const { mutate: toggleFav } = useToggleFavourite()
  return (
    <div onClick={() => navigate(`/recipes/${recipe.id}`)}
      className="bg-warm-card border border-warm-border rounded-xl overflow-hidden cursor-pointer active:opacity-90 transition-opacity duration-150">
      <div className="aspect-square bg-warm-surface relative">
        {recipe.image_url
          ? <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" loading="lazy" />
          : <div className="w-full h-full flex items-center justify-center text-4xl">🍽</div>
        }
        <button onClick={e => { e.stopPropagation(); toggleFav({ id: recipe.id, is_favourite: !recipe.is_favourite }) }}
          aria-label={recipe.is_favourite ? 'Remove from favourites' : 'Add to favourites'}
          className="absolute top-2 right-2 min-w-[36px] min-h-[36px] flex items-center justify-center bg-warm-base/70 rounded-full cursor-pointer touch-manipulation">
          <Heart className={`w-4 h-4 ${recipe.is_favourite ? 'fill-warm-accent text-warm-accent' : 'text-warm-secondary'}`} />
        </button>
      </div>
      <div className="p-3">
        <h3 className="font-sans font-semibold text-warm-primary text-sm leading-snug line-clamp-2">{recipe.title}</h3>
        <p className="font-sans text-warm-secondary text-xs mt-1">
          {[recipe.cook_time_mins ? `${recipe.cook_time_mins} min` : '', recipe.rating ? '★'.repeat(recipe.rating) : ''].filter(Boolean).join(' · ')}
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `SearchBar`**

Create `src/components/search/SearchBar.tsx`:

```tsx
import { Search, X } from 'lucide-react'

interface SearchBarProps { value: string; onChange: (v: string) => void }

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-muted" aria-hidden="true" />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder="Search recipes…"
        className="w-full bg-warm-surface border border-warm-border rounded-xl pl-9 pr-9 py-3 text-warm-primary font-sans text-base placeholder:text-warm-muted focus:outline-none focus:border-warm-accent transition-colors min-h-[44px]" />
      {value && (
        <button onClick={() => onChange('')} aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer touch-manipulation">
          <X className="w-4 h-4 text-warm-muted" />
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create `FilterChips`**

Create `src/components/search/FilterChips.tsx`:

```tsx
import { X } from 'lucide-react'
import type { RecipeFilters } from '../../utils/recipeFilter'

interface FilterChipsProps { filters: RecipeFilters; allCategories: string[]; onChange: (f: RecipeFilters) => void }

export function FilterChips({ filters, allCategories, onChange }: FilterChipsProps) {
  const chip = (active: boolean) =>
    `font-sans text-xs px-3 py-1.5 rounded-full border min-h-[36px] cursor-pointer touch-manipulation transition-colors ${active ? 'bg-warm-accent text-white border-warm-accent' : 'bg-warm-surface text-warm-secondary border-warm-border'}`

  const activeCount = [filters.minRating, filters.favouritesOnly, filters.categories?.length].filter(Boolean).length
  return (
    <div className="flex flex-wrap gap-2">
      {[1,2,3,4,5].map(n => (
        <button key={n} onClick={() => onChange({ ...filters, minRating: filters.minRating === n ? undefined : n })}
          className={chip(filters.minRating === n)}>{'★'.repeat(n)}+</button>
      ))}
      <button onClick={() => onChange({ ...filters, favouritesOnly: !filters.favouritesOnly })}
        className={chip(!!filters.favouritesOnly)}>♥ Favourites</button>
      {allCategories.map(cat => {
        const active = (filters.categories ?? []).includes(cat)
        return (
          <button key={cat} onClick={() => {
            const next = active ? (filters.categories ?? []).filter(c => c !== cat) : [...(filters.categories ?? []), cat]
            onChange({ ...filters, categories: next.length ? next : undefined })
          }} className={chip(active)}>{cat}</button>
        )
      })}
      {activeCount > 0 && (
        <button onClick={() => onChange({})}
          className="font-sans text-xs px-3 py-1.5 rounded-full border min-h-[36px] bg-warm-surface text-warm-secondary border-warm-border cursor-pointer touch-manipulation flex items-center gap-1">
          <X className="w-3 h-3" /> Clear
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create `RecipeGrid`**

Create `src/components/recipes/RecipeGrid.tsx`:

```tsx
import { RecipeCard } from './RecipeCard'
import type { Recipe } from '../../types/app'

export function RecipeGrid({ recipes, isLoading }: { recipes: Recipe[]; isLoading: boolean }) {
  if (isLoading) return (
    <div className="grid grid-cols-2 gap-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-warm-card border border-warm-border rounded-xl overflow-hidden animate-pulse">
          <div className="aspect-square bg-warm-surface" />
          <div className="p-3 space-y-2">
            <div className="h-3 bg-warm-surface rounded w-3/4" />
            <div className="h-2 bg-warm-surface rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
  if (!recipes.length) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="font-serif text-warm-secondary text-lg mb-2">No recipes found</p>
      <p className="font-sans text-warm-muted text-sm">Try adjusting your search or filters</p>
    </div>
  )
  return (
    <div className="grid grid-cols-2 gap-3">
      {recipes.map(r => <RecipeCard key={r.id} recipe={r} />)}
    </div>
  )
}
```

- [ ] **Step 5: Update `RecipesPage`**

Replace `src/pages/RecipesPage.tsx`:

```tsx
import { useState, useMemo } from 'react'
import { useRecipes } from '../hooks/useRecipes'
import { filterRecipes, type RecipeFilters } from '../utils/recipeFilter'
import { RecipeGrid } from '../components/recipes/RecipeGrid'
import { SearchBar } from '../components/search/SearchBar'
import { FilterChips } from '../components/search/FilterChips'

export function RecipesPage() {
  const { data: recipes = [], isLoading } = useRecipes()
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<RecipeFilters>({})
  const allCategories = useMemo(() => [...new Set(recipes.flatMap(r => r.categories))].sort(), [recipes])
  const filtered = useMemo(() => filterRecipes(recipes, { ...filters, search }), [recipes, filters, search])
  return (
    <div className="px-4 pt-4 flex flex-col gap-3">
      <h1 className="font-serif text-2xl font-bold text-warm-primary">Recipes</h1>
      <SearchBar value={search} onChange={setSearch} />
      <FilterChips filters={filters} allCategories={allCategories} onChange={setFilters} />
      <RecipeGrid recipes={filtered} isLoading={isLoading} />
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/
git commit -m "feat: recipe grid, search, filter chips"
```

---

### Task 9: Recipe Detail Page

**Files:**
- Create: `src/components/recipes/ServingScaler.tsx`
- Create: `src/pages/RecipeDetailPage.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create `ServingScaler`**

Create `src/components/recipes/ServingScaler.tsx`:

```tsx
import { useState } from 'react'
import { scaleIngredients } from '../../utils/servingScaler'

export function ServingScaler({ ingredients, baseServings }: { ingredients: string; baseServings: number | null }) {
  const [multiplier, setMultiplier] = useState(1)
  return (
    <div>
      <div className="flex items-center mb-3">
        <span className="font-sans font-700 text-warm-secondary text-[10px] uppercase tracking-wider">Servings</span>
        <div className="flex gap-1 ml-auto">
          {[0.5, 1, 2, 3, 4].map(n => (
            <button key={n} onClick={() => setMultiplier(n)}
              className={`font-sans text-xs px-2.5 py-1.5 rounded-lg min-h-[36px] min-w-[36px] cursor-pointer touch-manipulation transition-colors ${
                multiplier === n ? 'bg-warm-accent text-white' : 'bg-warm-surface text-warm-secondary border border-warm-border'
              }`}>
              {n === 1 ? (baseServings ?? '1×') : `${n}×`}
            </button>
          ))}
        </div>
      </div>
      <div className="font-sans text-warm-primary text-[15px] leading-[1.7] whitespace-pre-line">
        {scaleIngredients(ingredients, multiplier)}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `RecipeDetailPage`**

Create `src/pages/RecipeDetailPage.tsx`:

```tsx
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Pencil, Trash2, Heart } from 'lucide-react'
import { useRecipe } from '../hooks/useRecipe'
import { useDeleteRecipe, useToggleFavourite } from '../hooks/useRecipes'
import { ServingScaler } from '../components/recipes/ServingScaler'

export function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: recipe, isLoading } = useRecipe(id!)
  const { mutateAsync: deleteRecipe, isPending: isDeleting } = useDeleteRecipe()
  const { mutate: toggleFav } = useToggleFavourite()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [section, setSection] = useState<'ingredients' | 'instructions' | 'notes'>('ingredients')

  if (isLoading || !recipe) return <div className="min-h-screen bg-warm-base" />

  return (
    <div className="bg-warm-base min-h-screen">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={() => navigate(-1)} aria-label="Go back"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 cursor-pointer touch-manipulation">
          <ChevronLeft className="w-5 h-5 text-warm-primary" />
        </button>
        <div className="flex">
          <button onClick={() => toggleFav({ id: recipe.id, is_favourite: !recipe.is_favourite })}
            aria-label={recipe.is_favourite ? 'Remove from favourites' : 'Add to favourites'}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer touch-manipulation">
            <Heart className={`w-5 h-5 ${recipe.is_favourite ? 'fill-warm-accent text-warm-accent' : 'text-warm-secondary'}`} />
          </button>
          <button onClick={() => navigate(`/recipes/${id}/edit`)} aria-label="Edit recipe"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer touch-manipulation">
            <Pencil className="w-5 h-5 text-warm-secondary" />
          </button>
          <button onClick={() => setConfirmDelete(true)} aria-label="Delete recipe"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer touch-manipulation">
            <Trash2 className="w-5 h-5 text-red-600" />
          </button>
        </div>
      </div>
      {recipe.image_url && (
        <div className="w-full aspect-video bg-warm-surface">
          <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" loading="lazy" />
        </div>
      )}
      <div className="px-4 pt-4 pb-2">
        <h1 className="font-serif text-2xl font-bold text-warm-primary mb-1">{recipe.title}</h1>
        <div className="flex flex-wrap gap-3 font-sans text-warm-secondary text-sm">
          {recipe.prep_time_mins && <span>Prep {recipe.prep_time_mins} min</span>}
          {recipe.cook_time_mins && <span>Cook {recipe.cook_time_mins} min</span>}
          {recipe.servings && <span>{recipe.servings} servings</span>}
          {recipe.rating && <span>{'★'.repeat(recipe.rating)}</span>}
        </div>
        {recipe.categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {recipe.categories.map(c => (
              <span key={c} className="bg-warm-surface text-warm-secondary font-sans text-xs px-2 py-1 rounded-full">{c}</span>
            ))}
          </div>
        )}
      </div>
      <div className="sticky top-0 z-10 bg-warm-base border-b border-warm-border flex px-4 gap-1 pt-1">
        {(['ingredients', 'instructions', 'notes'] as const).map(s => (
          <button key={s} onClick={() => setSection(s)}
            className={`font-sans text-sm font-semibold pb-2 px-1 border-b-2 min-h-[44px] cursor-pointer touch-manipulation transition-colors capitalize ${
              section === s ? 'border-warm-accent text-warm-accent' : 'border-transparent text-warm-secondary'
            }`}>{s}</button>
        ))}
      </div>
      <div className="px-4 pt-4 pb-8">
        {section === 'ingredients' && <ServingScaler ingredients={recipe.ingredients} baseServings={recipe.servings} />}
        {section === 'instructions' && <div className="font-sans text-warm-primary text-[15px] leading-[1.7] whitespace-pre-line">{recipe.instructions}</div>}
        {section === 'notes' && <div className="font-sans text-warm-primary text-[15px] leading-[1.7] whitespace-pre-line">{recipe.comments || <span className="text-warm-muted">No notes yet.</span>}</div>}
      </div>
      {confirmDelete && (
        <div className="fixed inset-0 z-40 bg-warm-primary/30 backdrop-blur-sm flex items-end">
          <div className="bg-warm-card w-full rounded-t-2xl p-6 flex flex-col gap-4" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
            <h2 className="font-serif text-lg font-bold text-warm-primary">Delete Recipe?</h2>
            <p className="font-sans text-warm-secondary text-sm">This cannot be undone.</p>
            <button onClick={async () => { await deleteRecipe(recipe.id); navigate('/recipes') }} disabled={isDeleting}
              className="w-full bg-red-600 text-white font-sans font-semibold text-sm py-3 rounded-xl min-h-[44px] active:opacity-80 cursor-pointer touch-manipulation">
              {isDeleting ? 'Deleting…' : 'Delete'}
            </button>
            <button onClick={() => setConfirmDelete(false)}
              className="w-full border border-warm-border text-warm-primary font-sans text-sm py-3 rounded-xl min-h-[44px] bg-warm-card active:bg-warm-surface cursor-pointer touch-manipulation">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Add route in `src/App.tsx`**

```tsx
import { RecipeDetailPage } from './pages/RecipeDetailPage'
// inside protected children:
{ path: '/recipes/:id', element: <RecipeDetailPage /> },
```

- [ ] **Step 4: Commit**

```bash
git add src/
git commit -m "feat: recipe detail page with serving scaler"
```

---

### Task 10: Vercel Scrape Proxy + Gemini Extraction

**Files:**
- Create: `api/scrape.ts`
- Create: `src/lib/gemini.ts`
- Create: `src/hooks/useGeminiExtract.ts`
- Create: `src/components/recipes/ClipboardBanner.tsx`

- [ ] **Step 1: Create `api/scrape.ts` (Vercel serverless)**

Create `api/scrape.ts`:

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = req.query.url as string
  if (!url || !/^https?:\/\//.test(url)) {
    return res.status(400).json({ error: 'Invalid URL' })
  }
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RecipeScraper/1.0)' },
      signal: AbortSignal.timeout(10_000),
    })
    const html = await response.text()
    return res.status(200).json({ html: html.slice(0, 150_000) })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch URL' })
  }
}
```

Install Vercel types:

```bash
npm install -D @vercel/node
```

- [ ] **Step 2: Create `src/lib/gemini.ts`**

Create `src/lib/gemini.ts`:

```ts
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function callGemini(prompt: string, key: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(key)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  const result = await model.generateContent(prompt)
  return result.response.text()
}

export interface ExtractedRecipe {
  title?: string
  ingredients?: string
  instructions?: string
  image_url?: string
  cook_time_mins?: number
  prep_time_mins?: number
  servings?: number
}

export async function extractRecipe(html: string, key: string): Promise<ExtractedRecipe> {
  const prompt = `Extract the recipe from the following HTML and return ONLY valid JSON with these fields (omit any field you cannot find):
{
  "title": string,
  "ingredients": string (one ingredient per line with quantities),
  "instructions": string (numbered steps, one per line),
  "image_url": string (absolute URL to the main recipe image),
  "cook_time_mins": number,
  "prep_time_mins": number,
  "servings": number
}

HTML (truncated):
${html.slice(0, 80_000)}`

  const text = await callGemini(prompt, key)
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON in Gemini response')
  return JSON.parse(match[0]) as ExtractedRecipe
}
```

- [ ] **Step 3: Create `useGeminiExtract` hook**

Create `src/hooks/useGeminiExtract.ts`:

```ts
import { useState } from 'react'
import { extractRecipe, type ExtractedRecipe } from '../lib/gemini'

interface ExtractionState {
  isExtracting: boolean
  extracted: ExtractedRecipe | null
  error: string | null
  hasPartialData: boolean
}

export function useGeminiExtract(geminiKey: string | null) {
  const [state, setState] = useState<ExtractionState>({
    isExtracting: false, extracted: null, error: null, hasPartialData: false,
  })

  const extract = async (url: string) => {
    if (!geminiKey) return
    setState({ isExtracting: true, extracted: null, error: null, hasPartialData: false })
    try {
      const res = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`)
      if (!res.ok) throw new Error('Could not fetch the URL')
      const { html } = await res.json()
      const data = await extractRecipe(html, geminiKey)
      const required: (keyof ExtractedRecipe)[] = ['title', 'ingredients', 'instructions']
      const hasPartialData = required.some(k => !data[k])
      setState({ isExtracting: false, extracted: data, error: null, hasPartialData })
    } catch (err) {
      setState({ isExtracting: false, extracted: null, error: (err as Error).message, hasPartialData: false })
    }
  }

  return { ...state, extract }
}
```

- [ ] **Step 4: Create `ClipboardBanner`**

Create `src/components/recipes/ClipboardBanner.tsx`:

```tsx
import { Link } from 'lucide-react'

interface ClipboardBannerProps {
  url: string
  onExtract: (url: string) => void
  onDismiss: () => void
}

export function ClipboardBanner({ url, onExtract, onDismiss }: ClipboardBannerProps) {
  return (
    <div className="flex items-center gap-3 bg-warm-surface border border-warm-border rounded-xl px-4 py-3">
      <Link className="w-4 h-4 text-warm-accent flex-shrink-0" aria-hidden="true" />
      <p className="font-sans text-sm text-warm-secondary flex-1 min-w-0 truncate">
        Found a link — extract recipe?
      </p>
      <div className="flex gap-2 flex-shrink-0">
        <button onClick={() => onExtract(url)}
          className="font-sans text-sm font-semibold text-warm-accent min-h-[36px] px-2 cursor-pointer touch-manipulation">
          Extract
        </button>
        <button onClick={onDismiss} aria-label="Dismiss"
          className="font-sans text-sm text-warm-muted min-h-[36px] px-2 cursor-pointer touch-manipulation">
          ✕
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Wire extraction into `AddRecipePage`**

Update `src/pages/AddRecipePage.tsx` to add the URL extraction slot in the form's `topSlot`:

```tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Sparkles } from 'lucide-react'
import { RecipeForm } from '../components/recipes/RecipeForm'
import { ClipboardBanner } from '../components/recipes/ClipboardBanner'
import { GeminiKeyBanner } from '../components/auth/GeminiKeyBanner'
import { useAddRecipe } from '../hooks/useRecipes'
import { useGeminiExtract } from '../hooks/useGeminiExtract'
import { useGeminiKey } from '../contexts/GeminiKeyContext'

export function AddRecipePage() {
  const navigate = useNavigate()
  const { mutateAsync, isPending } = useAddRecipe()
  const { geminiKey } = useGeminiKey()
  const { extract, isExtracting, extracted, error, hasPartialData } = useGeminiExtract(geminiKey)
  const [urlInput, setUrlInput] = useState('')
  const [clipboardUrl, setClipboardUrl] = useState<string | null>(null)
  const [formKey, setFormKey] = useState(0)

  useEffect(() => {
    navigator.clipboard?.readText().then(text => {
      if (/^https?:\/\//.test(text.trim())) setClipboardUrl(text.trim())
    }).catch(() => {})
  }, [])

  const handleExtract = async (url: string) => {
    setClipboardUrl(null)
    await extract(url)
  }

  const topSlot = (
    <div className="flex flex-col gap-3">
      {clipboardUrl && (
        <ClipboardBanner url={clipboardUrl} onExtract={handleExtract} onDismiss={() => setClipboardUrl(null)} />
      )}
      <div className="flex gap-2">
        <input value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="Paste recipe URL…"
          className="flex-1 bg-warm-surface border border-warm-border rounded-lg px-3 py-3 text-warm-primary font-sans text-base placeholder:text-warm-muted focus:outline-none focus:border-warm-accent transition-colors min-h-[44px]" />
        {geminiKey ? (
          <button type="button" onClick={() => handleExtract(urlInput)} disabled={!urlInput || isExtracting}
            className="bg-warm-accent text-white font-sans font-semibold text-sm px-3 py-2 rounded-lg min-h-[44px] flex items-center gap-1.5 active:opacity-80 disabled:opacity-50 cursor-pointer touch-manipulation">
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            {isExtracting ? 'Extracting…' : 'Extract'}
          </button>
        ) : (
          <div className="flex-1"><GeminiKeyBanner /></div>
        )}
      </div>
      {error && <p className="font-sans text-sm text-red-600">{error}. Fill in the form manually.</p>}
      {hasPartialData && <p className="font-sans text-sm text-warm-secondary bg-warm-surface border border-warm-border rounded-lg px-3 py-2">Some fields couldn't be extracted — please review before saving.</p>}
    </div>
  )

  return (
    <div className="bg-warm-base min-h-screen">
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <button onClick={() => navigate(-1)} aria-label="Go back"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 cursor-pointer touch-manipulation">
          <ChevronLeft className="w-5 h-5 text-warm-primary" />
        </button>
        <h1 className="font-serif text-xl font-bold text-warm-primary">Add Recipe</h1>
      </div>
      <RecipeForm
        key={formKey}
        initialData={extracted ?? undefined}
        topSlot={topSlot}
        submitLabel="Save Recipe"
        isSubmitting={isPending}
        onSubmit={async (data) => { await mutateAsync(data); navigate('/recipes') }}
      />
    </div>
  )
}
```

- [ ] **Step 6: Create `ShareTargetPage`**

Create `src/pages/ShareTargetPage.tsx`:

```tsx
import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export function ShareTargetPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const redirected = useRef(false)

  useEffect(() => {
    if (redirected.current) return
    redirected.current = true
    const url = params.get('url')
    navigate('/recipes/new', { state: { sharedUrl: url }, replace: true })
  }, [navigate, params])

  return <div className="min-h-screen bg-warm-base" />
}
```

Update `AddRecipePage` to read `location.state?.sharedUrl` and pre-fill + auto-extract:

```tsx
import { useLocation } from 'react-router-dom'
// inside AddRecipePage, after the useGeminiExtract line:
const location = useLocation()
const sharedUrl = (location.state as { sharedUrl?: string })?.sharedUrl
useEffect(() => {
  if (sharedUrl && geminiKey) {
    setUrlInput(sharedUrl)
    handleExtract(sharedUrl)
  }
}, [sharedUrl]) // eslint-disable-line react-hooks/exhaustive-deps
```

Add route in `src/App.tsx`:

```tsx
import { ShareTargetPage } from './pages/ShareTargetPage'
// inside protected children:
{ path: '/share-target', element: <ShareTargetPage /> },
```

- [ ] **Step 7: Commit**

```bash
git add api/ src/
git commit -m "feat: Gemini recipe extraction + clipboard + share target"
```

---

### Task 11: Meal Plan Hook + Planner Page

**Files:**
- Create: `src/hooks/useMealPlan.ts`
- Create: `src/components/planner/RecipePicker.tsx`
- Create: `src/components/planner/MealSlot.tsx`
- Create: `src/components/planner/WeekGrid.tsx`
- Modify: `src/pages/PlannerPage.tsx`

- [ ] **Step 1: Create `useMealPlan` hook**

Create `src/hooks/useMealPlan.ts`:

```ts
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
      const { error } = await supabase
        .from('meal_plan_slots')
        .upsert({ slot_date, meal_type, recipe_id }, { onConflict: 'user_id,slot_date,meal_type' })
      if (error) throw error
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['meal-plan', getMondayOf(v.slot_date)] }),
  })
}

export function useRemoveMealSlot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, slot_date }: { id: string; slot_date: string }) => {
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
```

- [ ] **Step 2: Create `RecipePicker` bottom sheet**

Create `src/components/planner/RecipePicker.tsx`:

```tsx
import { useState } from 'react'
import { X, Search } from 'lucide-react'
import { useRecipes } from '../../hooks/useRecipes'
import type { Recipe } from '../../types/app'

interface RecipePickerProps {
  onSelect: (recipe: Recipe) => void
  onClose: () => void
}

export function RecipePicker({ onSelect, onClose }: RecipePickerProps) {
  const { data: recipes = [] } = useRecipes()
  const [search, setSearch] = useState('')
  const filtered = recipes.filter(r => r.title.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="fixed inset-0 z-40 flex items-end">
      <div className="absolute inset-0 bg-warm-primary/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-warm-card w-full rounded-t-2xl flex flex-col max-h-[80vh]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="w-8 h-1 bg-warm-border rounded-full mx-auto mt-3 mb-2" />
        <div className="flex items-center justify-between px-4 pb-3">
          <h2 className="font-serif text-lg font-bold text-warm-primary">Choose Recipe</h2>
          <button onClick={onClose} aria-label="Close"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer touch-manipulation">
            <X className="w-5 h-5 text-warm-secondary" />
          </button>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-muted" aria-hidden="true" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
              className="w-full bg-warm-surface border border-warm-border rounded-xl pl-9 pr-4 py-3 text-warm-primary font-sans text-base placeholder:text-warm-muted focus:outline-none focus:border-warm-accent transition-colors min-h-[44px]" />
          </div>
        </div>
        <div className="overflow-y-auto flex-1 px-4 pb-4 flex flex-col gap-1">
          {filtered.map(r => (
            <button key={r.id} onClick={() => onSelect(r)}
              className="flex items-center gap-3 p-3 rounded-xl bg-warm-base active:bg-warm-surface transition-colors min-h-[56px] cursor-pointer touch-manipulation text-left w-full">
              <div className="w-10 h-10 rounded-lg bg-warm-surface overflow-hidden flex-shrink-0">
                {r.image_url
                  ? <img src={r.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  : <div className="w-full h-full flex items-center justify-center text-lg">🍽</div>
                }
              </div>
              <span className="font-sans text-sm text-warm-primary line-clamp-2">{r.title}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `MealSlot`**

Create `src/components/planner/MealSlot.tsx`:

```tsx
import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { RecipePicker } from './RecipePicker'
import { useAddMealSlot, useRemoveMealSlot } from '../../hooks/useMealPlan'
import type { MealPlanSlot, Recipe } from '../../types/app'

interface MealSlotProps {
  date: string
  mealType: 'lunch' | 'dinner'
  slot?: MealPlanSlot
}

export function MealSlot({ date, mealType, slot }: MealSlotProps) {
  const [picking, setPicking] = useState(false)
  const { mutate: addSlot } = useAddMealSlot()
  const { mutate: removeSlot } = useRemoveMealSlot()

  const handleSelect = (recipe: Recipe) => {
    addSlot({ slot_date: date, meal_type: mealType, recipe_id: recipe.id })
    setPicking(false)
  }

  if (slot?.recipe) {
    return (
      <>
        <div className="relative bg-warm-surface rounded-lg overflow-hidden min-h-[52px] flex items-center px-2 gap-2">
          {slot.recipe.image_url && (
            <div className="w-8 h-8 rounded flex-shrink-0 overflow-hidden">
              <img src={slot.recipe.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
          )}
          <span className="font-sans text-xs text-warm-primary line-clamp-2 flex-1 leading-tight">{slot.recipe.title}</span>
          <button onClick={() => removeSlot({ id: slot.id, slot_date: date })}
            aria-label="Remove from plan"
            className="min-w-[28px] min-h-[28px] flex items-center justify-center flex-shrink-0 cursor-pointer touch-manipulation">
            <X className="w-3.5 h-3.5 text-warm-muted" />
          </button>
        </div>
        {picking && <RecipePicker onSelect={handleSelect} onClose={() => setPicking(false)} />}
      </>
    )
  }

  return (
    <>
      <button onClick={() => setPicking(true)}
        className="w-full min-h-[52px] border-2 border-dashed border-warm-border rounded-lg flex items-center justify-center cursor-pointer touch-manipulation active:bg-warm-surface transition-colors"
        aria-label={`Add ${mealType} for ${date}`}>
        <Plus className="w-4 h-4 text-warm-muted" />
      </button>
      {picking && <RecipePicker onSelect={handleSelect} onClose={() => setPicking(false)} />}
    </>
  )
}
```

- [ ] **Step 4: Create `WeekGrid`**

Create `src/components/planner/WeekGrid.tsx`:

```tsx
import { useMealPlan } from '../../hooks/useMealPlan'
import { MealSlot } from './MealSlot'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface WeekGridProps { weekStart: string }

export function WeekGrid({ weekStart }: WeekGridProps) {
  const { data: slots = [] } = useMealPlan(weekStart)

  const days = DAY_NAMES.map((name, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return { name, date: d.toISOString().split('T')[0], display: `${name} ${d.getDate()}` }
  })

  const getSlot = (date: string, mealType: 'lunch' | 'dinner') =>
    slots.find(s => s.slot_date === date && s.meal_type === mealType)

  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-[100px_1fr_1fr] gap-2 px-1 pb-1">
        <div />
        <span className="font-sans font-700 text-warm-secondary text-[10px] uppercase tracking-wider text-center">Lunch</span>
        <span className="font-sans font-700 text-warm-secondary text-[10px] uppercase tracking-wider text-center">Dinner</span>
      </div>
      {days.map(({ display, date }) => (
        <div key={date} className="grid grid-cols-[100px_1fr_1fr] gap-2 items-start">
          <div className="min-h-[52px] flex items-center">
            <span className="font-sans text-sm font-semibold text-warm-primary">{display}</span>
          </div>
          <MealSlot date={date} mealType="lunch" slot={getSlot(date, 'lunch')} />
          <MealSlot date={date} mealType="dinner" slot={getSlot(date, 'dinner')} />
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Update `PlannerPage`**

Replace `src/pages/PlannerPage.tsx`:

```tsx
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { WeekGrid } from '../components/planner/WeekGrid'
import { getMondayOf } from '../hooks/useMealPlan'

function formatWeekLabel(monday: string): string {
  const end = new Date(monday)
  end.setDate(end.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return `${fmt(new Date(monday))} – ${fmt(end)}`
}

export function PlannerPage() {
  const [weekStart, setWeekStart] = useState(() => getMondayOf(new Date().toISOString().split('T')[0]))

  const prev = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() - 7)
    setWeekStart(d.toISOString().split('T')[0])
  }
  const next = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 7)
    setWeekStart(d.toISOString().split('T')[0])
  }

  return (
    <div className="px-4 pt-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-warm-primary">Planner</h1>
        <div className="flex items-center gap-1">
          <button onClick={prev} aria-label="Previous week"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer touch-manipulation">
            <ChevronLeft className="w-5 h-5 text-warm-secondary" />
          </button>
          <span className="font-sans text-sm text-warm-secondary">{formatWeekLabel(weekStart)}</span>
          <button onClick={next} aria-label="Next week"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer touch-manipulation">
            <ChevronRight className="w-5 h-5 text-warm-secondary" />
          </button>
        </div>
      </div>
      <WeekGrid weekStart={weekStart} />
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/
git commit -m "feat: meal planner with week grid and recipe picker"
```

---

### Task 12: Grocery List

**Files:**
- Create: `src/hooks/useGroceryList.ts`
- Create: `src/components/grocery/GroceryItem.tsx`
- Create: `src/components/grocery/GroceryGroup.tsx`
- Modify: `src/pages/GroceryPage.tsx`

- [ ] **Step 1: Create `useGroceryList` hook**

Create `src/hooks/useGroceryList.ts`:

```ts
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
      // Delete existing items for this week
      await supabase.from('grocery_items').delete().eq('week_start', weekStart)

      // Fetch meal plan slots with recipe ingredients
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      const { data: slots, error } = await supabase
        .from('meal_plan_slots')
        .select('*, recipe:recipes(id, title, ingredients)')
        .gte('slot_date', weekStart)
        .lte('slot_date', weekEnd.toISOString().split('T')[0])
      if (error) throw error

      // Build items, grouped per recipe slot (no merging)
      const items: Omit<GroceryItem, 'id' | 'user_id' | 'created_at' | 'recipe'>[] = []
      let order = 0
      for (const slot of (slots as (MealPlanSlot & { recipe: { id: string; title: string; ingredients: string } })[]) ?? []) {
        if (!slot.recipe) continue
        const lines = slot.recipe.ingredients.split('\n').filter(l => l.trim())
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

      if (items.length) {
        const { error: insertError } = await supabase.from('grocery_items').insert(items)
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
      const { error } = await supabase.from('grocery_items').insert({
        week_start: weekStart, recipe_id: null, ingredient_text: text, is_checked: false, sort_order: 9999,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['grocery', weekStart] }),
  })
}
```

- [ ] **Step 2: Create `GroceryItem`**

Create `src/components/grocery/GroceryItem.tsx`:

```tsx
import { useToggleGroceryItem } from '../../hooks/useGroceryList'
import type { GroceryItem as GroceryItemType } from '../../types/app'

export function GroceryItem({ item }: { item: GroceryItemType }) {
  const { mutate: toggle } = useToggleGroceryItem()
  return (
    <button
      onClick={() => toggle({ id: item.id, is_checked: !item.is_checked, week_start: item.week_start })}
      className="flex items-center gap-3 w-full min-h-[44px] px-3 py-2 cursor-pointer touch-manipulation active:bg-warm-surface rounded-lg transition-colors text-left"
    >
      <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
        item.is_checked ? 'bg-warm-accent border-warm-accent' : 'border-warm-accent'
      }`}>
        {item.is_checked && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className={`font-sans text-base flex-1 ${item.is_checked ? 'line-through text-warm-muted' : 'text-warm-primary'}`}>
        {item.ingredient_text}
      </span>
    </button>
  )
}
```

- [ ] **Step 3: Create `GroceryGroup`**

Create `src/components/grocery/GroceryGroup.tsx`:

```tsx
import { GroceryItem } from './GroceryItem'
import type { GroceryItem as GroceryItemType } from '../../types/app'

interface GroceryGroupProps {
  title: string
  items: GroceryItemType[]
}

export function GroceryGroup({ title, items }: GroceryGroupProps) {
  return (
    <div>
      <span className="font-sans font-700 text-warm-secondary text-[10px] uppercase tracking-wider block px-3 mb-1">
        {title}
      </span>
      <div className="bg-warm-card border border-warm-border rounded-xl overflow-hidden">
        {items.map((item, i) => (
          <div key={item.id}>
            {i > 0 && <div className="border-t border-warm-border mx-3" />}
            <GroceryItem item={item} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Update `GroceryPage`**

Replace `src/pages/GroceryPage.tsx`:

```tsx
import { useState } from 'react'
import { useGroceryList, useGenerateGroceryList, useAddGroceryItem } from '../hooks/useGroceryList'
import { getMondayOf } from '../hooks/useMealPlan'
import { GroceryGroup } from '../components/grocery/GroceryGroup'
import type { GroceryItem } from '../types/app'

export function GroceryPage() {
  const weekStart = getMondayOf(new Date().toISOString().split('T')[0])
  const { data: items = [], isLoading } = useGroceryList(weekStart)
  const { mutateAsync: generate, isPending: isGenerating } = useGenerateGroceryList(weekStart)
  const { mutate: addItem } = useAddGroceryItem(weekStart)
  const [confirmRegen, setConfirmRegen] = useState(false)
  const [newItemText, setNewItemText] = useState('')

  // Group by recipe
  const grouped = new Map<string, { title: string; items: GroceryItem[] }>()
  const manual: GroceryItem[] = []
  for (const item of items) {
    if (!item.recipe_id) { manual.push(item); continue }
    const key = item.recipe_id
    if (!grouped.has(key)) grouped.set(key, { title: item.recipe?.title ?? 'Recipe', items: [] })
    grouped.get(key)!.items.push(item)
  }

  const handleGenerate = async () => {
    setConfirmRegen(false)
    await generate()
  }

  const handleAddItem = () => {
    if (newItemText.trim()) {
      addItem(newItemText.trim())
      setNewItemText('')
    }
  }

  return (
    <div className="px-4 pt-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-warm-primary">Grocery</h1>
        <button
          onClick={() => items.length > 0 ? setConfirmRegen(true) : handleGenerate()}
          disabled={isGenerating}
          className="bg-warm-accent text-white font-sans font-semibold text-sm px-3 py-2 rounded-lg min-h-[44px] active:opacity-80 disabled:opacity-50 cursor-pointer touch-manipulation">
          {isGenerating ? 'Generating…' : 'Generate list'}
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-warm-surface rounded-xl animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="font-serif text-warm-secondary text-lg mb-2">No grocery list yet</p>
          <p className="font-sans text-warm-muted text-sm">Add recipes to your meal plan first, then generate the list</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {[...grouped.entries()].map(([recipeId, group]) => (
            <GroceryGroup key={recipeId} title={group.title} items={group.items} />
          ))}
          {manual.length > 0 && <GroceryGroup title="Added manually" items={manual} />}
        </div>
      )}

      {/* Add manual item */}
      <div className="flex gap-2 mt-2">
        <input value={newItemText} onChange={e => setNewItemText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAddItem() }}
          placeholder="Add item manually…"
          className="flex-1 bg-warm-surface border border-warm-border rounded-lg px-3 py-3 text-warm-primary font-sans text-base placeholder:text-warm-muted focus:outline-none focus:border-warm-accent transition-colors min-h-[44px]" />
        <button onClick={handleAddItem} disabled={!newItemText.trim()}
          className="bg-warm-accent text-white font-sans font-semibold text-sm px-3 py-2 rounded-lg min-h-[44px] active:opacity-80 disabled:opacity-50 cursor-pointer touch-manipulation">
          Add
        </button>
      </div>

      {/* Confirm regenerate dialog */}
      {confirmRegen && (
        <div className="fixed inset-0 z-40 bg-warm-primary/30 backdrop-blur-sm flex items-end">
          <div className="bg-warm-card w-full rounded-t-2xl p-6 flex flex-col gap-4"
            style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
            <h2 className="font-serif text-lg font-bold text-warm-primary">Regenerate list?</h2>
            <p className="font-sans text-warm-secondary text-sm">This will replace the current grocery list.</p>
            <button onClick={handleGenerate}
              className="w-full bg-warm-accent text-white font-sans font-semibold text-sm py-3 rounded-xl min-h-[44px] cursor-pointer touch-manipulation">
              Regenerate
            </button>
            <button onClick={() => setConfirmRegen(false)}
              className="w-full border border-warm-border text-warm-primary font-sans text-sm py-3 rounded-xl min-h-[44px] bg-warm-card active:bg-warm-surface cursor-pointer touch-manipulation">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "feat: grocery list with generation and manual items"
```

---

### Task 13: Settings Page + Gemini Key Form

**Files:**
- Create: `src/components/settings/GeminiKeyForm.tsx`
- Modify: `src/pages/SettingsPage.tsx`

- [ ] **Step 1: Create `GeminiKeyForm`**

Create `src/components/settings/GeminiKeyForm.tsx`:

```tsx
import { useState } from 'react'
import { useGeminiKey } from '../../contexts/GeminiKeyContext'

export function GeminiKeyForm() {
  const { geminiKey, setGeminiKey } = useGeminiKey()
  const [input, setInput] = useState(geminiKey ?? '')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const handleSave = async () => {
    if (!input.trim()) return
    setStatus('saving')
    try {
      await setGeminiKey(input.trim())
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 3000)
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label htmlFor="gemini-key" className="font-sans font-700 text-warm-secondary text-[10px] uppercase tracking-wider block mb-1">
          Gemini API Key
        </label>
        <input
          id="gemini-key"
          type="password"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="AIza…"
          className="w-full bg-warm-surface border border-warm-border rounded-lg px-3 py-3 text-warm-primary font-sans text-base placeholder:text-warm-muted focus:outline-none focus:border-warm-accent transition-colors min-h-[44px]"
        />
        <p className="font-sans text-warm-muted text-xs mt-1">
          Used client-side only — never sent to our servers.
        </p>
      </div>
      <button
        onClick={handleSave}
        disabled={status === 'saving' || !input.trim()}
        className="bg-warm-accent text-white font-sans font-semibold text-sm px-4 py-3 rounded-xl min-h-[44px] active:opacity-80 disabled:opacity-50 transition-opacity duration-150 cursor-pointer touch-manipulation"
      >
        {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved ✓' : 'Save Key'}
      </button>
      {status === 'error' && <p className="font-sans text-sm text-red-600">Failed to save. Try again.</p>}
    </div>
  )
}
```

- [ ] **Step 2: Update `SettingsPage`**

Replace `src/pages/SettingsPage.tsx`:

```tsx
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { GeminiKeyForm } from '../components/settings/GeminiKeyForm'

export function SettingsPage() {
  const { user } = useAuth()

  return (
    <div className="px-4 pt-4 flex flex-col gap-6">
      <h1 className="font-serif text-2xl font-bold text-warm-primary">Settings</h1>

      {/* Account */}
      <div className="bg-warm-card border border-warm-border rounded-xl p-4 flex items-center gap-3">
        {user?.user_metadata?.avatar_url && (
          <img src={user.user_metadata.avatar_url} alt="Profile photo"
            className="w-10 h-10 rounded-full" width={40} height={40} />
        )}
        <div>
          <p className="font-sans font-semibold text-warm-primary text-sm">
            {user?.user_metadata?.full_name ?? user?.email ?? 'User'}
          </p>
          <p className="font-sans text-warm-secondary text-xs">Google account</p>
        </div>
      </div>

      {/* Gemini key */}
      <div>
        <h2 className="font-serif text-lg font-semibold text-warm-primary mb-3">AI Features</h2>
        <GeminiKeyForm />
      </div>

      {/* Sign out */}
      <button
        onClick={() => supabase.auth.signOut()}
        className="border border-warm-border text-warm-primary font-sans font-500 text-sm px-4 py-3 rounded-xl min-h-[44px] bg-warm-card active:bg-warm-surface transition-colors duration-150 cursor-pointer touch-manipulation"
      >
        Sign out
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/
git commit -m "feat: settings page with Gemini key form and sign out"
```

---

### Task 14: PWA Manifest + Icons

**Files:**
- Create: `public/manifest.json`
- Modify: `vite.config.ts`
- Modify: `index.html`

- [ ] **Step 1: Create `public/manifest.json`**

```json
{
  "name": "Ragauti",
  "short_name": "Ragauti",
  "description": "Your personal recipe book",
  "theme_color": "#fdf6ee",
  "background_color": "#fdf6ee",
  "display": "standalone",
  "start_url": "/recipes",
  "scope": "/",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ],
  "share_target": {
    "action": "/share-target",
    "method": "GET",
    "params": { "url": "url" }
  }
}
```

- [ ] **Step 2: Add PWA plugin to `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false, // using our own manifest.json
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
})
```

- [ ] **Step 3: Add manifest link to `index.html`**

```html
<link rel="manifest" href="/manifest.json">
<link rel="apple-touch-icon" href="/icons/icon-192.png">
```

- [ ] **Step 4: Add placeholder icons**

Create `public/icons/` directory. Add two PNG icons (192×192 and 512×512) — for development, any PNG will do. For production, create proper icons with the warm terracotta palette (`#c0703a` on `#fdf6ee` background).

- [ ] **Step 5: Run build and verify PWA**

```bash
npm run build
npm run preview
```

Open `http://localhost:4173`. Expected: app installable via browser "Install" prompt, share target registered.

- [ ] **Step 6: Commit**

```bash
git add public/ vite.config.ts index.html
git commit -m "feat: PWA manifest with share target"
```

---

### Task 15: Toast Notifications

**Files:**
- Create: `src/components/Toast.tsx`
- Modify: `src/components/layout/AppShell.tsx`

This provides user feedback on Supabase errors and successful saves (brief, dismissible overlay).

- [ ] **Step 1: Create `Toast` component**

Create `src/components/Toast.tsx`:

```tsx
import { useEffect } from 'react'

export interface ToastMessage {
  id: string
  message: string
  type: 'success' | 'error'
}

interface ToastProps {
  toasts: ToastMessage[]
  onDismiss: (id: string) => void
}

export function Toast({ toasts, onDismiss }: ToastProps) {
  return (
    <div className="fixed top-4 left-4 right-4 z-60 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 3000)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  return (
    <div
      onClick={() => onDismiss(toast.id)}
      className={`pointer-events-auto px-4 py-3 rounded-xl font-sans text-sm text-white shadow-lg cursor-pointer ${
        toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
      }`}
    >
      {toast.message}
    </div>
  )
}
```

- [ ] **Step 2: Create `useToast` hook**

Add to `src/contexts/ToastContext.tsx`:

```tsx
import { createContext, useCallback, useContext, useState } from 'react'
import type { ToastMessage } from '../components/Toast'

interface ToastContextValue {
  toasts: ToastMessage[]
  showToast: (message: string, type?: ToastMessage['type']) => void
}

const ToastContext = createContext<ToastContextValue>({ toasts: [], showToast: () => {} })

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const showToast = useCallback((message: string, type: ToastMessage['type'] = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])
  return <ToastContext.Provider value={{ toasts, showToast }}>{children}</ToastContext.Provider>
}

export const useToast = () => useContext(ToastContext)
```

- [ ] **Step 3: Wire into `AppShell`**

Update `src/components/layout/AppShell.tsx`:

```tsx
import { Toast } from '../Toast'
import { ToastProvider, useToast } from '../../contexts/ToastContext'

function ShellInner() {
  const { toasts } = useToast()
  return (
    <GeminiKeyProvider>
      <div className="min-h-screen bg-warm-base">
        <main className="pb-[calc(60px+env(safe-area-inset-bottom))]">
          <Outlet />
        </main>
        <Fab />
        <TabBar />
        <Toast toasts={toasts} onDismiss={() => {}} />
      </div>
    </GeminiKeyProvider>
  )
}

export function AppShell() {
  return <ToastProvider><ShellInner /></ToastProvider>
}
```

Add `ToastProvider` to `src/main.tsx` (wrap inside `AuthProvider`).

- [ ] **Step 4: Commit**

```bash
git add src/
git commit -m "feat: toast notification system"
```

---

### Task 16: Deploy to Vercel

- [ ] **Step 1: Push to GitHub**

```bash
git remote add origin <your-github-repo-url>
git push -u origin master
```

- [ ] **Step 2: Connect to Vercel**

1. Go to vercel.com → New Project → import the GitHub repo.
2. Framework preset: Vite.
3. Add environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GOOGLE_CLIENT_ID`
4. Deploy.

- [ ] **Step 3: Configure Supabase redirect URLs**

In Supabase dashboard → Authentication → URL Configuration:
- Site URL: `https://your-app.vercel.app`
- Redirect URLs: `https://your-app.vercel.app/recipes`

- [ ] **Step 4: Test on mobile**

Open the deployed URL on iPhone/Android. Install as PWA. Test:
- Google login redirects correctly
- Add a recipe manually
- Extract a recipe from a URL
- Plan a meal
- Generate grocery list
- Share a recipe URL from browser → app opens and extracts

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "chore: production-ready build"
git push
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Task |
|---|---|
| Google OAuth login | Task 2 |
| Profiles table + auto-create | Task 1 |
| Recipe CRUD (add/edit/delete/favourite) | Tasks 6, 7, 9 |
| 2-column grid + search + filter | Task 8 |
| Recipe detail with sticky jump bar | Task 9 |
| Serving scaler | Tasks 4, 9 |
| Gemini URL extraction | Task 10 |
| Clipboard auto-detect | Task 10 |
| PWA Share Target | Tasks 10, 14 |
| GeminiKeyBanner for missing key | Task 2 |
| Meal planner 7-day grid | Task 11 |
| Week navigation | Task 11 |
| Recipe picker bottom sheet | Task 11 |
| Grocery list grouped by recipe | Task 12 |
| Manual grocery items | Task 12 |
| Confirm regenerate dialog | Task 12 |
| Settings + Gemini key + sign out | Task 13 |
| PWA manifest + share target | Task 14 |
| Toast notifications | Task 15 |
| Vercel deploy | Task 16 |
| RLS policies on all tables | Task 1 |
| No server-side Gemini calls | Task 10 (proxy fetches HTML, client sends to Gemini) |
