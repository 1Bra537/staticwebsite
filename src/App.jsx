import { useState, useEffect, useCallback } from 'react'
import './App.css'

/* ─── API Config ─────────────────────────────────────────── */
const BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '/api' : 'https://8qyai5wzoh.execute-api.us-east-1.amazonaws.com/dev')
const API_KEY  = 'Nw2MkcM5s01ig6PDvqpeN8xOkesSjbrC4ELaRSls'

const headers = {
  'Content-Type': 'application/json',
  'x-api-key': API_KEY,
}

/* ─── API helpers ────────────────────────────────────────── */
// Lambda returns { statusCode, body: "JSON string" } — parse body if it's a string
const parseBody = (raw) => {
  if (raw === null || raw === undefined) return null
  // Already a plain object/array (API GW proxy passes through directly)
  if (typeof raw !== 'string') return raw
  try { return JSON.parse(raw) } catch { return raw }
}

const call = async (url, opts = {}) => {
  const r = await fetch(url, { ...opts, headers })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const json = await r.json()
  // Unwrap Lambda proxy envelope if present
  if (json && typeof json === 'object' && 'statusCode' in json && 'body' in json) {
    return parseBody(json.body)
  }
  return json
}

const api = {
  listAuthors:  ()     => call(`${BASE_URL}/list-authors`),
  getAuthor:    (id)   => call(`${BASE_URL}/get-author?id=${encodeURIComponent(id)}`),
  addAuthor:    (body) => call(`${BASE_URL}/add-author`,    { method: 'POST',   body: JSON.stringify(body) }),
  updateAuthor: (body) => call(`${BASE_URL}/update-author`, { method: 'PUT',    body: JSON.stringify(body) }),
  deleteAuthor: (id)   => call(`${BASE_URL}/delete-author`, { method: 'DELETE', body: JSON.stringify({ id }) }),
  bookAppt:     (body) => call(`${BASE_URL}/book-author`,   { method: 'POST',   body: JSON.stringify(body) }),
}

/* ─── Toast ──────────────────────────────────────────────── */
function ToastContainer({ toasts, dismiss }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span className="toast-icon">{t.type === 'success' ? '✓' : '✕'}</span>
          <span>{t.message}</span>
          <button className="toast-dismiss" onClick={() => dismiss(t.id)}>✕</button>
        </div>
      ))}
    </div>
  )
}

function useToast() {
  const [toasts, setToasts] = useState([])

  const push = useCallback((message, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }, [])

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, push, dismiss }
}

/* ─── Loader ─────────────────────────────────────────────── */
function Loader({ text = 'Loading…' }) {
  return (
    <div className="loader-container">
      <div className="spinner" />
      <p className="loader-text">{text}</p>
    </div>
  )
}

/* ─── Empty State ────────────────────────────────────────── */
function EmptyState({ icon, title, desc, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{desc}</p>
      {action}
    </div>
  )
}

/* ─── Author Card ────────────────────────────────────────── */
function AuthorCard({ author, onDelete }) {
  const initial = (author.author || '?')[0].toUpperCase()
  const name    = author.author || 'Unknown'
  const book    = author.img_url || '—'
  const id      = author.id || '—'

  return (
    <div className="author-card">
      <div className="author-card-header">
        <div className="author-avatar">{initial}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="author-id-badge">ID: {id}</span>
          {onDelete && (
            <button
              id={`delete-${id}`}
              className="btn btn-ghost btn-sm"
              onClick={() => onDelete(id, name)}
              title="Delete author"
              style={{ color: 'var(--error)', padding: '0.3rem 0.5rem', fontSize: '0.9rem' }}
            >
              🗑️
            </button>
          )}
        </div>
      </div>
      <h3>{name}</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        📚 Book
      </p>
      <p>{book}</p>
    </div>
  )
}

/* ─── Navbar ─────────────────────────────────────────────── */
const TABS = [
  { key: 'home',        icon: '🏛',  label: 'Home'          },
  { key: 'authors',     icon: '📚',  label: 'Authors'       },
  { key: 'add',         icon: '✍️',  label: 'Add Author'    },
  { key: 'lookup',      icon: '🔍',  label: 'Search / Edit' },
  { key: 'appointment', icon: '📅',  label: 'Appointment'   },
]

/* ─── Confirm Dialog ─────────────────────────────────────── */
function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(6px)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '2rem', maxWidth: '380px',
        width: '100%', boxShadow: 'var(--shadow-card)',
        animation: 'fadeInUp 0.3s ease both',
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem', textAlign: 'center' }}>🗑️</div>
        <h3 style={{ textAlign: 'center', marginBottom: '0.75rem', fontSize: '1.1rem' }}>Confirm Delete</h3>
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button id="confirm-delete-btn" className="btn btn-danger" onClick={onConfirm} style={{ flex: 1, justifyContent: 'center' }}>
            Delete
          </button>
          <button id="cancel-delete-btn" className="btn btn-secondary" onClick={onCancel} style={{ flex: 1, justifyContent: 'center' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function Navbar({ active, onTab }) {
  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <a className="navbar-logo" href="#" onClick={e => { e.preventDefault(); onTab('home') }}>
        <div className="navbar-logo-icon">📖</div>
        <span className="navbar-logo-text">Lit<span>Legacy</span></span>
      </a>
      <ul className="navbar-tabs" role="list">
        {TABS.map(t => (
          <li key={t.key}>
            <button
              id={`nav-${t.key}`}
              className={`navbar-tab ${active === t.key ? 'active' : ''}`}
              onClick={() => onTab(t.key)}
              aria-current={active === t.key ? 'page' : undefined}
            >
              <span className="tab-icon">{t.icon}</span>
              {t.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/* ─── Home Page ──────────────────────────────────────────── */
function HomePage({ onTab }) {
  return (
    <main className="hero section-animate">
      <div className="hero-bg-glow" aria-hidden="true" />
      <div className="hero-eyebrow">✨ A Literary Universe</div>
      <h1>Where <em>Great Authors</em><br />Meet Great Readers</h1>
      <p className="hero-sub">
        Discover the world's most celebrated literary voices. Browse profiles,
        add new authors, and book exclusive appointments — all in one place.
      </p>
      <div className="hero-actions">
        <button id="hero-browse" className="btn btn-primary" onClick={() => onTab('authors')}>
          📚 Browse Authors
        </button>
        <button id="hero-add" className="btn btn-secondary" onClick={() => onTab('add')}>
          ✍️ Add an Author
        </button>
        <button id="hero-book" className="btn btn-secondary" onClick={() => onTab('appointment')}>
          📅 Book Appointment
        </button>
      </div>
      <div className="hero-stats">
        <div className="hero-stat">
          <div className="hero-stat-value">∞</div>
          <div className="hero-stat-label">Authors</div>
        </div>
        <div className="hero-stat">
          <div className="hero-stat-value">24/7</div>
          <div className="hero-stat-label">Available</div>
        </div>
        <div className="hero-stat">
          <div className="hero-stat-value">AWS</div>
          <div className="hero-stat-label">Powered</div>
        </div>
      </div>
    </main>
  )
}

/* ─── Authors Gallery ────────────────────────────────────── */
function AuthorsPage({ toast }) {
  const [authors, setAuthors]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [confirmDel, setConfirmDel] = useState(null) // { id, name }
  const [deleting, setDeleting]     = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.listAuthors()
      // call() already unwraps the Lambda body string — data is now the parsed array
      const list = Array.isArray(data) ? data : []
      setAuthors(list)
    } catch (err) {
      setError('Failed to load authors. Please try again.')
      toast('Could not fetch authors from server.', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  const handleDelete = (id, name) => setConfirmDel({ id, name })

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await api.deleteAuthor(confirmDel.id)
      toast(`"${confirmDel.name}" has been deleted.`, 'success')
      setAuthors(prev => prev.filter(a => (a.id || a.authorId) !== confirmDel.id))
    } catch {
      toast('Failed to delete author.', 'error')
    } finally {
      setDeleting(false)
      setConfirmDel(null)
    }
  }

  useEffect(() => { load() }, [load])

  return (
    <div className="page section-animate">
      <header className="page-header">
        <h1>Author Gallery</h1>
        <p>Browse all registered authors in the LitLegacy database</p>
        <div className="gold-line" />
      </header>

      {loading && <Loader text="Fetching authors…" />}

      {!loading && error && (
        <EmptyState
          icon="⚠️"
          title="Something went wrong"
          desc={error}
          action={<button className="btn btn-primary" onClick={load}>Try Again</button>}
        />
      )}

      {!loading && !error && authors.length === 0 && (
        <EmptyState
          icon="📚"
          title="No authors yet"
          desc="Be the first to add a famous author to the collection."
        />
      )}

      {!loading && !error && authors.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Showing <strong style={{ color: 'var(--gold)' }}>{authors.length}</strong> author{authors.length !== 1 ? 's' : ''}
            </p>
            <button id="refresh-authors" className="btn btn-ghost btn-sm" onClick={load}>↻ Refresh</button>
          </div>
          <div className="author-grid">
            {authors.map((a, i) => <AuthorCard key={a.id || a.authorId || i} author={a} onDelete={handleDelete} />)}
          </div>
        </>
      )}

      {confirmDel && (
        <ConfirmDialog
          message={`Are you sure you want to permanently delete "${confirmDel.name}"? This action cannot be undone.`}
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDel(null)}
        />
      )}
    </div>
  )
}

/* ─── Add Author ─────────────────────────────────────────── */
function AddAuthorPage({ toast }) {
  const init = { id: '', author: '', img_url: '' }
  const [form, setForm]       = useState(init)
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.id.trim() || !form.author.trim()) {
      toast('ID and Author Name are required.', 'error')
      return
    }
    setLoading(true)
    try {
      await api.addAuthor({
        id:      form.id.trim(),
        author:  form.author.trim(),
        img_url: form.img_url.trim(),
      })
      toast(`Author "${form.author}" added successfully! 🎉`, 'success')
      setForm(init)
    } catch (err) {
      toast('Failed to add author. Please check the details.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page section-animate">
      <header className="page-header">
        <h1>Add an Author</h1>
        <p>Register a new author into the LitLegacy collection</p>
        <div className="gold-line" />
      </header>

      <div className="form-container">
        <form className="form-card" onSubmit={submit} noValidate>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="add-id">Author ID *</label>
              <input
                id="add-id"
                className="form-input"
                type="text"
                placeholder="e.g. auth001"
                value={form.id}
                onChange={set('id')}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="add-name">Full Name *</label>
              <input
                id="add-name"
                className="form-input"
                type="text"
                placeholder="e.g. Ernest Hemingway"
                value={form.author}
                onChange={set('author')}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="add-desc">Book / Notable Work</label>
            <input
              id="add-desc"
              className="form-input"
              placeholder="e.g. Atomic Habits"
              value={form.img_url}
              onChange={set('img_url')}
            />
          </div>

          <button id="add-submit" className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? '⏳ Adding…' : '✍️ Add Author'}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ─── Lookup / Edit Page ─────────────────────────────────── */
function LookupPage({ toast }) {
  const [searchId, setSearchId]     = useState('')
  const [author,   setAuthor]       = useState(null)
  const [loading,  setLoading]      = useState(false)
  const [editing,  setEditing]      = useState(false)
  const [editForm, setEditForm]     = useState({ author: '', img_url: '' })
  const [saving,   setSaving]       = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  const lookup = async (e) => {
    e.preventDefault()
    if (!searchId.trim()) return
    setLoading(true)
    setAuthor(null)
    setEditing(false)
    try {
      const data = await api.getAuthor(searchId.trim())
      const record = data || null
      if (!record || !record.id) {
        toast('No author found with that ID.', 'error')
      } else {
        setAuthor(record)
        setEditForm({ author: record.author || '', img_url: record.img_url || '' })
      }
    } catch {
      toast('Error looking up author.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const saveUpdate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.updateAuthor({
        id:      searchId.trim(),
        author:  editForm.author.trim(),
        img_url: editForm.img_url.trim(),
      })
      toast('Author updated successfully! ✓', 'success')
      setAuthor(prev => ({ ...prev, author: editForm.author, img_url: editForm.img_url }))
      setEditing(false)
    } catch {
      toast('Failed to update author.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.deleteAuthor(searchId.trim())
      toast(`"${author.author || author.name}" has been deleted.`, 'success')
      setAuthor(null)
      setSearchId('')
      setConfirmDel(false)
    } catch {
      toast('Failed to delete author.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const initial = author ? (author.author || author.name || '?')[0].toUpperCase() : '?'

  return (
    <div className="page section-animate">
      <header className="page-header">
        <h1>Lookup & Edit</h1>
        <p>Search for an author by their ID, view their profile, and update their details</p>
        <div className="gold-line" />
      </header>

      <div className="form-container">
        <form onSubmit={lookup} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <span className="search-icon">🔍</span>
            <input
              id="lookup-id"
              className="search-input"
              type="text"
              placeholder="Enter Author ID (e.g. auth001)…"
              value={searchId}
              onChange={e => setSearchId(e.target.value)}
            />
          </div>
          <button id="lookup-submit" className="btn btn-primary" type="submit" disabled={loading || !searchId.trim()}>
            {loading ? '⏳' : 'Search'}
          </button>
        </form>

        {loading && <Loader text="Looking up author…" />}

        {author && !loading && (
          <div className="lookup-result">
            <div className="lookup-result-header">
              <div className="lookup-avatar">{initial}</div>
              <div className="lookup-meta">
                <h2>{author.author}</h2>
                <p>
                  <span className="author-id-badge">ID: {author.id || searchId}</span>
                </p>
              </div>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              📚 Book
            </p>
            <p style={{ color: 'var(--text)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              {author.img_url || '—'}
            </p>

            {!editing ? (
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button id="edit-author-btn" className="btn btn-secondary" onClick={() => setEditing(true)}>
                  ✏️ Edit Author
                </button>
                <button
                  id="delete-author-lookup-btn"
                  className="btn btn-danger"
                  onClick={() => setConfirmDel(true)}
                  disabled={deleting}
                >
                  🗑️ Delete Author
                </button>
              </div>
            ) : (
              <div className="update-panel">
                <h3>✏️ Update Author</h3>
                <form onSubmit={saveUpdate}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-name">Full Name</label>
                    <input
                      id="edit-name"
                      className="form-input"
                      value={editForm.author}
                      onChange={e => setEditForm(p => ({ ...p, author: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-desc">Book / Notable Work</label>
                    <input
                      id="edit-desc"
                      className="form-input"
                      placeholder="e.g. Atomic Habits"
                      value={editForm.img_url}
                      onChange={e => setEditForm(p => ({ ...p, img_url: e.target.value }))}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button id="save-update-btn" className="btn btn-primary" type="submit" disabled={saving}>
                      {saving ? '⏳ Saving…' : '✓ Save Changes'}
                    </button>
                    <button className="btn btn-ghost" type="button" onClick={() => setEditing(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>

      {confirmDel && (
        <ConfirmDialog
          message={`Are you sure you want to permanently delete "${author?.author || author?.name}"? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDel(false)}
        />
      )}
    </div>
  )
}

/* ─── Appointment Page ───────────────────────────────────── */
function AppointmentPage({ toast }) {
  const today = new Date().toISOString().split('T')[0]
  const init = { authorId: '', name: '', email: '', date: '', time: '', notes: '' }
  const [form, setForm]       = useState(init)
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.authorId.trim() || !form.name.trim() || !form.email.trim() || !form.date || !form.time) {
      toast('Please fill in all required fields.', 'error')
      return
    }
    setLoading(true)
    try {
      await api.bookAppt({
        authorId:    form.authorId.trim(),
        name:        form.name.trim(),
        email:       form.email.trim(),
        date:        form.date,
        time:        form.time,
        notes:       form.notes.trim(),
      })
      toast('Appointment booked successfully! 📅', 'success')
      setForm(init)
    } catch {
      toast('Failed to book appointment. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page section-animate">
      <header className="page-header">
        <h1>Book an Appointment</h1>
        <p>Schedule a personal meeting with your favourite author</p>
        <div className="gold-line" />
      </header>

      <div className="form-container">
        <div className="appointment-info">
          <span>📌</span>
          <span>
            Appointments are subject to author availability. You will receive a confirmation
            email once your request has been reviewed and accepted.
          </span>
        </div>

        <form className="form-card" onSubmit={submit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="appt-author-id">Author ID *</label>
            <input
              id="appt-author-id"
              className="form-input"
              type="text"
              placeholder="Enter the author's ID (e.g. auth001)"
              value={form.authorId}
              onChange={set('authorId')}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="appt-name">Your Name *</label>
              <input
                id="appt-name"
                className="form-input"
                type="text"
                placeholder="Full name"
                value={form.name}
                onChange={set('name')}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="appt-email">Email *</label>
              <input
                id="appt-email"
                className="form-input"
                type="email"
                placeholder="your@email.com"
                value={form.email}
                onChange={set('email')}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="appt-date">Preferred Date *</label>
              <input
                id="appt-date"
                className="form-input"
                type="date"
                min={today}
                value={form.date}
                onChange={set('date')}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="appt-time">Preferred Time *</label>
              <input
                id="appt-time"
                className="form-input"
                type="time"
                value={form.time}
                onChange={set('time')}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="appt-notes">Additional Notes</label>
            <textarea
              id="appt-notes"
              className="form-textarea"
              placeholder="What would you like to discuss? Any specific books or topics…"
              value={form.notes}
              onChange={set('notes')}
              rows={4}
            />
          </div>

          <button id="appt-submit" className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? '⏳ Booking…' : '📅 Book Appointment'}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ─── Footer ─────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="footer">
      <p>© {new Date().getFullYear()} <span>LitLegacy</span> — Celebrating the world's greatest literary minds.</p>
    </footer>
  )
}

/* ─── App Root ───────────────────────────────────────────── */
export default function App() {
  const [tab, setTab]       = useState('home')
  const { toasts, push, dismiss } = useToast()

  const pages = {
    home:        <HomePage        onTab={setTab} />,
    authors:     <AuthorsPage     toast={push} />,
    add:         <AddAuthorPage   toast={push} />,
    lookup:      <LookupPage      toast={push} />,
    appointment: <AppointmentPage toast={push} />,
  }

  return (
    <>
      <Navbar active={tab} onTab={setTab} />
      {pages[tab] ?? pages.home}
      <Footer />
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </>
  )
}
