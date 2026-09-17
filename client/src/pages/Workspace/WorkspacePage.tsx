import { useAuth } from '../../auth/AuthProvider';
import { ConnectionStatus } from '../../components/ConnectionStatus';

export function WorkspacePage() {
  const { session } = useAuth();
  if (!session) return null;
  const { user } = session;
  return <main>
    <p className="eyebrow">{user.firstName} {user.lastName} · {user.role === 'ADMIN' ? 'Administrateur' : 'Collaborateur'}</p>
    <h1>Bienvenue dans le bureau, {user.firstName}.</h1>
    <p className="introduction">Tu es connecté avec le compte {user.email}.</p>
    <div className="workspace-placeholder">
      <h2>Le bureau prend forme</h2>
      <p>La carte et les déplacements arrivent à la prochaine étape de la démo.</p>
    </div>
    <ConnectionStatus />
  </main>;
}
