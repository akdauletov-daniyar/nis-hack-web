const REQUIRED_PUBLIC_ENV = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "VITE_GOOGLE_CLOUD_API",
];

const cache = new Map();

export function getPublicEnv(name) {
  if (cache.has(name)) {
    return cache.get(name);
  }

  const value = import.meta.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  cache.set(name, value);
  return value;
}

export function validatePublicEnv() {
  REQUIRED_PUBLIC_ENV.forEach((name) => {
    getPublicEnv(name);
  });
}
