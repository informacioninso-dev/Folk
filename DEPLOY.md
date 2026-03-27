# Deploy

## Required values

Backend:
- Copy `Folk-API/.env.example` to `Folk-API/.env`
- Set a real `DJANGO_SECRET_KEY`
- Set production domains in `DJANGO_ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`, `CORS_ALLOWED_ORIGINS`
- Set real SMTP credentials
- Set real `DATABASE_URL`, `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`

Frontend:
- Copy `folk-web/.env.production.example` to `folk-web/.env.production`
- Set `NEXT_PUBLIC_API_URL` to your public API base URL, for example `https://api.example.com`

Root compose:
- Export `NEXT_PUBLIC_API_URL` before running `docker compose`

## Production with Docker Compose

1. Create `Folk-API/.env` from `Folk-API/.env.example`
2. Export `NEXT_PUBLIC_API_URL`
3. Run `docker compose -f docker-compose.prod.yml build`
4. Run `docker compose -f docker-compose.prod.yml up -d`

API health endpoint:
- `GET /api/v1/health/`

## Notes

- The backend container now uses `gunicorn` for production
- Static files are collected in the API container and served with `whitenoise`
- Media files are stored in the `media_data` volume
- Celery runs as a separate worker service
