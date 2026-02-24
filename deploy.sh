#!/usr/bin/env bash
# deploy.sh — Build and deploy furniture app to Google Cloud Run
# Usage: ./deploy.sh [gcp-project-id] [region]
#   e.g. ./deploy.sh my-project us-central1

set -euo pipefail

# ── Config ──────────────────────────────────────────────────────────────────
PROJECT=${1:-$(gcloud config get-value project 2>/dev/null)}
REGION=${2:-us-central1}
BACKEND_SVC=furniture-backend
FRONTEND_SVC=furniture-frontend
REPO=gcr.io/${PROJECT}

if [[ -z "$PROJECT" ]]; then
  echo "ERROR: No GCP project set. Pass it as first arg or run: gcloud config set project YOUR_PROJECT"
  exit 1
fi

echo "Project : $PROJECT"
echo "Region  : $REGION"
echo "Registry: $REPO"
echo ""

# ── 1. Build & push backend ─────────────────────────────────────────────────
echo "==> Building backend image..."
docker build --platform linux/amd64 -t ${REPO}/${BACKEND_SVC}:latest ./backend
docker push ${REPO}/${BACKEND_SVC}:latest

# ── 2. Deploy backend to Cloud Run ──────────────────────────────────────────
echo "==> Deploying backend..."
gcloud run deploy ${BACKEND_SVC} \
  --image ${REPO}/${BACKEND_SVC}:latest \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --timeout 300 \
  --set-env-vars "GOOGLE_API_KEY=${GOOGLE_API_KEY},SERPAPI_KEY=${SERPAPI_KEY}" \
  --project ${PROJECT}

# Get the backend URL
BACKEND_URL=$(gcloud run services describe ${BACKEND_SVC} \
  --platform managed --region ${REGION} --project ${PROJECT} \
  --format "value(status.url)")
echo "Backend URL: ${BACKEND_URL}"

# ── 3. Build & push frontend (with backend URL baked in) ────────────────────
echo "==> Building frontend image (BACKEND_URL=${BACKEND_URL})..."
docker build \
  --platform linux/amd64 \
  --build-arg BACKEND_URL=${BACKEND_URL} \
  -t ${REPO}/${FRONTEND_SVC}:latest \
  ./frontend
docker push ${REPO}/${FRONTEND_SVC}:latest

# ── 4. Deploy frontend to Cloud Run ─────────────────────────────────────────
echo "==> Deploying frontend..."
gcloud run deploy ${FRONTEND_SVC} \
  --image ${REPO}/${FRONTEND_SVC}:latest \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --port 8080 \
  --memory 256Mi \
  --project ${PROJECT}

FRONTEND_URL=$(gcloud run services describe ${FRONTEND_SVC} \
  --platform managed --region ${REGION} --project ${PROJECT} \
  --format "value(status.url)")
echo "Frontend URL: ${FRONTEND_URL}"

# ── 5. Update backend CORS to allow frontend origin ─────────────────────────
echo "==> Updating backend CORS..."
gcloud run services update ${BACKEND_SVC} \
  --platform managed \
  --region ${REGION} \
  --project ${PROJECT} \
  --update-env-vars "ALLOWED_ORIGINS=${FRONTEND_URL}"

echo ""
echo "✅ Deployment complete!"
echo "   Frontend : ${FRONTEND_URL}"
echo "   Backend  : ${BACKEND_URL}"
