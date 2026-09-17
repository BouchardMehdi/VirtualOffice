import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { LoginPage } from './pages/Login/LoginPage';
import { WorkspacePage } from './pages/Workspace/WorkspacePage';

function AppContent() {
  const { session, status, message, retry, signOut } = useAuth();
  return <div className="app-shell">
    <header>
      <Link className="brand" to="/">VirtualOffice<span aria-hidden="true">.</span></Link>
      {session
        ? <button className="secondary-button" onClick={() => signOut()}>Se déconnecter</button>
        : <span className="demo-label">Démo en construction</span>}
    </header>
    {status === 'loading' ? <main><p role="status">Vérification de ta session…</p></main>
      : status === 'error' ? <main>
        <h1>Connexion interrompue</h1>
        <p role="alert">{message}</p>
        <div className="actions"><button onClick={retry}>Réessayer</button>
          <button className="secondary-button" onClick={() => signOut()}>Revenir à la connexion</button></div>
      </main>
      : <Routes>
        <Route path="/login" element={session ? <Navigate to="/workspace" replace /> : <LoginPage />} />
        <Route path="/workspace" element={session ? <WorkspacePage /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to={session ? '/workspace' : '/login'} replace />} />
      </Routes>}
    <footer>VirtualOffice · Prototype scolaire</footer>
  </div>;
}

export function App() {
  return <BrowserRouter><AuthProvider><AppContent /></AuthProvider></BrowserRouter>;
}
