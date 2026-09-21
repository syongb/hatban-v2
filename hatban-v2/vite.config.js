import { defineConfig } from 'vite';

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1];

export default defineConfig({
  // GitHub Actions supplies GITHUB_REPOSITORY as owner/repository.
  // Local development and local builds keep the root path.
  base: repositoryName ? `/${repositoryName}/` : '/',
});
