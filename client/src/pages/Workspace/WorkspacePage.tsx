import { useAuth } from '../../auth/AuthProvider';
import { ConnectionStatus } from '../../components/ConnectionStatus';
import { OfficeGame } from '../../components/OfficeGame';

export function WorkspacePage() {
  const { session } = useAuth();
  if (!session) return null;
  const { user } = session;
  return <main className="workspace">
    <p className="eyebrow">{user.firstName} {user.lastName} · {user.role === 'ADMIN' ? 'Administrateur' : 'Collaborateur'}</p>
    <h1>Le bureau</h1>
    <OfficeGame playerName={`${user.firstName} ${user.lastName}`} />
    <ConnectionStatus />
  </main>;
}
