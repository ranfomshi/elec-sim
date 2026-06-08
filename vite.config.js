import { defineConfig } from 'vite';

export default defineConfig({
  esbuild: {
    // Use the automatic JSX runtime so JSX compiles to imports from
    // 'react/jsx-runtime' instead of bare React.createElement calls.
    // Without this, Vite's default classic transform references an
    // undefined `React`, throwing "React is not defined" at runtime.
    jsx: 'automatic',
  },
});
