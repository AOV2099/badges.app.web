-- PostgreSQL 16 database bootstrap for BADGES.
-- Run this from a maintenance database, for example postgres.
-- If open_badges already exists, skip this file and run schema.sql inside open_badges.

CREATE DATABASE open_badges
  WITH
  ENCODING 'UTF8'
  TEMPLATE template0;
