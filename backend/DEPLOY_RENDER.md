# Render Deployment

## Before you deploy

This backend is now set up to run on Render with Django, Daphne, WhiteNoise, and PostgreSQL via `DATABASE_URL`.

Important limitation:
- The live audio room queue in [`stream/queues.py`](/home/patel/git/play/backend/stream/queues.py) is in-memory.
- That means you should run a single web instance for now.
- If you scale to multiple instances, a broadcaster connected to one instance will not feed listeners connected to another.

## Render setup

1. Push the repo to GitHub.
2. In Render, create a new `Blueprint` or `Web Service`.
3. If you use the blueprint flow, point Render at [`render.yaml`](/home/patel/git/play/backend/render.yaml).
4. Create a PostgreSQL database in Render and attach its `DATABASE_URL` to the web service.
5. Set these environment variables:
   - `SECRET_KEY`
   - `DEBUG=False`
   - `ALLOWED_HOSTS=your-service-name.onrender.com`
   - `CORS_ALLOWED_ORIGINS=https://your-frontend-domain.com`
   - `CSRF_TRUSTED_ORIGINS=https://your-frontend-domain.com`
   - `FIREBASE_SERVICE_ACCOUNT_JSON=...`
6. Deploy the service.

## Manual Render commands

If you create the service manually instead of using the blueprint:

- Root directory: `backend`
- Build command: `pip install -r requirements.txt && python manage.py collectstatic --no-input`
- Start command: `python manage.py migrate --no-input && python -m daphne -b 0.0.0.0 -p $PORT config.asgi:application`

## Smoke test after deploy

Check these URLs after deployment:

- `https://your-service.onrender.com/health/`
- `https://your-service.onrender.com/listen/test-room/`

The health endpoint should return JSON with `"status": "ok"`.
