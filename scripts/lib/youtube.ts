// Thin wrapper over the YouTube Data API v3 — search, channel lookup, video details.
// Tracks unit cost so the caller can stay under quota.

const YT_BASE = "https://www.googleapis.com/youtube/v3";

export interface YTSearchResult {
  videoId: string;
  title: string;
  channelTitle: string;
  channelId: string;
  publishedAt: string;
  description: string;
}

export interface YTVideoDetails {
  videoId: string;
  title: string;
  channelTitle: string;
  channelId: string;
  viewCount: number;
  durationSec: number | null;
  embeddable: boolean;
  privacyStatus: string;
  publishedAt: string;
  thumbnailUrl: string;
}

export class YouTubeClient {
  unitsSpent = 0;

  constructor(private apiKey: string) {
    if (!apiKey) throw new Error("YOUTUBE_API_KEY is required");
  }

  private async fetchJSON(path: string, params: Record<string, string>, units: number): Promise<any> {
    const url = new URL(`${YT_BASE}/${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    url.searchParams.set("key", this.apiKey);
    const res = await fetch(url);
    this.unitsSpent += units;
    if (!res.ok) {
      const body = await res.text();
      const err = new Error(`YouTube ${path} ${res.status}: ${body.slice(0, 300)}`);
      (err as any).status = res.status;
      (err as any).body = body;
      throw err;
    }
    return res.json();
  }

  /** Cost: 100 units. Returns up to maxResults results (max 50). */
  async search(query: string, maxResults = 10): Promise<YTSearchResult[]> {
    const data = await this.fetchJSON(
      "search",
      {
        part: "snippet",
        type: "video",
        videoCategoryId: "10", // Music
        maxResults: String(Math.min(50, maxResults)),
        q: query,
        relevanceLanguage: "zh",
      },
      100
    );
    return (data.items || []).map((it: any) => ({
      videoId: it.id?.videoId,
      title: it.snippet?.title || "",
      channelTitle: it.snippet?.channelTitle || "",
      channelId: it.snippet?.channelId || "",
      publishedAt: it.snippet?.publishedAt || "",
      description: it.snippet?.description || "",
    })).filter((r: YTSearchResult) => !!r.videoId);
  }

  /** Cost: 1 unit per call (up to 50 ids). */
  async videos(ids: string[]): Promise<YTVideoDetails[]> {
    if (ids.length === 0) return [];
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += 50) chunks.push(ids.slice(i, i + 50));
    const out: YTVideoDetails[] = [];
    for (const chunk of chunks) {
      const data = await this.fetchJSON(
        "videos",
        {
          part: "snippet,contentDetails,statistics,status",
          id: chunk.join(","),
        },
        1
      );
      for (const it of data.items || []) {
        const snippet = it.snippet || {};
        const status = it.status || {};
        const stats = it.statistics || {};
        const cd = it.contentDetails || {};
        out.push({
          videoId: it.id,
          title: snippet.title || "",
          channelTitle: snippet.channelTitle || "",
          channelId: snippet.channelId || "",
          viewCount: Number(stats.viewCount || 0),
          durationSec: parseISODuration(cd.duration || ""),
          embeddable: status.embeddable !== false,
          privacyStatus: status.privacyStatus || "public",
          publishedAt: snippet.publishedAt || "",
          thumbnailUrl:
            snippet.thumbnails?.maxres?.url ||
            snippet.thumbnails?.high?.url ||
            snippet.thumbnails?.medium?.url ||
            snippet.thumbnails?.default?.url ||
            "",
        });
      }
    }
    return out;
  }

  /** Cost: 1 unit. Resolve a @handle to a channel ID + uploads playlist ID. */
  async channelByHandle(handle: string): Promise<{ channelId: string; uploadsPlaylistId: string } | null> {
    const clean = handle.startsWith("@") ? handle.slice(1) : handle;
    const data = await this.fetchJSON(
      "channels",
      { part: "contentDetails", forHandle: clean },
      1
    );
    const item = (data.items || [])[0];
    if (!item) return null;
    return {
      channelId: item.id,
      uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads || "",
    };
  }

  /** Cost: 1 unit per page (max 50 items/page). */
  async playlistItems(playlistId: string, max = 50): Promise<{ videoId: string; title: string; publishedAt: string }[]> {
    const out: { videoId: string; title: string; publishedAt: string }[] = [];
    let pageToken: string | undefined;
    while (out.length < max) {
      const params: Record<string, string> = {
        part: "snippet,contentDetails",
        playlistId,
        maxResults: String(Math.min(50, max - out.length)),
      };
      if (pageToken) params.pageToken = pageToken;
      const data = await this.fetchJSON("playlistItems", params, 1);
      for (const it of data.items || []) {
        const vid = it.contentDetails?.videoId;
        if (vid) {
          out.push({
            videoId: vid,
            title: it.snippet?.title || "",
            publishedAt: it.contentDetails?.videoPublishedAt || it.snippet?.publishedAt || "",
          });
        }
      }
      pageToken = data.nextPageToken;
      if (!pageToken) break;
    }
    return out;
  }
}

function parseISODuration(iso: string): number | null {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || "");
  if (!m) return null;
  const [, h, mn, s] = m;
  return (Number(h) || 0) * 3600 + (Number(mn) || 0) * 60 + (Number(s) || 0);
}
