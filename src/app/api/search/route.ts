import { NextResponse } from "next/server";

type SearchResult = {
  id: string;
  category: "movie" | "tv" | "cartoon" | "anime" | "manga" | "manhwa" | "book" | "novel";
  title: string;
  author?: string;
  description?: string;
  year: string;
  poster: string | null;
  progress_total: number | null;
  season_count?: number | null;
  external_url?: string | null;
};

function isFiction(categories: string[] = [], subjects: string[] = []) {
  return [...categories, ...subjects].some(value => /fiction|novel|fantasy|romance|thriller|mystery|science fiction/i.test(value));
}

async function searchBooks(term: string, requestedType: "all" | "book" | "novel"): Promise<SearchResult[]> {
  const novelOnly = requestedType === "novel";
  const googleQuery = novelOnly ? `subject:fiction ${term}` : term;
  try {
    const data = await getJson(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(googleQuery)}&maxResults=15&printType=books&orderBy=relevance`);
    return (data.items ?? []).map((volume: any) => {
      const info = volume.volumeInfo ?? {};
      const fiction = isFiction(info.categories ?? []);
      const category = requestedType === "all" ? (fiction ? "novel" : "book") : requestedType;
      const image = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail ?? null;
      return {
        id: `googlebooks:${volume.id}`, category, title: info.title ?? "Untitled",
        author: Array.isArray(info.authors) ? info.authors.join(", ") : "",
        description: info.description ?? "",
        year: (info.publishedDate ?? "").slice(0, 4),
        poster: image ? image.replace("http://", "https://") : null,
        progress_total: Number.isInteger(info.pageCount) ? info.pageCount : null,
        external_url: info.infoLink ?? info.previewLink ?? null,
      } satisfies SearchResult;
    }).filter((result: SearchResult) => !novelOnly || result.category === "novel");
  } catch {
    const data = await getJson(`https://openlibrary.org/search.json?q=${encodeURIComponent(googleQuery)}&limit=15&fields=key,title,author_name,first_publish_year,cover_i,number_of_pages_median,subject`);
    return (data.docs ?? []).map((work: any) => {
      const fiction = isFiction([], work.subject ?? []);
      const category = requestedType === "all" ? (fiction ? "novel" : "book") : requestedType;
      return {
        id: `openlibrary:${work.key ?? work.title}`, category,
        title: work.title ?? "Untitled", author: (work.author_name ?? []).slice(0, 3).join(", "),
        description: "", year: work.first_publish_year ? String(work.first_publish_year) : "",
        poster: work.cover_i ? `https://covers.openlibrary.org/b/id/${work.cover_i}-L.jpg` : null,
        progress_total: work.number_of_pages_median ?? null,
        external_url: work.key ? `https://openlibrary.org${work.key}` : null,
      } satisfies SearchResult;
    }).filter((result: SearchResult) => !novelOnly || result.category === "novel");
  }
}

const tmdbGenres: Record<string, string> = {
  action: "28", adventure: "12", animation: "16", comedy: "35", crime: "80",
  documentary: "99", drama: "18", family: "10751", fantasy: "14", history: "36",
  horror: "27", music: "10402", mystery: "9648", romance: "10749", "science fiction": "878",
  thriller: "53", war: "10752", western: "37",
};

function isCartoon(item: any) {
  const countries: string[] = Array.isArray(item.origin_country) ? item.origin_country : [];
  const animated = Array.isArray(item.genre_ids) && item.genre_ids.includes(16);
  return animated && !countries.includes("JP") && item.original_language !== "ja";
}

function tmdbResult(item: any, kind: "movie" | "tv", category: "movie" | "tv" | "cartoon" = kind): SearchResult {
  return {
    id: `tmdb:${kind}:${item.id}`, category, title: item.title ?? item.name ?? "Untitled",
    description: item.overview ?? "", year: (item.release_date ?? item.first_air_date ?? "").slice(0, 4),
    poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
    progress_total: kind === "movie" ? item.runtime ?? null : item.number_of_episodes ?? null,
    season_count: item.number_of_seasons ?? null,
  };
}

function jikanResult(item: any, category: "anime" | "manga" | "manhwa"): SearchResult {
  return {
    id: `jikan:${category}:${item.mal_id}`, category, title: item.title_english ?? item.title ?? "Untitled",
    description: item.synopsis ?? "", year: item.year ? String(item.year) : "",
    poster: item.images?.jpg?.large_image_url ?? null, progress_total: item.episodes ?? item.chapters ?? null,
  };
}

function kitsuResult(item: any, category: "anime" | "manga" | "manhwa"): SearchResult {
  const attributes = item.attributes ?? {};
  return {
    id: `kitsu:${category}:${item.id}`, category,
    title: attributes.titles?.en ?? attributes.titles?.en_jp ?? attributes.canonicalTitle ?? "Untitled",
    description: attributes.synopsis ?? "", year: (attributes.startDate ?? "").slice(0, 4),
    poster: attributes.posterImage?.large ?? attributes.posterImage?.original ?? null,
    progress_total: attributes.episodeCount ?? attributes.chapterCount ?? null,
  };
}

async function getJson(url: string) {
  const response = await fetch(url, { next: { revalidate: 3600 } });
  if (!response.ok) throw new Error(`Search provider returned ${response.status}`);
  return response.json();
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const q = params.get("q")?.trim();
  const type = params.get("type") ?? "all";
  const validTypes = ["all", "movie", "tv", "cartoon", "anime", "manga", "manhwa", "book", "novel"];
  if (!q || q.length > 100) return NextResponse.json({ results: [], message: null });
  if (!validTypes.includes(type)) return NextResponse.json({ results: [], message: "Choose a valid category." }, { status: 400 });

  const tasks: Promise<SearchResult[]>[] = [];
  if (["all", "book", "novel"].includes(type)) {
    tasks.push(searchBooks(q, type as "all" | "book" | "novel").catch(() => []));
  }
  const apiKey = process.env.TMDB_API_KEY;
  const genreId = tmdbGenres[q.toLowerCase()];

  if (apiKey && ["all", "movie", "tv", "cartoon"].includes(type)) {
    const kinds: Array<"movie" | "tv"> = type === "all" ? ["movie", "tv"] : type === "cartoon" ? ["tv"] : [type as "movie" | "tv"];
    const bearerToken = apiKey.length > 50;
    for (const kind of kinds) {
      const endpoint = genreId
        ? `discover/${kind}?with_genres=${genreId}&sort_by=popularity.desc&include_adult=false`
        : `search/${kind}?query=${encodeURIComponent(q)}&include_adult=false`;
      const url = `https://api.themoviedb.org/3/${endpoint}${bearerToken ? "" : `&api_key=${encodeURIComponent(apiKey)}`}`;
      const headers: Record<string, string> = { accept: "application/json" };
      if (bearerToken) headers.Authorization = `Bearer ${apiKey}`;
      const searchTask: Promise<SearchResult[]> = fetch(url, { headers, next: { revalidate: 3600 } })
        .then(async response => { if (!response.ok) throw new Error(`TMDB returned ${response.status}`); return response.json(); })
        .then(data => (data.results ?? []).slice(0, 12).map((item: any) => {
          const category = kind === "tv" && isCartoon(item) ? "cartoon" : kind;
          return tmdbResult(item, kind, category);
        }).filter((item: SearchResult) => type === "cartoon" ? item.category === "cartoon" : type !== "tv" || item.category === "tv"))
        .catch(() => [] as SearchResult[]);
      tasks.push(searchTask);

      // Search responses omit movie runtimes and TV season/episode totals.
      // Enrich in a separate streamed batch so the first cards still appear immediately.
      {
        const detailTask: Promise<SearchResult[]> = searchTask.then((results: SearchResult[]) => Promise.all(results.map(async (item: SearchResult): Promise<SearchResult | null> => {
          const mediaId = item.id.slice(`tmdb:${kind}:`.length);
          if (!/^\d+$/.test(mediaId)) return null;
          try {
            const detailUrl = `https://api.themoviedb.org/3/${kind}/${mediaId}${bearerToken ? "" : `?api_key=${encodeURIComponent(apiKey)}`}`;
            const response = await fetch(detailUrl, { headers, next: { revalidate: 3600 } });
            if (!response.ok) return null;
            const details = await response.json();
            const runtime = kind === "movie" ? details.runtime : null;
            const episodes = kind === "tv" ? details.number_of_episodes : null;
            const seasons = kind === "tv" ? details.number_of_seasons : null;
            if (kind === "movie" && !Number.isFinite(runtime)) return null;
            if (kind === "tv" && !Number.isFinite(episodes) && !Number.isFinite(seasons)) return null;
            return {
              ...item,
              season_count: seasons ?? item.season_count ?? null,
              progress_total: runtime ?? episodes ?? item.progress_total ?? null,
            } satisfies SearchResult;
          } catch {
            return null;
          }
        }))).then((enriched: Array<SearchResult | null>) => enriched.filter((item): item is SearchResult => item !== null));
        tasks.push(detailTask);
      }
    }
  } else if (["all", "movie"].includes(type)) {
    // Wikipedia's public search provides a useful film fallback without requiring an API key.
    tasks.push((async () => {
      const wikiQuery = `${q} film`;
      const data = await getJson(`https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(wikiQuery)}&gsrlimit=12&prop=pageimages%7Cextracts&piprop=thumbnail&pithumbsize=500&exintro=1&explaintext=1&format=json`);
      return Object.values(data.query?.pages ?? {}).map((page: any) => ({
        id: `wikipedia:${page.pageid}`, category: "movie" as const, title: page.title,
        description: page.extract ?? "", year: (page.extract?.match(/\b(?:19|20)\d{2}\b/) ?? [""])[0],
        poster: page.thumbnail?.source ?? null, progress_total: null,
        external_url: `https://en.wikipedia.org/?curid=${page.pageid}`,
      }));
    })().catch(() => []));
  }

  if (!apiKey && ["all", "tv", "cartoon"].includes(type)) {
    // TVMaze provides a no-key TV fallback before TMDB is configured.
    tasks.push(getJson(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(q)}`)
      .then(data => Promise.all(data.slice(0, 8).map(async ({ show }: any) => {
        let seasons: any[] = [];
        try { seasons = await getJson(`https://api.tvmaze.com/shows/${show.id}/seasons`); } catch { /* Keep search results even when season data is unavailable. */ }
        const episodeTotal = seasons.reduce((total, season) => total + (season.episodeOrder ?? 0), 0);
        const cartoon = show.genres?.includes("Animation") && show.language !== "Japanese";
        return {
          id: `tvmaze:${show.id}`, category: cartoon ? "cartoon" as const : "tv" as const, title: show.name,
          description: (show.summary ?? "").replace(/<[^>]*>/g, ""), year: (show.premiered ?? "").slice(0, 4),
          poster: show.image?.medium ?? null, progress_total: episodeTotal || null, season_count: seasons.length || null,
        };
      })).then((items: SearchResult[]) => items.filter(item => type === "cartoon" ? item.category === "cartoon" : type !== "tv" || item.category === "tv"))).catch(() => []));
  }

  if (["all", "anime", "cartoon", "manga", "manhwa"].includes(type)) {
    const mediaType = type === "manga" || type === "manhwa" ? "MANGA" : "ANIME";
    const category = type === "all" || type === "cartoon" ? "anime" : type as "anime" | "manga" | "manhwa";
    const country = type === "manhwa" ? "KR" : type === "anime" ? "JP" : null;
    const query = `query ($search: String!, $type: MediaType!, $country: CountryCode) {
      Page(page: 1, perPage: 15) {
        media(search: $search, type: $type, countryOfOrigin: $country, isAdult: false, sort: SEARCH_MATCH) {
          id title { romaji english } description(asHtml: false) startDate { year }
          coverImage { large } episodes chapters volumes countryOfOrigin siteUrl
        }
      }
    }`;
    tasks.push(fetch("https://graphql.anilist.co", {
      method: "POST", headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ query, variables: { search: q, type: mediaType, country } }),
      next: { revalidate: 3600 },
    }).then(async response => {
      if (!response.ok) throw new Error(`AniList returned ${response.status}`);
      const data = await response.json();
      if (data.errors?.length) throw new Error("AniList search failed");
      const media = data.data?.Page?.media ?? [];
      if (media.length === 0) throw new Error("AniList returned no results");
      return media.map((item: any) => {
        const resultCategory: SearchResult["category"] = mediaType === "ANIME"
          && typeof item.countryOfOrigin === "string" && item.countryOfOrigin !== "JP"
          ? "cartoon"
          : category;
        return {
          id: `anilist:${mediaType.toLowerCase()}:${item.id}`, category: resultCategory,
          title: item.title?.english ?? item.title?.romaji ?? "Untitled",
          description: (item.description ?? "").replace(/~![\s\S]*?!~/g, "[spoiler]").replace(/<[^>]*>/g, ""),
          year: item.startDate?.year ? String(item.startDate.year) : "",
          poster: item.coverImage?.large ?? null,
          progress_total: item.episodes ?? item.chapters ?? null,
          external_url: item.siteUrl ?? null,
        } satisfies SearchResult;
      }).filter((item: SearchResult) => type === "cartoon"
        ? item.category === "cartoon"
        : type !== "anime" || item.category === "anime");
    }).catch(async () => {
      if (mediaType === "ANIME") {
        // Jikan is a Japanese-focused anime fallback, so Western cartoons can't leak into Anime.
        if (type === "cartoon") return [];
        const data = await getJson(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=12`);
        return (data.data ?? []).slice(0, 12).map((item: any) => jikanResult(item, "anime"));
      }
      const data = await getJson(`https://kitsu.io/api/edge/manga?filter[text]=${encodeURIComponent(q)}&page[limit]=12`);
      return (data.data ?? []).filter((item: any) => type !== "manhwa" || item.attributes?.subtype === "manhwa")
        .slice(0, 12).map((item: any) => kitsuResult(item, category));
    }).catch(() => []));
  }

  if (params.get("stream") === "1") {
    const encoder = new TextEncoder();
    let canceled = false;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        void Promise.all(tasks.map(async task => {
          const batch = await task;
          if (canceled || batch.length === 0) return;
          const uniqueBatch = [...new Map(batch.map(item => [item.id, item])).values()];
          controller.enqueue(encoder.encode(`${JSON.stringify({ results: uniqueBatch })}\n`));
        })).then(() => { if (!canceled) controller.close(); }).catch(error => {
          if (!canceled) controller.error(error);
        });
      },
      cancel() { canceled = true; },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  }
  const results = (await Promise.all(tasks)).flat();
  const unique = [...new Map(results.map(item => [item.id, item])).values()];
  const message = unique.length === 0 ? "No matches found. Try a title, creator, or another category." : null;
  return NextResponse.json({ results: unique, message }, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" },
  });
}
