import {defineConfig} from "vite";

const REPO_NAME = 'Model-Viewer';

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : `/${REPO_NAME}/`,

  publicDir: 'public',

  server: {
    open: true,
  },

  build: {
    target: 'esnext',
  },
}));
