#!/bin/bash
# setup_prod.sh

set -e

echo "Starting production setup..."

# Check if we're in a virtual environment
if [[ -z "$VIRTUAL_ENV" ]]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
fi

echo "Installing requirements..."
pip install -r requirements.txt

if [[ -n "$DATABASE_URL" ]]; then
    echo "Using DATABASE_URL from environment."
else
    echo "DATABASE_URL not set. Falling back to SQLite."
fi

echo "Running migrations..."
python manage.py migrate

echo "Collecting static files..."
python manage.py collectstatic --no-input

echo "Running deployment checks..."
python manage.py check --deploy

echo "Setup complete. You can now start the server with: python -m daphne -b 0.0.0.0 -p \$PORT config.asgi:application"
