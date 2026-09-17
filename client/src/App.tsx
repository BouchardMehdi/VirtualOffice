import { useEffect, useState } from 'react';
import { getServiceStatus, type ServiceStatus } from './services/api';

type Status = ServiceStatus | 'loading';

const statusText: Record<Status, string> = {
  loading: 'Vérification en cours…',
  ready: 'Les services sont disponibles.',
  'database-unavailable': 'Le serveur répond, mais la base de données est indisponible.',
  unavailable: 'Connexion impossible. Vérifie que les services sont démarrés, puis réessaie.',
};

export function App() {
  const [status, setStatus] = useState<Status>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(), 8_000);

    getServiceStatus(controller.signal)
      .then((nextStatus) => {
        if (active) setStatus(nextStatus);
      })
      .catch(() => {
        if (active) setStatus('unavailable');
      })
      .finally(() => window.clearTimeout(timeout));

    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [attempt]);

  return (
    <div className="app-shell">
      <header>
        <a className="brand" href="/">VirtualOffice<span aria-hidden="true">.</span></a>
        <span className="demo-label">Démo en construction</span>
      </header>

      <main>
        <p className="eyebrow">Un bureau, même à distance</p>
        <h1>Votre espace de travail se prépare.</h1>
        <p className="introduction">
          Bientôt, retrouvez vos collègues dans le bureau et rapprochez-vous pour discuter.
        </p>

        <section className="connection" aria-labelledby="connection-title">
          <div>
            <h2 id="connection-title">État de la connexion</h2>
            <p className={`status status--${status}`} role="status" aria-live="polite">
              {statusText[status]}
            </p>
          </div>
          <button
            type="button"
            disabled={status === 'loading'}
            onClick={() => {
              setStatus('loading');
              setAttempt((value) => value + 1);
            }}
          >
            Vérifier à nouveau
          </button>
        </section>

        <p className="next-step">Première étape : les fondations. La connexion aux comptes arrive ensuite.</p>
      </main>

      <footer>VirtualOffice · Prototype scolaire</footer>
    </div>
  );
}
