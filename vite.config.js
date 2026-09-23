// Stage 0 — vite.config.js — CAT Operator Guardian
import { defineConfig } from 'vite';

export default defineConfig({
  assetsInclude: ['**/*.fbx', '**/*.glb', '**/*.gltf'],
  server: {
    port: 3000,
    open: true
  }
});
