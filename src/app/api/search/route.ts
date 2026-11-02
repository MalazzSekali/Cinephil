import { NextResponse } from "next/server";

type SearchResult = {
  id: string;
  category: "movie" | "tv" | "anime" | "manga" | "manhwa";
  title: string;
  description?: string;
  year: string;
  poster: string | null;
  progress_total: number | null;
  season_count?: number | null;
};

const tmdbGenres: Record<string, string> = {
  action: "28", adventure: "12", animation: "16", comedy: "35", crime: "80",
  documentary: "99", drama: "18", family: "10751", fantasy: "14", history: "36",
  horror: "27", music: "10402", mystery: "9648", romance: "10749", "science fiction": "878",
  thriller: "53", war: "10752", western: "37",
};

function tmdbResult(item: any, kind: "movie" | "tv"): SearchResult {
  return {
    id: `tmdb:${kind}:${item.id}`, category: kind, title: item.title ?? item.name ?? "Untitled",
    description: item.overview ?? "", year: (item.release_date ?? item.first_air_date ?? "").slice(0, 4),
    poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
    progress_total: item.number_of_episodes ?? null,
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
  const validTypes = ["all", "movie", "tv", "anime", "manga", "manhwa"];
  if (!q || q.length > 100) return NextResponse.json({ results: [], message: null });
  if (!validTypes.includes(type)) return NextResponse.json({ results: [], message: "Choose a valid category." }, { status: 400 });

  const tasks: Promise<SearchResult[]>[] = [];
  const apiKey = process.env.TMDB_API_KEY;
  const genreId = tmdbGenres[q.toLowerCase()];

  if (apiKey && ["all", "movie", "tv"].includes(type)) {
    const kinds: Array<"movie" | "tv"> = type === "all" ? ["movie", "tv"] : [type as "movie" | "tv"];
    for (const kind of kinds) {
      const endpoint = genreId
        ? `discover/${kind}?with_genres=${genreId}&sort_by=popularity.desc&include_adult=false`
        : `search/${kind}?query=${encodeURIComponent(q)}&include_adult=false`;
      tasks.push(getJson(`https://api.themoviedb.org/3/${endpoint}&api_key=${encodeURIComponent(apiKey)}`)
        .then(data => (data.results ?? []).slice(0, 12).map((item: any) => tmdbResult(item, kind)))
        .catch(() => []));
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

  if (!apiKey && ["all", "tv"].includes(type)) {
    // TVMaze provides a no-key TV fallback before TMDB is configured.
    tasks.push(getJson(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(q)}`)
      .then(data => Promise.all(data.slice(0, 8).map(async ({ show }: any) => {
        let seasons: any[] = [];
        try { seasons = await getJson(`https://api.tvmaze.com/shows/${show.id}/seasons`); } catch { /* Keep search results even when season data is unavailable. */ }
        const episodeTotal = seasons.reduce((total, season) => total + (season.episodeOrder ?? 0), 0);
        return {
          id: `tvmaze:${show.id}`, category: "tv" as const, title: show.name,
          description: (show.summary ?? "").replace(/<[^>]*>/g, ""), year: (show.premiered ?? "").slice(0, 4),
          poster: show.image?.medium ?? null, progress_total: episodeTotal || null, season_count: seasons.length || null,
        };
      }))).catch(() => []));
  }

  if (["all", "anime", "manga", "manhwa"].includes(type)) {
    const mediaType = type === "manga" || type === "manhwa" ? "MANGA" : "ANIME";
    const category = type === "all" ? "anime" : type as "anime" | "manga" | "manhwa";
    const country = type === "manhwa" ? "KR" : null;
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
      return (data.data?.Page?.media ?? []).map((item: any) => ({
        id: `anilist:${mediaType.toLowerCase()}:${item.id}`, category,
        title: item.title?.english ?? item.title?.romaji ?? "Untitled",
        description: (item.description ?? "").replace(/~![\s\S]*?!~/g, "[spoiler]").replace(/<[^>]*>/g, ""),
        year: item.startDate?.year ? String(item.startDate.year) : "",
        poster: item.coverImage?.large ?? null,
        progress_total: item.episodes ?? item.chapters ?? null,
        external_url: item.siteUrl ?? null,
      }));
    }).catch(() => []));
  }

  const results = (await Promise.all(tasks)).flat();
  const unique = [...new Map(results.map(item => [item.id, item])).values()];
  const message = unique.length === 0 ? "No matches found. Try a title, creator, or another category." : null;
  return NextResponse.json({ results: unique, message });
}

