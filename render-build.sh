#!/usr/bin/env bash
# Render build script for the backend service (monorepo)
set -e

echo "==> Installing backend dependencies..."
cd backend && npm ci

echo "==> Installing Prisma CLI..."
cd ../database && npm install prisma @prisma/client

echo "==> Generating Prisma client..."
npx prisma generate

echo "==> Running database migrations..."
npx prisma migrate deploy

echo "==> Build complete!"
