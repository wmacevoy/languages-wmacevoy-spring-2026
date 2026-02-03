# Parking Occupancy Demo

A small full-stack example with HTML/CSS/JS frontend, Node + Express API, and Postgres.

## Quick start (Docker)

```sh
docker compose up --build
```

Then open `http://localhost:3000`.

## API endpoints

- `GET /api/lots` — list all lots with availability
- `GET /api/lots/:id` — get a single lot
- `POST /api/lots/:id/open` — admin opens a lot
- `POST /api/lots/:id/close` — admin closes a lot
- `POST /api/lots/:id/occupancy` — sensor updates occupancy
  - JSON body: `{ "occupancy": 42 }`

## Notes

- The database is seeded from `server/sql/init.sql` on first run.
- The frontend is served from `server/public` by the Node app.


## Codex Prompt

I would like a small working example of a parking occupancy web app.  Use HTML/CSS/JS for the front end, use Postgress for the database, use Node for the rest api.  The core users are customers that can just see available parking areas and number of available places to park, admins that can open/close parking lots, and sensors that can update occupancy for a given lot. Create a test environment as a docker-compose that gives a server and database for testing.  Keep it simple as an example full stack application.

Can you add users and roles - one user is "sensor/<lot>" that can modify occupancy of that lot.  Use JWT for authorization after login.  The default no - role user is a Customer "Guest".  Add a login section and hide the panels the user cannot access.  I think the roles are admin, sensor, and none.  Admins can create/delete users.