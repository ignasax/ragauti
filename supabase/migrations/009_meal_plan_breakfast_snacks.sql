-- Planner: add breakfast + two snacks per day, and allow 2 options for breakfast/lunch/dinner.
-- meal_type now: breakfast, snack_am (before lunch), lunch, snack_pm (after lunch), dinner.
-- position: 0 = option 1, 1 = option 2 (snacks only use 0).

alter table meal_plan_slots drop constraint if exists meal_plan_slots_meal_type_check;
alter table meal_plan_slots add constraint meal_plan_slots_meal_type_check
  check (meal_type in ('breakfast', 'snack_am', 'lunch', 'snack_pm', 'dinner'));

alter table meal_plan_slots add column if not exists position smallint not null default 0;
alter table meal_plan_slots drop constraint if exists meal_plan_slots_position_check;
alter table meal_plan_slots add constraint meal_plan_slots_position_check
  check (position in (0, 1));

alter table meal_plan_slots drop constraint if exists meal_plan_slots_user_id_slot_date_meal_type_key;
alter table meal_plan_slots drop constraint if exists meal_plan_slots_user_slot_unique;
alter table meal_plan_slots add constraint meal_plan_slots_user_slot_unique
  unique (user_id, slot_date, meal_type, position);
