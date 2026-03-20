# Play-Veee Management Makefile

.PHONY: run run-backend run-frontend setup clean build-dev build-preview help

# Use bash for better compatibility
SHELL := /bin/bash

# Default target
help:
	@echo "Usage:"
	@echo "  make run            - Run both Django backend and Expo frontend"
	@echo "  make run-backend    - Run only the Django backend"
	@echo "  make run-frontend   - Run only the Expo frontend"
	@echo "  make setup          - Install dependencies (uv + npm) and migrate DB"
	@echo "  make build-dev      - Create EAS development build"
	@echo "  make build-preview  - Create EAS preview build"
	@echo "  make clean          - Clean up temporary files"

# Backend shortcut
VENV_ACTIVATE = cd backend && . .venv/bin/activate

# Run both services
run:
	@echo "Starting Play-Veee services..."
	@trap 'kill 0' INT; \
	(cd backend && . .venv/bin/activate && python3 manage.py runserver 0.0.0.0:8000) & \
	(cd frontend && npx expo start)

# Run only backend
run-backend:
	@echo "Starting Django backend..."
	cd backend && . .venv/bin/activate && python3 manage.py runserver 0.0.0.0:8000

# Run only frontend
run-frontend:
	@echo "Starting Expo frontend..."
	cd frontend && npx expo start

# Setup dependencies and database
setup:
	@echo "Installing uv..."
	pip install --user --break-system-packages uv
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo "Setting up backend venv and dependencies..."
	cd backend && uv venv && . .venv/bin/activate && uv pip install -r requirements.txt
	@echo "Running migrations..."
	cd backend && . .venv/bin/activate && python3 manage.py makemigrations && python3 manage.py migrate

# EAS Build Targets
build-dev:
	@echo "Starting EAS development build for Android..."
	cd frontend && npx eas build --platform android --profile development

build-preview:
	@echo "Starting EAS preview build for Android..."
	cd frontend && npx eas build --platform android --profile preview

# Clean up
clean:
	@echo "Cleaning up..."
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.py[co]" -delete
	rm -rf backend/.venv
	@echo "Cleanup complete."
