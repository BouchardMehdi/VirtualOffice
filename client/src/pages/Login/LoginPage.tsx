import { useState, type FormEvent } from 'react';
import { useAuth } from '../../auth/AuthProvider';

export function LoginPage() {
  const { signIn, message } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await signIn(email, password);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Connexion impossible.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-layout">
      <div className="login-intro">
        <p className="eyebrow">Un bureau, même à distance</p>
        <h1>Retrouvez votre équipe.</h1>
        <p className="introduction">Un espace partagé pour se retrouver et discuter au fil de la journée.</p>
      </div>
      <section className="login-card" aria-labelledby="login-title">
        <h2 id="login-title">Connexion</h2>
        <p className="form-hint">Utilise le compte fourni par ton équipe.</p>
        <form onSubmit={submit} aria-busy={submitting}>
          <label htmlFor="email">Adresse email</label>
          <input id="email" name="email" type="email" autoComplete="username" required maxLength={254}
            value={email} onChange={(event) => setEmail(event.target.value)} disabled={submitting} />
          <label htmlFor="password">Mot de passe</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required
            value={password} onChange={(event) => setPassword(event.target.value)} disabled={submitting}
            aria-describedby={error || message ? 'login-message' : undefined} />
          {(error || message) && <p id="login-message" className="form-error" role="alert">{error || message}</p>}
          <button className="submit-button" type="submit" disabled={submitting}>
            {submitting ? 'Connexion en cours…' : 'Entrer dans le bureau'}
          </button>
        </form>
      </section>
    </main>
  );
}
