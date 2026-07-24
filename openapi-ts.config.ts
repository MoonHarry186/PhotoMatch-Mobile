import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: '../photomatch-api/openapi.json',
  output: {
    path: 'src/generated/api',
    postProcess: ['prettier'],
  },
  plugins: ['@hey-api/client-fetch', '@hey-api/typescript', '@hey-api/sdk'],
});
