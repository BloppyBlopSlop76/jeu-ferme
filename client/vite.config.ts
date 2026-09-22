import { defineConfig } from 'vite';

// base = chemin où le jeu est publié. Sur GitHub Pages, c'est le nom du dépôt.
export default defineConfig({
  base: '/jeu-ferme/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
