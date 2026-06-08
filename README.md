# ElecLab

An interactive electrical circuit simulator, packaged as a React application and built with Vite.

## Development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

## Structure

- `src/App.jsx` mounts the simulator interface and loads the runtime in dependency order.
- `src/app.html` contains the existing simulator interface markup while it is incrementally migrated to React components.
- `src/styles.css` contains the application styling.
- `src/legacy/` separates the simulator runtime by responsibility so individual areas can be migrated independently.
