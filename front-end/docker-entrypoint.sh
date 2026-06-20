#!/bin/sh
set -eu

RUNTIME_API_BASE_URL="${API_BASE_URL:-${FRONTEND_API_BASE_URL:-/api}}"

cat > /usr/share/nginx/html/runtime-config.js <<EOF
window.BADGES_CONFIG = {
  API_BASE_URL: "${RUNTIME_API_BASE_URL}"
};
EOF
