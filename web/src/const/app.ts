// Mirrors AVADA src/const/app.js — central app constants.

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const ROUTES = {
  login: '/login',
  home: '/',
} as const;
