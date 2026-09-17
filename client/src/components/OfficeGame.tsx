import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';

export function OfficeGame({ playerName }: { playerName: string }) {
  const office = useRef<HTMLElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const fullscreenPending = useRef(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState('');
  const fullscreenSupported = document.fullscreenEnabled;
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [area, setArea] = useState('Détente');
  const [attempt, setAttempt] = useState(0);

  const toggleFullscreen = useCallback(async () => {
    const container = office.current;
    if (!container || !document.fullscreenEnabled || fullscreenPending.current) return;
    fullscreenPending.current = true;
    setFullscreenError('');
    try {
      if (document.fullscreenElement === container) await document.exitFullscreen();
      else await container.requestFullscreen();
    } catch {
      if (container.isConnected) setFullscreenError('Le changement de plein écran a été refusé par le navigateur. Réessaie avec le bouton.');
    } finally {
      fullscreenPending.current = false;
    }
  }, []);

  useEffect(() => {
    const container = office.current;
    const onFullscreenChange = () => {
      setFullscreen(document.fullscreenElement === container);
      setFullscreenError('');
      host.current?.querySelector('canvas')?.focus({ preventScroll: true });
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  function onFullscreenKey(event: KeyboardEvent<HTMLElement>) {
    if (event.repeat || event.ctrlKey || event.altKey || event.metaKey || event.nativeEvent.isComposing) return;
    const target = event.target;
    if (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select, [role="textbox"]'))) return;
    if (event.key.toLowerCase() === 'f' || (event.key === 'Escape' && document.fullscreenElement === office.current)) {
      event.preventDefault();
      void toggleFullscreen();
    }
  }

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    const mount = document.createElement('div');
    mount.className = 'office-game__surface';
    container.appendChild(mount);
    let active = true;
    let instance: { destroy: () => void } | undefined;
    setStatus('loading');
    setError('');

    import('../game/createOfficeGame').then(({ createOfficeGame }) => {
      if (!active) return;
      instance = createOfficeGame(mount, playerName, {
        onReady: () => { if (active) setStatus('ready'); },
        onAreaChange: (value) => { if (active) setArea(value); },
        onError: (message) => { if (active) { setError(message); setStatus('error'); } },
      });
    }).catch(() => {
      if (active) { setError('Impossible de démarrer le bureau. Réessaie dans un instant.'); setStatus('error'); }
    });

    return () => { active = false; instance?.destroy(); mount.remove(); };
  }, [playerName, attempt]);

  return <section className="office" aria-label="Bureau interactif" ref={office} onKeyDown={onFullscreenKey}>
    <div className="office-toolbar">
      <p><strong>Lieu :</strong> <span aria-live="polite">{area}</span></p>
      <div className="office-toolbar__actions">
        <span className="demo-label">Carte de test · Mode solo</span>
        <button type="button" onClick={() => void toggleFullscreen()} disabled={!fullscreenSupported}
          aria-keyshortcuts="f Escape" aria-pressed={fullscreen}
          title={fullscreenSupported ? 'F : basculer · Échap : quitter' : 'Plein écran indisponible dans ce navigateur'}>
          {fullscreen ? 'Quitter le plein écran' : 'Plein écran'}
        </button>
      </div>
    </div>
    {fullscreenError && <p className="office-fullscreen-error" role="alert">{fullscreenError}</p>}
    <div className="office-game" ref={host}>
      {status !== 'ready' && <div className="office-game__overlay">
        {status === 'loading' ? <p role="status">Chargement du bureau…</p> : <>
          <p role="alert">{error}</p>
          <button onClick={() => setAttempt((value) => value + 1)}>Réessayer</button>
        </>}
      </div>}
    </div>
    <p id="office-controls" className="office-controls">
      Clique dans le bureau, puis utilise <strong>ZQSD</strong> ou <strong>les flèches</strong> pour te déplacer.
      {' '}Appuie sur <kbd>Tab</kbd> pour quitter le bureau au clavier.
      {fullscreenSupported && <> <kbd>F</kbd> : plein écran / retour · <kbd>Échap</kbd> : quitter le plein écran.</>}
    </p>
  </section>;
}
