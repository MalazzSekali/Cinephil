"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowDownAZ, ArrowUpRight, BookOpen, Check, ChevronDown, CircleUserRound,
  Compass, Film, Heart, Layers3, LogOut, Minus, Plus, Search, Sparkles,
  Star, Trash2, Tv, X,
} from "lucide-react";

type User = { id: string; username: string; display_name: string };
type Item = {
  id: string; media_id: string; category: string; title: string; poster_url: string | null;
  source_url: string | null; status: string; progress: number; progress_total: number | null;
  season_count: number | null; rating: number | null; review: string | null;
  is_favorite: boolean; updated_at?: string;
};
type Result = {
  id: string; category: string; title: string; description?: string; year: string;
  poster: string | null; progress_total: number | null; season_count?: number | null;
  external_url?: string;
};
type View = "overview" | "collection" | "discover";

const categories = ["all", "movie", "tv", "anime", "manga", "manhwa"];
const labels: Record<string, string> = {
  movie: "Film", tv: "Series", anime: "Anime", manga: "Manga", manhwa: "Manhwa",
};
const statuses: Record<string, string> = {
  plan: "Want to explore", current: "In progress", completed: "Completed",
  hold: "On hold", dropped: "Dropped",
};
const statusColors: Record<string, string> = {
  plan: "#d8ff72", current: "#97c2ff", completed: "#ffc785",
  hold: "#d5a7ff", dropped: "#85868b",
};
const formatIcon: Record<string, typeof Film> = {
  movie: Film, tv: Tv, anime: Sparkles, manga: BookOpen, manhwa: BookOpen,
};

function formatLabel(category: string) {
  return labels[category] ?? category;
}

function progressUnit(category: string) {
  return category === "manga" || category === "manhwa" ? "chapters" : "episodes";
}

function Poster({ src, title, category }: { src: string | null; title: string; category: string }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  const Icon = formatIcon[category] ?? Film;

  return <div className="poster-art">
    {src && !broken ? <img src={src} alt={`Cover art for ${title}`} loading="lazy" onError={() => setBroken(true)} /> :
      <div className={`poster-fallback fallback-${category}`}><Icon size={20} strokeWidth={1.5} /><strong>{title.slice(0, 1).toUpperCase()}</strong><span>{title}</span></div>}
    <div className="poster-shade" />
  </div>;
}

function StatCard({ label, value, note, icon: Icon, tint }: {
  label: string; value: number; note: string; icon: typeof Film; tint: string;
}) {
  return <article className="stat-card">
    <div className="stat-top"><span>{label}</span><i style={{ color: tint }}><Icon size={17} /></i></div>
    <div className="stat-value">{value}</div><div className="stat-note">{note}</div>
  </article>;
}

function CollectionCard({ item, onUpdate, onRemove }: {
  item: Item; onUpdate: (item: Item, patch: Partial<Item>) => void; onRemove: (item: Item) => void;
}) {
  const hasProgress = item.category !== "movie";
  const complete = item.progress_total ? Math.min(100, item.progress / item.progress_total * 100) : 0;
  const [rating, setRating] = useState(item.rating?.toString() ?? "");
  useEffect(() => setRating(item.rating?.toString() ?? ""), [item.rating]);

  return <article className="collection-card">
    <div className="collection-art-wrap"><Poster src={item.poster_url} title={item.title} category={item.category} />
      <span className={`status-pill status-${item.status}`}><i />{statuses[item.status] ?? item.status}</span>
      <button className={`favorite-button ${item.is_favorite ? "is-favorite" : ""}`} aria-label={item.is_favorite ? `Remove ${item.title} from favorites` : `Add ${item.title} to favorites`} onClick={() => onUpdate(item, { is_favorite: !item.is_favorite })}><Heart size={16} fill={item.is_favorite ? "currentColor" : "none"} /></button>
    </div>
    <div className="collection-card-body">
      <div className="card-kicker">{formatLabel(item.category)}{item.season_count ? ` · ${item.season_count} seasons` : ""}</div>
      <h3 title={item.title}>{item.title}</h3>
      {hasProgress && <div className="progress-block">
        <div className="progress-line"><span>{item.progress_total ? `${item.progress} / ${item.progress_total} ${progressUnit(item.category)}` : `${item.progress} ${progressUnit(item.category)}`}</span><b>{item.progress_total ? `${Math.round(complete)}%` : "TRACKING"}</b></div>
        {item.progress_total ? <div className="progress-track"><i style={{ width: `${complete}%` }} /></div> : null}
        <div className="stepper"><button aria-label={`Decrease progress for ${item.title}`} onClick={() => onUpdate(item, { progress: Math.max(0, item.progress - 1), ...(item.status === "completed" ? { status: "current" } : {}) })}><Minus size={13} /></button><span>Progress</span><button aria-label={`Increase progress for ${item.title}`} disabled={Boolean(item.progress_total && item.progress >= item.progress_total)} onClick={() => {
          const next = item.progress_total ? Math.min(item.progress_total, item.progress + 1) : item.progress + 1;
          const finished = item.progress_total !== null && item.progress_total > 0 && next >= item.progress_total;
          onUpdate(item, { progress: next, status: finished ? "completed" : item.status === "plan" ? "current" : item.status });
        }}><Plus size={13} /></button></div>
      </div>}
      <div className="card-controls">
        <label className="status-select"><span className="sr-only">Status for {item.title}</span><select aria-label={`Status for ${item.title}`} value={item.status} onChange={event => onUpdate(item, { status: event.target.value })}>{Object.entries(statuses).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><ChevronDown size={13} /></label>
        <label className="rating-select" title="Your rating"><Star size={14} fill={rating ? "currentColor" : "none"} /><span className="sr-only">Your rating for {item.title}</span><select aria-label={`Your rating for ${item.title}`} value={rating} onChange={event => { setRating(event.target.value); onUpdate(item, { rating: event.target.value ? Number(event.target.value) : null }); }}><option value="">Rate</option>{Array.from({ length: 10 }, (_, index) => <option value={index + 1} key={index}>{index + 1} / 10</option>)}</select></label>
        {item.source_url && <a className="icon-control" href={item.source_url} target="_blank" rel="noreferrer" aria-label={`Open link for ${item.title}`}><ArrowUpRight size={15} /></a>}
        <button className="icon-control remove-control" onClick={() => onRemove(item)} aria-label={`Remove ${item.title}`}><Trash2 size={14} /></button>
      </div>
    </div>
  </article>;
}

export default function Dashboard({ initialUser, view = "overview" }: { initialUser: User | null; view?: View }) {
  const [user, setUser] = useState(initialUser);
  const [items, setItems] = useState<Item[]>([]);
  const [collectionLoading, setCollectionLoading] = useState(Boolean(initialUser));
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [results, setResults] = useState<Result[]>([]);
  const [searchMessage, setSearchMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState("all");
  const [collectionQuery, setCollectionQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [err, setErr] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [savingManual, setSavingManual] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => { if (user) void load(); else setCollectionLoading(false); }, [user]);

  useEffect(() => {
    const term = query.trim();
    if (!term) { setResults([]); setSearchMessage(""); setBusy(false); return; }
    const controller = new AbortController();
    setResults([]);
    setSearchMessage("");
    setBusy(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(term)}&type=${category}`, { signal: controller.signal, cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message ?? "Search is unavailable right now.");
        setResults(data.results ?? []);
        setSearchMessage(data.message ?? "");
      } catch (error) {
        if (!controller.signal.aborted) {
          setResults([]);
          setSearchMessage(error instanceof Error ? error.message : "Search is unavailable right now.");
        }
      } finally { if (!controller.signal.aborted) setBusy(false); }
    }, 160);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, category]);

  async function load() {
    setCollectionLoading(true);
    try {
      const response = await fetch("/api/collection", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load your collection. Try refreshing the page.");
      setItems((await response.json()).items ?? []);
    } catch (error) { setErr(error instanceof Error ? error.message : "Could not load your collection."); }
    finally { setCollectionLoading(false); }
  }

  async function add(item: Result) {
    if (!user) { location.href = "/login"; return; }
    setErr(""); setAddingId(item.id);
    try {
      const response = await fetch("/api/collection", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ media_id: item.id, category: item.category, title: item.title, poster_url: item.poster, source_url: item.external_url ?? null, season_count: item.season_count ?? null, status: "plan", progress_total: item.progress_total }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save this title.");
      setResults(current => current.filter(result => result.id !== item.id));
      await load();
    } catch (error) { setErr(error instanceof Error ? error.message : "Could not save this title."); }
    finally { setAddingId(null); }
  }

  async function addManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) { location.href = "/login"; return; }
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const readNumber = (key: string) => {
      const value = String(form.get(key) ?? "").trim();
      return value ? Number(value) : null;
    };
    const title = String(form.get("title") ?? "").trim();
    const mediaCategory = String(form.get("category") ?? "movie");
    const sourceUrl = String(form.get("source_url") ?? "").trim();
    const poster = String(form.get("poster_url") ?? "").trim();
    setSavingManual(true); setErr("");
    try {
      const response = await fetch("/api/collection", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          media_id: `manual:${crypto.randomUUID()}`, category: mediaCategory, title,
          source_url: sourceUrl || null, poster_url: poster || null,
          season_count: readNumber("season_count"), progress_total: readNumber("progress_total"),
          progress: readNumber("progress") ?? 0, status: String(form.get("status") || "plan"),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save this title.");
      formElement.reset(); setShowManual(false); await load();
    } catch (error) { setErr(error instanceof Error ? error.message : "Could not save this title."); }
    finally { setSavingManual(false); }
  }

  async function update(item: Item, patch: Partial<Item>) {
    setErr("");
    try {
      const response = await fetch("/api/collection", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: item.id, ...patch }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not update this title.");
      setItems(current => current.map(value => value.id === item.id ? { ...value, ...data.item } : value));
    } catch (error) { setErr(error instanceof Error ? error.message : "Could not update this title."); }
  }

  async function remove(item: Item) {
    if (!window.confirm(`Remove “${item.title}” from your collection?`)) return;
    setErr("");
    try {
      const response = await fetch(`/api/collection?id=${encodeURIComponent(item.id)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not remove this title.");
      setItems(current => current.filter(value => value.id !== item.id));
    } catch (error) { setErr(error instanceof Error ? error.message : "Could not remove this title."); }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null); setItems([]); location.href = "/";
  }

  const counts = useMemo(() => ({
    completed: items.filter(item => item.status === "completed").length,
    current: items.filter(item => item.status === "current").length,
    plan: items.filter(item => item.status === "plan").length,
    favorites: items.filter(item => item.is_favorite).length,
  }), [items]);
  const statusCounts = useMemo(() => Object.fromEntries(Object.keys(statuses).map(status => [status, items.filter(item => item.status === status).length])) as Record<string, number>, [items]);
  const statusGradient = useMemo(() => {
    if (!items.length) return "#34352d 0deg 360deg";
    let start = 0;
    return Object.keys(statuses).map(status => {
      const end = start + Number(statusCounts[status]) / items.length * 360;
      const segment = `${statusColors[status]} ${start}deg ${end}deg`;
      start = end; return segment;
    }).join(", ");
  }, [items.length, statusCounts]);
  const inProgress = items.filter(item => item.status === "current");
  const recent = items.slice(0, 5);
  const visibleItems = useMemo(() => {
    const term = collectionQuery.trim().toLowerCase();
    const filtered = items.filter(item => (filter === "all" || item.status === filter)
      && (formatFilter === "all" || item.category === formatFilter)
      && (!term || item.title.toLowerCase().includes(term)));
    if (sortBy === "title") return filtered.sort((a, b) => a.title.localeCompare(b.title));
    if (sortBy === "rating") return filtered.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    if (sortBy === "progress") return filtered.sort((a, b) => (b.progress_total ? b.progress / b.progress_total : b.progress) - (a.progress_total ? a.progress / a.progress_total : a.progress));
    return filtered;
  }, [items, filter, formatFilter, collectionQuery, sortBy]);

  const viewCopy: Record<View, { eyebrow: string; title: string; description: string }> = {
    overview: { eyebrow: "Your personal cinema", title: user ? `Welcome back, ${user.display_name}.` : "A home for every story.", description: "Keep the films, series, anime and pages you love close." },
    collection: { eyebrow: "Your library, your rules", title: "My collection", description: "Everything you are watching, reading, saving and remembering." },
    discover: { eyebrow: "Find your next favorite", title: "Discover stories", description: "Search across film, television, anime, manga and manhwa." },
  };
  const copy = viewCopy[view];

  return <main className={`app view-${view}`}>
    <div className="ambient ambient-one" /><div className="ambient ambient-two" />
    <div className="shell">
      <header className="topbar">
        <a href="/" className="brand" aria-label="Cinephil home"><span className="brand-mark">c<span>•</span></span><span className="brand-word">cinephil</span></a>
        <nav className="nav" aria-label="Main navigation">
          <a className={view === "overview" ? "active" : ""} href="/"><Layers3 size={15} />Overview</a>
          <a className={view === "collection" ? "active" : ""} href="/collection"><BookOpen size={15} />My collection</a>
          <a className={view === "discover" ? "active" : ""} href="/discover"><Compass size={15} />Discover</a>
        </nav>
        {user ? <div className="account-area"><span className="account-name">{user.display_name}</span><div className="avatar">{user.username.slice(0, 2).toUpperCase()}</div><button className="logout-button" onClick={() => void logout()} title="Log out" aria-label="Log out"><LogOut size={15} /></button></div> : <a href="/login" className="sign-in-link">Sign in <ArrowUpRight size={15} /></a>}
      </header>

      <section className="hero">
        <div className="hero-copy"><div className="eyebrow"><span />{copy.eyebrow}</div><h1>{copy.title}</h1><p>{copy.description}</p></div>
        <div className="hero-badge"><div className="badge-icon"><Sparkles size={17} /></div><div><span>ALL YOUR STORIES</span><strong>{items.length.toString().padStart(2, "0")} <small>collected</small></strong></div></div>
      </section>

      {err && <div className="error-banner" role="alert"><span>{err}</span><button onClick={() => setErr("")} aria-label="Dismiss"><X size={16} /></button></div>}

      {view === "overview" && <>
        <section className="stats-grid" aria-label="Collection summary">
          <StatCard label="Finished" value={counts.completed} note="stories completed" icon={Check} tint="#d8ff72" />
          <StatCard label="In progress" value={counts.current} note="currently exploring" icon={Sparkles} tint="#a9c6ff" />
          <StatCard label="Up next" value={counts.plan} note="waiting in your list" icon={Layers3} tint="#ffcb91" />
          <StatCard label="Favorites" value={counts.favorites} note="all-time favorites" icon={Heart} tint="#f3a8c3" />
        </section>
        <div className="overview-grid">
          <section className="surface continue-section">
            <div className="section-heading"><div><span className="eyebrow">PICK UP WHERE YOU LEFT OFF</span><h2>In your rotation</h2></div><a href="/collection">View collection <ArrowUpRight size={14} /></a></div>
            {inProgress.length ? <div className="rotation-list">{inProgress.slice(0, 4).map(item => {
              const percentage = item.progress_total ? Math.min(100, item.progress / item.progress_total * 100) : 0;
              return <article className="rotation-item" key={item.id}><div className="rotation-cover"><Poster src={item.poster_url} title={item.title} category={item.category} /></div><div className="rotation-info"><div className="card-kicker">{formatLabel(item.category)}{item.season_count ? ` · ${item.season_count} seasons` : ""}</div><h3>{item.title}</h3><div className="progress-line"><span>{item.progress_total ? `${item.progress} / ${item.progress_total} ${progressUnit(item.category)}` : `${item.progress} ${progressUnit(item.category)} logged`}</span>{item.progress_total && <b>{Math.round(percentage)}%</b>}</div>{item.progress_total ? <div className="progress-track"><i style={{ width: `${percentage}%` }} /></div> : <div className="progress-track"><i style={{ width: `${Math.min(95, item.progress * 5)}%` }} /></div>}</div><button className="quick-add" disabled={Boolean(item.progress_total && item.progress >= item.progress_total)} onClick={() => { const next = item.progress_total ? Math.min(item.progress_total, item.progress + 1) : item.progress + 1; const complete = Boolean(item.progress_total && next >= item.progress_total); void update(item, { progress: next, status: complete ? "completed" : item.status }); }} aria-label={`Update progress for ${item.title}`}><Plus size={17} /></button></article>;
            })}</div> : <div className="empty-inline"><span className="empty-icon"><Sparkles size={19} /></span><div><strong>No stories in progress yet</strong><p>Move something to “In progress” and we’ll keep your place here.</p></div><a className="text-link" href="/discover">Find a story <ArrowUpRight size={14} /></a></div>}
          </section>
          <aside className="surface insight-card"><div className="section-heading"><div><span className="eyebrow">YOUR LIBRARY</span><h2>At a glance</h2></div></div>
            {items.length ? <><div className="chart-layout"><div className="status-chart" style={{ background: `conic-gradient(${statusGradient})` }}><div><strong>{items.length}</strong><span>stories</span></div></div><div className="chart-legend">{Object.entries(statuses).map(([status, label]) => <div key={status}><i style={{ background: statusColors[status] }} /><span>{label}</span><b>{statusCounts[status]}</b></div>)}</div></div>
              <div className="format-summary">{categories.slice(1).map(value => { const count = items.filter(item => item.category === value).length; const Icon = formatIcon[value]; return <div key={value}><span><Icon size={14} />{formatLabel(value)}</span><b>{count}</b></div>; })}</div></> : <div className="empty-chart"><div className="empty-chart-ring"><Layers3 size={20} /></div><strong>Your story map starts here</strong><p>Add a few titles and see your collection take shape.</p><a href="/discover">Explore titles <ArrowUpRight size={14} /></a></div>}
          </aside>
          <section className="surface recent-section"><div className="section-heading"><div><span className="eyebrow">THE LATEST CHAPTER</span><h2>Recently added</h2></div><a href="/collection">See all <ArrowUpRight size={14} /></a></div>
            {recent.length ? <div className="recent-list">{recent.map(item => <div className="recent-row" key={item.id}><div className="recent-cover"><Poster src={item.poster_url} title={item.title} category={item.category} /></div><div className="recent-copy"><strong>{item.title}</strong><span>{formatLabel(item.category)} <i>·</i> {statuses[item.status] ?? item.status}</span></div><span className={`tiny-status status-${item.status}`}><i /></span></div>)}</div> : <p className="muted-copy">Your newest films, shows and books will appear here.</p>}
          </section>
        </div>
      </>}

      {view === "collection" && <section className="library-view">
        <div className="library-toolbar"><label className="library-search"><Search size={17} /><input value={collectionQuery} onChange={event => setCollectionQuery(event.target.value)} placeholder="Find something in your collection" aria-label="Filter your collection" />{collectionQuery && <button onClick={() => setCollectionQuery("")} aria-label="Clear filter"><X size={15} /></button>}</label><button className="primary-button" onClick={() => user ? setShowManual(true) : location.href = "/login"}><Plus size={17} />Add a story</button></div>
        <div className="library-controls"><div className="filter-tabs" aria-label="Filter by status">{[["all", "Everything"], ...Object.entries(statuses)].map(([value, label]) => <button key={value} className={filter === value ? "selected" : ""} onClick={() => setFilter(value)}>{label}<span>{value === "all" ? items.length : statusCounts[value]}</span></button>)}</div><div className="filter-selects"><label className="select-wrap"><span className="sr-only">Filter by format</span><select value={formatFilter} onChange={event => setFormatFilter(event.target.value)}>{categories.map(value => <option key={value} value={value}>{value === "all" ? "All formats" : formatLabel(value)}</option>)}</select><ChevronDown size={14} /></label><label className="select-wrap sort-select"><ArrowDownAZ size={15} /><span className="sr-only">Sort collection</span><select value={sortBy} onChange={event => setSortBy(event.target.value)}><option value="recent">Recently updated</option><option value="title">Title A–Z</option><option value="rating">Top rated</option><option value="progress">Progress</option></select><ChevronDown size={14} /></label></div></div>
        <div className="library-count"><span>{collectionLoading ? "Loading your collection…" : `Showing ${visibleItems.length} of ${items.length} ${items.length === 1 ? "story" : "stories"}`}</span><span>YOUR COLLECTION</span></div>
        {collectionLoading ? <div className="collection-grid">{Array.from({ length: 8 }, (_, index) => <div className="skeleton-card" key={index}><div /><span /><i /></div>)}</div> : visibleItems.length ? <div className="collection-grid">{visibleItems.map(item => <CollectionCard key={item.id} item={item} onUpdate={(value, patch) => void update(value, patch)} onRemove={value => void remove(value)} />)}</div> : <div className="empty-state"><div className="empty-state-icon"><BookOpen size={22} /></div><span className="eyebrow">A FRESH PAGE</span><h2>{items.length ? "Nothing matches these filters" : "Your collection is waiting"}</h2><p>{items.length ? "Try a different format, status or search." : "Save stories from Discover or add one by hand to start building your library."}</p>{items.length ? <button className="secondary-button" onClick={() => { setFilter("all"); setFormatFilter("all"); setCollectionQuery(""); }}>Clear filters</button> : <a className="primary-button" href="/discover"><Compass size={16} />Discover stories</a>}</div>}
      </section>}

      {view === "discover" && <section className="discover-view">
        <div className="discover-search"><div className="big-search"><Search size={21} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Try a title, creator or genre…" aria-label="Search stories" autoComplete="off" />{query && <button onClick={() => setQuery("")} aria-label="Clear search"><X size={17} /></button>}<kbd>LIVE SEARCH</kbd></div>
          <label className="select-wrap category-select"><span className="sr-only">Search category</span><select value={category} onChange={event => setCategory(event.target.value)}>{categories.map(value => <option key={value} value={value}>{value === "all" ? "All stories" : formatLabel(value)}</option>)}</select><ChevronDown size={15} /></label>
          <button className="primary-button" onClick={() => user ? setShowManual(true) : location.href = "/login"}><Plus size={17} />Add manually</button>
        </div>
        <div className="discover-formats">{categories.map(value => <button key={value} className={category === value ? "selected" : ""} onClick={() => setCategory(value)}>{value === "all" ? <Layers3 size={14} /> : (() => { const Icon = formatIcon[value]; return <Icon size={14} />; })()}{value === "all" ? "All" : formatLabel(value)}</button>)}</div>
        {!query.trim() ? <div className="discover-welcome"><div className="welcome-orbit orbit-one" /><div className="welcome-orbit orbit-two" /><div className="welcome-symbol"><Search size={24} /></div><span className="eyebrow">A WORLD OF STORIES</span><h2>What are you in the mood for?</h2><p>Start typing to search across your favorite kinds of stories.</p><div className="welcome-chips">{["Harry Potter", "romance", "One Piece", "Dune"].map(term => <button key={term} onClick={() => setQuery(term)}>{term}<ArrowUpRight size={13} /></button>)}</div></div> : <>
          <div className="results-heading"><div><span className="eyebrow">SEARCH RESULTS</span><h2>{busy ? "Finding your next story…" : searchMessage ? "No matches this time" : `${results.length} ${results.length === 1 ? "story" : "stories"} found`}</h2></div>{query && <span className="query-chip"><Search size={13} />{query}</span>}</div>
          {busy ? <div className="discover-grid">{Array.from({ length: 8 }, (_, index) => <div className="skeleton-result" key={index}><div /><span /><i /></div>)}</div> : results.length ? <div className="discover-grid">{results.map(item => <article className="discover-card" key={`${item.category}-${item.id}`}><div className="discover-card-art"><Poster src={item.poster} title={item.title} category={item.category} /><span className="format-pill">{formatLabel(item.category)}</span></div><div className="discover-card-body"><h3 title={item.title}>{item.title}</h3><div className="result-meta">{item.year || "Year unknown"}{item.season_count ? ` · ${item.season_count} seasons` : ""}{item.progress_total ? ` · ${item.progress_total} ${item.category === "manga" || item.category === "manhwa" ? "chapters" : item.category === "movie" ? "min" : "episodes"}` : ""}</div>{item.description && <p>{item.description}</p>}<button onClick={() => void add(item)} disabled={addingId === item.id}><Plus size={15} />{addingId === item.id ? "Adding…" : "Add to collection"}</button></div></article>)}</div> : <div className="no-results"><div className="empty-state-icon"><Search size={20} /></div><strong>{searchMessage || "No matches found"}</strong><p>Try a shorter title or choose another format.</p></div>}
        </>}
      </section>}

      <footer className="footer"><span className="footer-brand">CINEPHIL<span>•</span></span><span>A little more room for the stories you love.</span><a href="/discover">Keep exploring <ArrowUpRight size={13} /></a></footer>
    </div>

    <nav className="mobile-nav" aria-label="Mobile navigation"><a className={view === "overview" ? "active" : ""} href="/"><Layers3 size={18} /><span>Home</span></a><a className={view === "collection" ? "active" : ""} href="/collection"><BookOpen size={18} /><span>Collection</span></a><a className={view === "discover" ? "active" : ""} href="/discover"><Compass size={18} /><span>Discover</span></a></nav>

    {showManual && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setShowManual(false); }}><section className="manual-modal" role="dialog" aria-modal="true" aria-labelledby="manual-title"><button className="modal-close" aria-label="Close" onClick={() => setShowManual(false)}><X size={18} /></button><span className="eyebrow">MAKE IT YOURS</span><h2 id="manual-title">Add a story</h2><p>Keep track of something the search can’t find. You can fill in more details later.</p><form onSubmit={addManual}>
      <label>Title<input name="title" required maxLength={300} placeholder="What are you watching or reading?" autoFocus /></label>
      <div className="form-pair"><label>Format<select name="category" defaultValue="movie">{categories.slice(1).map(value => <option key={value} value={value}>{formatLabel(value)}</option>)}</select></label><label>Status<select name="status" defaultValue="plan">{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
      <label>Story link <span>OPTIONAL</span><input name="source_url" type="url" placeholder="https://…" /></label>
      <label>Poster image link <span>OPTIONAL</span><input name="poster_url" type="url" placeholder="https://…" /></label>
      <div className="form-pair"><label>Seasons <span>OPTIONAL</span><input name="season_count" type="number" min="0" placeholder="e.g. 3" /></label><label>Episodes or chapters <span>OPTIONAL</span><input name="progress_total" type="number" min="0" placeholder="e.g. 24" /></label></div>
      <label>Progress so far <span>OPTIONAL</span><input name="progress" type="number" min="0" defaultValue="0" /></label>
      <div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setShowManual(false)}>Cancel</button><button className="primary-button" type="submit" disabled={savingManual}>{savingManual ? "Saving…" : <><Plus size={16} />Add to collection</>}</button></div>
    </form></section></div>}
  </main>;
}

