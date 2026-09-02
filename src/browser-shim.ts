/**
 * The `browser` export condition resolves here, so a bundler that pulls
 * @havadis/sdk into client-side code fails LOUDLY at build/run instead of
 * shipping an API key to every visitor. (The Havadis constructor repeats
 * the check at runtime for loaders that ignore export conditions.)
 */
throw new Error(
  '@havadis/sdk cannot run in a browser: it authenticates with a secret ' +
    'API key. Move this call to your server (API route, cron, build step).',
);

export {};
