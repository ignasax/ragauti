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
