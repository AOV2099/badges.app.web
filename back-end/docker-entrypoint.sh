#!/bin/sh
set -e

mkdir -p /app/data
chown -R badges:badges /app/data

exec su-exec badges:badges "$@"