import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { ChatRequest, ChatResult, ChatState } from '../../../server/src/realtime/protocol';

type Props = { conversation: ChatState; online: boolean; send: (request: ChatRequest) => Promise<ChatResult> };

export function ChatPanel({ conversation, online, send }: Props) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const log = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const lastMessage = conversation?.messages.at(-1)?.id;
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [lastMessage]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!conversation || !online || sending || !draft.trim()) return;
    setSending(true);
    setError('');
    const result = await send({ conversationId: conversation.id, text: draft });
    if (!mounted.current) return;
    setSending(false);
    if (result.ok) setDraft(current => current === draft ? '' : current);
    else setError(result.error);
  }

  return <aside className="chat-panel" aria-label="Chat de proximité">
    <h2>Chat de proximité</h2>
    <p className="chat-members" role="status">
      {!online ? 'En attente de connexion…' : conversation ?
        `${conversation.members.length} participants : ${conversation.members.map(member => member.name).join(', ')}` :
        'Rapproche-toi d’un collègue pour discuter. Les murs bloquent la conversation.'}
    </p>
    <div className="chat-messages" role="log" aria-label="Messages du groupe" aria-relevant="additions" ref={log}>
      {conversation?.messages.map(message => <article className="chat-message" key={message.id}>
        <div><strong>{message.name}</strong> <time dateTime={new Date(message.sentAt).toISOString()}>
          {new Date(message.sentAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </time></div>
        <p>{message.text}</p>
      </article>)}
      {conversation && !conversation.messages.length && <p className="chat-empty">Vous êtes à portée. Dis bonjour !</p>}
    </div>
    <form onSubmit={event => void submit(event)}>
      <label htmlFor="chat-message">Message au groupe</label>
      <input id="chat-message" value={draft} maxLength={500} autoComplete="off"
        disabled={!online || !conversation} placeholder="Ton message…"
        onChange={event => { setDraft(event.target.value); setError(''); }} />
      <div className="chat-send-row">
        <small>{draft.length}/500 · Entrée pour envoyer</small>
        <button type="submit" disabled={!online || !conversation || sending || !draft.trim()}>{sending ? 'Envoi…' : 'Envoyer'}</button>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
    <p className="chat-retention">Historique temporaire · 5 min après séparation · 100 derniers messages</p>
  </aside>;
}
