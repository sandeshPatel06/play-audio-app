# Play

Play is a mobile-first audio streaming app with:

- an Expo / React Native frontend in [`frontend`](./frontend)
- a Django + Channels backend in [`backend`](./backend)

The current hosted backend URL is:

- `https://play-veee.onrender.com`

## Project Structure

```text
play/
├── frontend/   # Expo app
├── backend/    # Django + Channels API / stream server
└── README.md
```

## Frontend

The frontend uses Expo Router and talks to the hosted backend through these env vars:

```env
EXPO_PUBLIC_WS_URL=wss://play-veee.onrender.com/ws/stream/
EXPO_PUBLIC_API_URL=https://play-veee.onrender.com/listen/
```

Those values are already reflected in [`frontend/.env`](./frontend/.env) and [`frontend/eas.json`](./frontend/eas.json).

### Frontend local setup

```bash
cd frontend
npm install
npx expo start
```

Useful commands:

- `npm run start:clear` clears Expo cache
- `npm run android` runs the native Android app
- `npm run android:rebuild` rebuilds the Android native app
- `npm run ios` runs the iOS app
- `npm run lint` runs ESLint

### Android worklets mismatch fix

If you see a warning like:

```text
[Worklets] Mismatch between C++ code version and JavaScript code version
```

the installed Android app was built with older native code. Rebuild it:

```bash
cd frontend
npm install
npx expo prebuild --clean --platform android
npm run android:rebuild
```

If needed, uninstall the existing app from the device/emulator first.

### EAS builds

The frontend EAS profiles are defined in [`frontend/eas.json`](./frontend/eas.json).

Build production Android:

```bash
cd frontend
eas build --profile production --platform android
```

Build development client:

```bash
cd frontend
eas build --profile development --platform android
```

## Backend

The backend is a Django app using:

- Django
- Channels
- Daphne
- WhiteNoise
- Render-friendly `DATABASE_URL` support
- optional Firebase Admin / Firestore integration

### Backend local setup

```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Backend env example

Start from [`backend/example.env`](./backend/example.env).

For Render production, the important values are:

```env
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,play-veee.onrender.com
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,https://play-veee.onrender.com
CORS_ALLOW_ALL_ORIGINS=False
CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,https://play-veee.onrender.com
DJANGO_LOG_LEVEL=INFO
SECURE_SSL_REDIRECT=True
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
SECURE_HSTS_PRELOAD=True
DATABASE_URL=postgresql://user:password@host:5432/dbname
FIREBASE_SERVICE_ACCOUNT_JSON={...}
```

Notes:

- use `DATABASE_URL` on Render, not SQLite
- Render provides `PORT` automatically
- do not keep `DEBUG=True` in production
- rotate secrets if they were ever exposed

### Backend production checks

```bash
cd backend
python manage.py check --deploy
```

Health endpoint:

- `https://play-veee.onrender.com/health/`

## Render Deployment

Render-specific files:

- [`backend/render.yaml`](./backend/render.yaml)
- [`backend/DEPLOY_RENDER.md`](./backend/DEPLOY_RENDER.md)

### Manual Render setup

Use these values if you create the backend service manually:

- Root directory: `backend`
- Build command: `pip install -r requirements.txt && python manage.py collectstatic --no-input`
- Start command: `python manage.py migrate --no-input && python -m daphne -b 0.0.0.0 -p $PORT config.asgi:application`
- Health check path: `/health/`

### Important backend scaling note

The room queue in [`backend/stream/queues.py`](./backend/stream/queues.py) is in-memory. That means:

- run a single backend instance for now
- horizontal scaling will break cross-instance live room streaming

If you need multi-instance scaling later, move the queue/broadcast layer to Redis or another shared broker.

## Quick Start

Frontend:

```bash
cd frontend
npm install
npx expo start
```

Backend:

```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```
