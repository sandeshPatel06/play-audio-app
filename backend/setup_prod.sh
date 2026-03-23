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

echo "Running migrations..."
python manage.py migrate

echo "Collecting static files..."
python manage.py collectstatic --no-input

echo "Setup complete. You can now start the server with: daphne -b 0.0.0.0 -p $PORT config.asgi:application"
