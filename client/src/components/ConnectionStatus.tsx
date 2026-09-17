import { useEffect, useState } from 'react';
import { getServiceStatus, type ServiceStatus } from '../services/api';

type Status = ServiceStatus | 'loading';
const labels: Record<Status, string> = {
  loading: 'Vérification en cours…',
  ready: 'Les services sont disponibles.',
  'database-unavailable': 'Le serveur répond, mais la base de données est indisponible.',
  unavailable: 'Connexion impossible. Vérifie que les services sont démarrés, puis réessaie.',
};

export function ConnectionStatus() {
  const [status, setStatus] = useState<Status>('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timer = window.setTimeout(() => controller.abort(), 8_000);
    getServiceStatus(controller.signal)
      .then((value) => { if (active) setStatus(value); })
      .catch(() => { if (active) setStatus('unavailable'); })
      .finally(() => window.clearTimeout(timer));
    return () => { active = false; controller.abort(); window.clearTimeout(timer); };
  }, [attempt]);

  return <section className="connection" aria-labelledby="connection-title">
    <div>
      <h2 id="connection-title">État de la connexion</h2>
      <p className={`status status--${status}`} role="status">{labels[status]}</p>
    </div>
    <button type="button" disabled={status === 'loading'} onClick={() => {
      setStatus('loading'); setAttempt((value) => value + 1);
    }}>Vérifier à nouveau</button>
  </section>;
}
