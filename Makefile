# Play Management Makefile

.PHONY: run setup clean build-dev build-preview help

# Use bash for better compatibility
SHELL := /bin/bash

# Default target
help:
	@echo "Usage:"
	@echo "  make run            - Run the Expo frontend"
	@echo "  make setup          - Install dependencies (npm)"
	@echo "  make build-dev      - Create EAS development build"
	@echo "  make build-preview  - Create EAS preview build"
	@echo "  make clean          - Clean up temporary files"

# Run frontend
run:
	@echo "Starting Play services..."
	npx expo start

# Setup dependencies
setup:
	@echo "Installing frontend dependencies..."
	npm install

# EAS Build Targets
build-dev:
	@echo "Starting EAS development build for Android..."
	npx eas build --platform android --profile development

build-preview:
	@echo "Starting EAS preview build for Android..."
	npx eas build --platform android --profile preview

# Clean up
clean:
	@echo "Cleaning up..."
	rm -rf .expo
	rm -rf dist
	rm -rf web-build
	@echo "Cleanup complete."
