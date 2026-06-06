-- Each call to "Add to grocery list" gets its own group_id UUID.
-- Rows with the same group_id are displayed as one card in GroceryPage.
-- Nullable so existing rows (without a group) still work.
ALTER TABLE grocery_items ADD COLUMN IF NOT EXISTS group_id uuid;
