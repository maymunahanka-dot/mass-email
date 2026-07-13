import { useState, useEffect, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const API = import.meta.env.VITE_BACKEND_URL || 'https://backend.fashiontally.com';

// ── helpers ───────────────────────────────────────────────────────────────────
function initials(name, email) {
  const src = (name || email || '?').trim();
  return src.slice(0, 2).toUpperCase();
}

function highlightMatch(text, query) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'rgba(22,152,141,0.25)', borderRadius: 3, padding: '0 1px' }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [users, setUsers]               = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState(new Set());
  const [sendMode, setSendMode] = useState('all');

  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult]   = useState(null);

  const searchRef = useRef(null);

  // ── quill toolbar config ─────────────────────────────────────────────────────
  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ color: [] }, { background: [] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ align: [] }],
      ['link', 'image'],
      ['blockquote', 'code-block'],
      ['clean'],
    ],
  };

  const quillFormats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'color', 'background', 'list', 'align',
    'link', 'image', 'blockquote', 'code-block',
  ];

  // ── load users ──────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch(`${API}/api/email-blast/users`);
        const data = await res.json();
        if (data.success) {
          setUsers(data.users);
        } else {
          toast.error('Failed to load users: ' + (data.error || 'Unknown'));
        }
      } catch (err) {
        toast.error('Could not connect to server');
        console.error(err);
      } finally {
        setLoadingUsers(false);
      }
    })();
  }, []);

  // ── filtered list ────────────────────────────────────────────────────────────
  const q        = search.trim().toLowerCase();
  const filtered = q
    ? users.filter(u =>
        u.email.toLowerCase().includes(q) ||
        (u.name || '').toLowerCase().includes(q)
      )
    : users;

  // ── selection ────────────────────────────────────────────────────────────────
  const toggleUser = (email) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(email) ? next.delete(email) : next.add(email);
      return next;
    });
    setSendMode('selected');
  };

  const selectAll = () => {
    setSelected(new Set(users.map(u => u.email)));
    setSendMode('selected');
  };

  const clearSelection = () => {
    setSelected(new Set());
    setSendMode('all');
  };

  // ── send ──────────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!message.trim() || message === '<p><br></p>') { toast.error('Message is required'); return; }

    const recipients = sendMode === 'all' ? 'all' : [...selected];
    if (sendMode === 'selected' && recipients.length === 0) {
      toast.error('Select at least one recipient');
      return;
    }

    const count     = sendMode === 'all' ? users.length : recipients.length;
    const confirmed = window.confirm(`Send email to ${count} user${count !== 1 ? 's' : ''}?`);
    if (!confirmed) return;

    setSending(true);
    setResult(null);

    try {
      const res  = await fetch(`${API}/api/email-blast/send`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: message.trim(), recipients }),
      });

      // Guard against non-JSON responses (e.g. 413 Payload Too Large)
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`Server error ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();

      if (data.success) {
        setResult({ total: data.total });
        toast.success(`📨 Queued for ${data.total} users — sending in background`);
        setMessage('');
      } else {
        toast.error(data.error || 'Send failed');
      }
    } catch (err) {
      toast.error('Could not reach server — check connection');
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  // ── derived labels ───────────────────────────────────────────────────────────
  const recipientLabel = sendMode === 'all'
    ? `All ${users.length} users`
    : `${selected.size} selected`;

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      <Toaster position="top-right" />

      {/* Header */}
      <header style={s.header}>
        <div style={s.logo}>
          <span style={s.logoIcon}>✉</span>
          <span style={s.logoText}>FashionTally Email Blast</span>
        </div>
        <span style={s.badge}>
          {loadingUsers ? 'Loading…' : `${users.length} users`}
        </span>
      </header>

      <div style={s.layout}>

        {/* ── LEFT: user list ── */}
        <aside style={s.sidebar}>
          <div style={s.sidebarTop}>
            <span style={s.sidebarTitle}>Recipients</span>
            <div style={s.sidebarActions}>
              <button style={s.linkBtn} onClick={selectAll}>Select all</button>
              {selected.size > 0 && (
                <button style={{ ...s.linkBtn, color: 'var(--error)' }} onClick={clearSelection}>
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Mode toggle */}
          <div style={s.modeRow}>
            <button
              style={{ ...s.modeBtn, ...(sendMode === 'all' ? s.modeBtnOn : {}) }}
              onClick={() => setSendMode('all')}
            >
              All users
            </button>
            <button
              style={{ ...s.modeBtn, ...(sendMode === 'selected' ? s.modeBtnOn : {}) }}
              onClick={() => {
                if (selected.size > 0) setSendMode('selected');
                else toast('Select users first', { icon: '👆' });
              }}
            >
              Selected ({selected.size})
            </button>
          </div>

          {/* Search */}
          <div style={s.searchWrap}>
            <span style={s.searchIcon}>🔍</span>
            <input
              ref={searchRef}
              style={s.searchInput}
              placeholder="Search name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button style={s.clearBtn} onClick={() => setSearch('')}>✕</button>
            )}
          </div>

          {/* List */}
          <div style={s.userList}>
            {loadingUsers && <div style={s.empty}>Loading users…</div>}
            {!loadingUsers && filtered.length === 0 && (
              <div style={s.empty}>No users match "{search}"</div>
            )}
            {!loadingUsers && filtered.map(user => {
              const on = selected.has(user.email);
              return (
                <div
                  key={user.email}
                  style={{ ...s.userRow, ...(on ? s.userRowOn : {}) }}
                  onClick={() => toggleUser(user.email)}
                >
                  <div style={{ ...s.avatar, ...(on ? s.avatarOn : {}) }}>
                    {initials(user.name, user.email)}
                  </div>
                  <div style={s.userInfo}>
                    {user.name && (
                      <div style={s.userName}>{highlightMatch(user.name, q)}</div>
                    )}
                    <div style={s.userEmail}>{highlightMatch(user.email, q)}</div>
                  </div>
                  <div style={{ ...s.check, ...(on ? s.checkOn : {}) }}>
                    {on ? '✓' : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* ── RIGHT: compose ── */}
        <main style={s.compose}>
          <h2 style={s.composeTitle}>Compose Email</h2>

          {/* To */}
          <div style={s.field}>
            <label style={s.label}>To</label>
            <div style={s.toField}>
              <span style={s.toPill}>{recipientLabel}</span>
            </div>
          </div>

          {/* Subject removed — no longer needed */}

          {/* Message */}
          <div style={{ ...s.field, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <label style={s.label}>Message</label>
            <div style={s.editorWrap}>
              <ReactQuill
                theme="snow"
                value={message}
                onChange={setMessage}
                modules={quillModules}
                formats={quillFormats}
                placeholder="Type your message here…"
                readOnly={sending}
                style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
              />
            </div>
          </div>

          {/* Result */}
          {result && (
            <div style={{ ...s.resultBox, ...s.resultOk }}>
              📨 Queued for <strong>{result.total}</strong> user{result.total !== 1 ? 's' : ''} — emails are sending in the background.
            </div>
          )}

          {/* Send button */}
          <button
            style={{ ...s.sendBtn, ...(sending ? s.sendBtnOff : {}) }}
            onClick={handleSend}
            disabled={sending}
          >
            {sending ? 'Queuing…' : `Send to ${recipientLabel}`}
          </button>
        </main>
      </div>
    </div>
  );
}

// ── styles ─────────────────────────────────────────────────────────────────────
const s = {
  page:    { minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' },
  header:  { background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '0 24px',
             height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
  logo:    { display: 'flex', alignItems: 'center', gap: 10 },
  logoIcon:{ fontSize: 22 },
  logoText:{ fontWeight: 700, fontSize: 18, color: 'var(--text)' },
  badge:   { background: 'var(--primary-l)', color: 'var(--primary)', borderRadius: 20,
             padding: '4px 12px', fontSize: 13, fontWeight: 600 },

  layout:  { flex: 1, display: 'flex', overflow: 'hidden', height: 'calc(100vh - 60px)' },

  sidebar:      { width: 320, flexShrink: 0, background: 'var(--bg2)', borderRight: '1px solid var(--border)',
                  display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  sidebarTop:   { padding: '16px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  sidebarTitle: { fontSize: 14, fontWeight: 700, color: 'var(--text)' },
  sidebarActions: { display: 'flex', gap: 8 },
  linkBtn: { background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12,
             fontWeight: 600, cursor: 'pointer', padding: '2px 4px' },

  modeRow:  { display: 'flex', gap: 6, padding: '10px 16px 0' },
  modeBtn:  { flex: 1, padding: '7px 0', borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--bg3)', color: 'var(--text2)', fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  modeBtnOn:{ background: 'var(--primary-l)', borderColor: 'var(--primary)', color: 'var(--primary)', fontWeight: 700 },

  searchWrap:  { margin: '10px 16px 0', position: 'relative', display: 'flex', alignItems: 'center' },
  searchIcon:  { position: 'absolute', left: 10, fontSize: 13, pointerEvents: 'none' },
  searchInput: { width: '100%', padding: '9px 30px 9px 30px', borderRadius: 8,
                 border: '1px solid var(--border)', background: 'var(--bg3)',
                 fontSize: 13, color: 'var(--text)', outline: 'none' },
  clearBtn:    { position: 'absolute', right: 8, background: 'none', border: 'none',
                 color: 'var(--text3)', fontSize: 12, cursor: 'pointer' },

  userList: { flex: 1, overflowY: 'auto', padding: '8px 8px 16px', marginTop: 8 },
  empty:    { textAlign: 'center', color: 'var(--text3)', padding: '32px 0', fontSize: 13 },

  userRow:   { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
               borderRadius: 8, cursor: 'pointer', marginBottom: 2 },
  userRowOn: { background: 'var(--primary-l)' },

  avatar:   { width: 36, height: 36, borderRadius: '50%', background: 'var(--bg3)',
              color: 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, flexShrink: 0 },
  avatarOn: { background: 'var(--primary)', color: '#fff' },

  userInfo:  { flex: 1, minWidth: 0 },
  userName:  { fontSize: 13, fontWeight: 600, color: 'var(--text)',
               overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  userEmail: { fontSize: 12, color: 'var(--text2)',
               overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },

  check:   { width: 20, height: 20, borderRadius: '50%', border: '1.5px solid var(--border)',
             display: 'flex', alignItems: 'center', justifyContent: 'center',
             fontSize: 11, color: '#fff', flexShrink: 0, fontWeight: 700 },
  checkOn: { background: 'var(--primary)', borderColor: 'var(--primary)' },

  compose:      { flex: 1, padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' },
  composeTitle: { fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 },

  field:   { display: 'flex', flexDirection: 'column', gap: 6 },
  label:   { fontSize: 13, fontWeight: 600, color: 'var(--text2)' },
  toField: { padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)',
             background: 'var(--bg3)', display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 42 },
  toPill:  { background: 'var(--primary-l)', color: 'var(--primary)', borderRadius: 20,
             padding: '3px 12px', fontSize: 13, fontWeight: 600 },

  input:    { padding: '11px 14px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--bg2)', fontSize: 14, color: 'var(--text)', outline: 'none' },
  textarea: { padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--bg2)', fontSize: 14, color: 'var(--text)', outline: 'none',
              resize: 'vertical', minHeight: 240, lineHeight: 1.6, flex: 1 },

  editorWrap: {
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--bg2)',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 320,
    overflow: 'hidden',
  },

  resultBox:  { padding: '12px 16px', borderRadius: 8, fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 },
  resultOk:   { background: 'rgba(34,197,94,0.1)', color: 'var(--success)', border: '1px solid rgba(34,197,94,0.25)' },

  sendBtn:    { padding: '14px 28px', borderRadius: 10, border: 'none', background: 'var(--primary)',
                color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start' },
  sendBtnOff: { background: 'var(--text3)', cursor: 'not-allowed' },
};
