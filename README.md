# Home Care Management

Admin panel + staff duty app for a home-care (nursing / caretaker / nanny) business.

- **Backend:** Laravel 13 REST API (Sanctum token auth), MySQL
- **Frontend:** React 19 SPA (Vite, Tailwind CSS 4, React Router), served by Laravel

## Features

**Admin (`/admin`)**
- Dashboard: live duty board (who is on duty / on break, where, since when), hours today, weekly hours chart, assigned staff who have not started duty
- Staff: add / edit / deactivate, login credentials, hourly rate, monthly hours and estimated earnings
- Clients (patients): address, medical notes, emergency contact, care team, visit log
- Assignments: assign staff to clients with shift timings, date range and instructions
- Attendance & Hours: filter by date / staff / client, staff-wise totals, correct times, end forgotten duties, export CSV (opens in Excel)

**Staff (`/staff`, mobile-first)**
- One-tap **Start Duty**, **Take Break / Resume**, **End Duty** with live timer
- GPS location captured at start and end of duty (when the browser allows it)
- My Clients: address, call, Google Maps directions, care instructions
- My Hours: day-wise history and totals

Both roles log in from the same `/login` page with mobile number (or email) and password.

## Setup

```bash
composer install
npm install
cp .env.example .env   # only for a fresh clone
php artisan key:generate
```

Set the database in `.env`:

```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=home_care
DB_USERNAME=homecare
DB_PASSWORD=your-password
```

Then:

```bash
php artisan migrate --seed
npm run build          # or `npm run dev` while developing
php artisan serve
```

Open http://127.0.0.1:8000

### Default login (change after first login)

| Role  | Login                               | Password   |
|-------|-------------------------------------|------------|
| Admin | `admin@homecare.com` / `9999999999` | `admin123` |
| Staff | `9876500001` … `9876500005` (demo)  | `staff123` |

Demo staff, clients and attendance are seeded only outside `production`. To start clean:
`php artisan migrate:fresh --seed` with `APP_ENV=production`, or delete the demo records from the admin panel.

## Notes

- Timezone defaults to `Asia/Kolkata` (`APP_TIMEZONE` in `.env` to change).
- Browsers only share GPS location over HTTPS (or `localhost`), so use HTTPS in production.
