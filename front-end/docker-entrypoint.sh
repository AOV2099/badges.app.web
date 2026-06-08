#!/bin/sh
set -eu

cat > /usr/share/nginx/html/runtime-config.js <<EOF
window.BADGES_CONFIG = {
  API_BASE_URL: "${API_BASE_URL:-/api}"
};
EOF
