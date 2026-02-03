CREATE TABLE IF NOT EXISTS lots (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  capacity INTEGER NOT NULL CHECK (capacity >= 0),
  occupancy INTEGER NOT NULL DEFAULT 0 CHECK (occupancy >= 0),
  is_open BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (occupancy <= capacity)
);

INSERT INTO lots (name, capacity, occupancy, is_open)
VALUES
  ('North Deck', 120, 36, TRUE),
  ('South Lot', 60, 60, TRUE),
  ('River Garage', 200, 140, TRUE),
  ('Overflow Gravel', 40, 0, FALSE)
ON CONFLICT (name) DO NOTHING;
