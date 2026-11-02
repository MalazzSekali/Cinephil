"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type User = { id: string; username: string; display_name: string };
type Item = {
  id: string; media_id: string; category: string; title: string; poster_url: string | null;
  source_url: string | null; status: string; progress: number; progress_total: number | null; season_count: number | null;
  rating: number | null; review: string | null; is_favorite: boolean;
};
type Result = { id: string; category: string; title: string; description?: string; year: string; poster: string | null; progress_total: number | null; season_count?: number | null; external_url?: string };

const categories = ["all", "movie", "tv", "anime", "manga", "manhwa"];
const labels: Record<string, string> = { movie: "Movie", tv: "TV Series", anime: "Anime", manga: "Manga", manhwa: "Manhwa" };
const statuses: Record<string, string> = { plan: "Plan to watch", current: "In progress", completed: "Completed", hold: "On hold", dropped: "Dropped" };
const chartColors: Record<string, string> = { plan: "#d9fb71", current: "#9bb9ff", completed: "#ffb86c", hold: "#db9cff", dropped: "#77776e" };

export default function Dashboard({ initialUser, view = "overview" }: { initialUser: User | null; view?: "overview" | "collection" | "discover" }) {
  const [user, setUser] = useState(initialUser);
  const [items, setItems] = useState<Item[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [results, setResults] = useState<Result[]>([]);
  const [searchMessage, setSearchMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("all");
  const [err, setErr] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [savingManual, setSavingManual] = useState(false);

  useEffect(() => { if (user) void load(); }, [user]);

  useEffect(() => {
    const term = query.trim();
    if (!term) { setResults([]); setSearchMessage(""); setBusy(false); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setBusy(true); setSearchMessage("");
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(term)}&type=${category}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message ?? "Search is unavailable right now.");
        setResults(data.results ?? []); setSearchMessage(data.message ?? "");
      } catch (error) {
        if (!controller.signal.aborted) { setResults([]); setSearchMessage(error instanceof Error ? error.message : "Search is unavailable right now."); }
      } finally { if (!controller.signal.aborted) setBusy(false); }
    }, 120);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, category]);

  async function load() {
    try {
      const response = await fetch("/api/collection");
      if (response.ok) setItems((await response.json()).items ?? []);
    } catch { setErr("Could not load your collection. Try refreshing the page."); }
  }

  async function add(item: Result) {
    if (!user) { location.href = "/login"; return; }
    setErr("");
    try {
      const response = await fetch("/api/collection", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ media_id: item.id, category: item.category, title: item.title, poster_url: item.poster, source_url: item.external_url ?? null, season_count: item.season_count ?? null, status: "plan", progress_total: item.progress_total }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save this title.");
      setResults(current => current.filter(result => result.id !== item.id));
      await load();
    } catch (error) { setErr(error instanceof Error ? error.message : "Could not save this title."); }
  }

  async function addManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) { location.href = "/login"; return; }
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const title = String(form.get("title") ?? "").trim();
    const category = String(form.get("category") ?? "movie");
    const sourceUrl = String(form.get("source_url") ?? "").trim();
    const poster = String(form.get("poster_url") ?? "").trim();
    setSavingManual(true); setErr("");
    try {
      const response = await fetch("/api/collection", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ media_id: `manual:${crypto.randomUUID()}`, category, title, source_url: sourceUrl || null, poster_url: poster || null, status: "plan" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save this title.");
      formElement.reset(); setShowManual(false); await load();
    } catch (error) { setErr(error instanceof Error ? error.message : "Could not save this title."); }
    finally { setSavingManual(false); }
  }

  async function update(item: Item, patch: Partial<Item>) {
    const response = await fetch("/api/collection", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: item.id, ...patch }) });
    if (response.ok) await load(); else setErr((await response.json()).error ?? "Could not update this title.");
  }

  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); setUser(null); setItems([]); }
  const counts = useMemo(() => ({ completed: items.filter(item => item.status === "completed").length, watching: items.filter(item => item.status === "current").length, plan: items.filter(item => item.status === "plan").length, rated: items.filter(item => item.rating).length }), [items]);
  const statusCounts = useMemo(() => Object.fromEntries(Object.keys(statuses).map(status => [status, items.filter(item => item.status === status).length])), [items]);
  const chart = useMemo(() => {
    if (!items.length) return "#292927 0deg 360deg";
    let start = 0;
    return Object.keys(statuses).map(status => {
      const end = start + Number(statusCounts[status]) / items.length * 360;
      const segment = `${chartColors[status]} ${start}deg ${end}deg`; start = end; return segment;
    }).join(", ");
  }, [items.length, statusCounts]);
  const shown = items.filter(item => filter === "all" || item.status === filter);
  const progress = items.filter(item => item.status === "current");
  const recent = items.slice().sort((a, b) => b.id.localeCompare(a.id)).slice(0, 4);

  return <main className="app" data-view={view}><div className="shell">
    <header className="topbar"><a href="/" className="brand" style={{ textDecoration: "none", color: "inherit" }}>cinephil<b>•</b></a><nav className="nav"><a className={view === "overview" ? "active" : ""} href="/">Overview</a><a className={view === "collection" ? "active" : ""} href="/collection">My collection</a><a className={view === "discover" ? "active" : ""} href="/discover">Discover</a></nav><div style={{ display: "flex", alignItems: "center", gap: 12 }}>{user ? <><button className="btn" style={{ height: 34, padding: "0 11px", fontSize: 11 }} onClick={logout}>Log out</button><div className="avatar">{user.username.slice(0, 2).toUpperCase()}</div></> : <a href="/login" className="btn" style={{ height: 34, padding: "8px 13px", fontSize: 11, textDecoration: "none" }}>Sign in</a>}</div></header>
    <section className="hero"><div><div className="eyebrow">Your personal universe</div><h1>{user ? `Good to see you, ${user.display_name}.` : "Stories stay with us."}</h1><p>Every film, episode, and chapter — all in one place.</p></div><div className="date">YOUR LIFE IN STORIES</div></section>
    <section className="stats"><div className="stat"><label>Completed</label><strong>{counts.completed}<small>titles</small></strong></div><div className="stat"><label>In progress</label><strong>{counts.watching}<small>right now</small></strong></div><div className="stat"><label>On your list</label><strong>{counts.plan}<small>up next</small></strong></div><div className="stat"><label>Your ratings</label><strong>{counts.rated}<small>shared</small></strong></div></section>

    <section id="discover"><div className="section-head"><h2>Find your next story</h2><span style={{ fontSize: 11, color: "#89887f" }}>Movies · series · anime · manga · manhwa</span></div><div className="toolbar"><div className="search"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search titles, creators, or genres…" aria-label="Search stories" /></div><select className="select" value={category} onChange={event => setCategory(event.target.value)} aria-label="Search category">{categories.map(value => <option key={value} value={value}>{value === "all" ? "Everything" : labels[value]}</option>)}</select><button className="btn-primary" onClick={() => { if (!user) location.href = "/login"; else setShowManual(true); }}>＋ Add manually</button></div>{err && <div className="error" role="alert">{err}</div>}{query && <><div className="results">{results.map(item => <div className="result-card" key={item.id}><div className="poster">{item.poster ? <img src={item.poster} alt={`Poster for ${item.title}`} /> : <div className="empty-poster">✳</div>}</div><h3>{item.title}</h3><p>{labels[item.category]} {item.year && `· ${item.year}`}</p>{item.description && <p className="result-description">{item.description}</p>}<button onClick={() => void add(item)}>＋ Add to collection</button></div>)}</div>{busy && <p className="search-note">Searching…</p>}{!busy && searchMessage && <p className="search-note">{searchMessage}</p>}</>}</section>

    <div className="content-grid"><section id="collection"><div className="section-head"><h2>Your collection</h2><select className="select" style={{ height: 32, padding: "0 9px", fontSize: 11 }} value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All titles</option>{Object.keys(statuses).map(status => <option value={status} key={status}>{statuses[status]}</option>)}</select></div><div className="poster-grid">{shown.slice(0, 10).map(item => <article key={item.id} className="poster">{item.poster_url ? <img src={item.poster_url} alt={`Poster for ${item.title}`} /> : <div className="empty-poster">✳</div>}<div className="poster-info"><span className="tag">{labels[item.category] ?? item.category}</span><strong>{item.title}</strong><span>{statuses[item.status]}{item.progress_total ? ` · ${item.progress}/${item.progress_total}` : ""}</span>{item.source_url && <a className="source-link" href={item.source_url} target="_blank" rel="noreferrer">↗ Open link</a>}<div style={{ display: "flex", gap: 5, marginTop: 8 }}><select aria-label={`Status for ${item.title}`} value={item.status} onChange={event => void update(item, { status: event.target.value })} style={{ minWidth: 0, width: "100%", background: "#1c1c19", color: "#eee", border: "1px solid #555", borderRadius: 4, fontSize: 9 }}>{Object.keys(statuses).map(status => <option key={status} value={status}>{statuses[status]}</option>)}</select><button title={item.is_favorite ? "Remove favorite" : "Add favorite"} onClick={() => void update(item, { is_favorite: !item.is_favorite })} style={{ border: "1px solid #666", background: "#1c1c19", color: item.is_favorite ? "#d9fb71" : "white", borderRadius: 4, fontSize: 12, padding: "3px 7px" }}>{item.is_favorite ? "♥" : "♡"}</button><button title="Remove" onClick={async () => { await fetch(`/api/collection?id=${item.id}`, { method: "DELETE" }); await load(); }} style={{ border: "1px solid #666", background: "#1c1c19", color: "white", borderRadius: 4, fontSize: 9, padding: "3px 7px" }}>×</button></div><div style={{ marginTop: 6, color: "#d9fb71", fontSize: 10 }}>Your rating <select aria-label={`Rating for ${item.title}`} value={item.rating ?? ""} onChange={event => void update(item, { rating: event.target.value ? Number(event.target.value) : null })} style={{ background: "#1c1c19", color: "#eee", border: "1px solid #555", borderRadius: 4, fontSize: 9 }}><option value="">—</option>{Array.from({ length: 10 }, (_, index) => <option value={index + 1} key={index}>{index + 1}/10</option>)}</select></div></div></article>)}{shown.length === 0 && <div style={{ gridColumn: "1/-1", padding: "45px 15px", border: "1px dashed #35352f", borderRadius: 8, textAlign: "center", color: "#99988f", fontSize: 13 }}>Your collection starts with a story. Search above or add a title manually.</div>}</div><div className="section-head" id="activity"><h2>Recently added</h2></div>{recent.length ? recent.map(item => <div className="activity" key={item.id}><i className="dot" /><span><b>{item.title}</b> added to your {statuses[item.status]?.toLowerCase()} list</span></div>) : <p style={{ color: "#777", fontSize: 12 }}>Your recent activity will show here.</p>}</section>

    <aside className="side"><div className="side-card"><h3>In your rotation</h3>{progress.length ? progress.slice(0, 4).map(item => <div key={item.id}><div className="bar-row"><span>{item.title}</span><span>{item.progress_total ? `${item.progress}/${item.progress_total}` : `${item.progress}`}</span></div><div className="bar"><i style={{ width: `${item.progress_total ? Math.min(100, item.progress / item.progress_total * 100) : Math.min(90, item.progress * 5)}%` }} /></div><button onClick={() => void update(item, { progress: item.progress + 1 })} style={{ background: "none", color: "#d9fb71", border: 0, padding: "7px 0", fontSize: 10 }}>＋ Update progress</button></div>) : <p style={{ fontSize: 11, color: "#89887f", lineHeight: 1.6 }}>Titles you’re currently watching or reading will find their home here.</p>}</div>
      <div className="side-card"><h3>Collection at a glance</h3>{items.length ? <div className="status-chart-wrap"><div className="status-chart" style={{ background: `conic-gradient(${chart})` }}><div><strong>{items.length}</strong><span>titles</span></div></div><div className="chart-legend">{Object.entries(statuses).map(([status, label]) => <div key={status}><i style={{ background: chartColors[status] }} /><span>{label}</span><b>{statusCounts[status]}</b></div>)}</div></div> : <p className="chart-empty">Your status chart will appear as you add stories.</p>}</div>
      <div className="side-card"><h3>By format</h3>{categories.slice(1).map(value => { const count = items.filter(item => item.category === value).length; return <div key={value}><div className="bar-row"><span>{labels[value]}</span><span>{count}</span></div><div className="bar"><i style={{ width: `${items.length ? Math.max(count ? 4 : 0, count / items.length * 100) : 0}%` }} /></div></div>})}</div><div className="side-card"><h3>A little about you</h3><p style={{ fontSize: 11, color: "#99988f", lineHeight: 1.7, margin: 0 }}>{user ? `@${user.username} · collecting stories since today.` : "Sign in to keep your collection synced across devices."}</p></div></aside></div>
    <footer style={{ borderTop: "1px solid #252523", marginTop: 40, padding: "22px 0", color: "#706f68", fontSize: 10 }}>CINEPHIL <span style={{ float: "right" }}>A life in stories, at your own pace.</span></footer>
  </div><nav className="mobile-nav"><a href="/">Home</a><a href="/collection">Collection</a><a href="/discover">Discover</a></nav>

  {showManual && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setShowManual(false); }}><section className="manual-modal" role="dialog" aria-modal="true" aria-labelledby="manual-title"><button className="modal-close" aria-label="Close" onClick={() => setShowManual(false)}>×</button><div className="eyebrow">Your collection</div><h2 id="manual-title">Add a story manually</h2><p>Add a title the search can’t find. The link and poster are optional.</p><form onSubmit={addManual}><label>Title<input name="title" required maxLength={300} placeholder="Story title" /></label><label>Format<select name="category" defaultValue="movie">{categories.slice(1).map(value => <option key={value} value={value}>{labels[value]}</option>)}</select></label><label>Story link<input name="source_url" type="url" placeholder="https://…" /></label><label>Poster image link<input name="poster_url" type="url" placeholder="https://…" /></label><div className="modal-actions"><button className="btn" type="button" onClick={() => setShowManual(false)}>Cancel</button><button className="btn-primary" type="submit" disabled={savingManual}>{savingManual ? "Saving…" : "Add to collection"}</button></div></form></section></div>}
  </main>;
}

