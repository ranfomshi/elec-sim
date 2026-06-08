import { useEffect, useState } from 'react';
import appMarkup from './app.html?raw';
import coreRuntime from './legacy/core.js?url';
import renderingRuntime from './legacy/rendering.js?url';
import simulationRuntime from './legacy/simulation.js?url';
import interactionsRuntime from './legacy/interactions.js?url';
import learningRuntime from './legacy/learning.js?url';
import bootstrapRuntime from './legacy/bootstrap.js?url';

const runtimeModules = [
  coreRuntime,
  renderingRuntime,
  simulationRuntime,
  interactionsRuntime,
  learningRuntime,
  bootstrapRuntime,
];

function loadClassicScript(source) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = source;
    script.dataset.eleclabRuntime = source;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Unable to load runtime module: ${source}`));
    document.body.appendChild(script);
  });
}

export default function App() {
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadRuntime() {
      try {
        for (const runtimeModule of runtimeModules) {
          await loadClassicScript(runtimeModule);
        }
      } catch (error) {
        if (active) setLoadError(error.message);
      }
    }

    loadRuntime();
    return () => {
      active = false;
    };
  }, []);

  if (loadError) {
    return <main className="startup-error">ElecLab failed to start: {loadError}</main>;
  }

  return <div className="app-shell" dangerouslySetInnerHTML={{ __html: appMarkup }} />;
}
