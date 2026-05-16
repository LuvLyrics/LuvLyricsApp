import { UnifiedSong } from '../types/song';

// Fake browser headers to bypass Cloudflare Bot Protection
const BROWSER_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
};

// LAYER 1: JioSaavn (The Official 320kbps Standard)
const SAAVN_API = 'https://jiosaavn-api-byprats.vercel.app/api'; 

// LAYER 2: Gaana (Fallback)
const GAANA_API = 'https://gaanaapibyprats.vercel.app/api';

/**
 * ============================================================================
 * LAYER 2: GAANA (Fallback Source)
 * ============================================================================
 */
async function searchGaana(query: string): Promise<UnifiedSong[]> {
  try {
    console.log(`[Gaana] Searching (Fallback): ${query}`);
    const searchUrl = `${GAANA_API}/search/songs?query=${encodeURIComponent(query)}&limit=20`;

    const timeoutPromise = new Promise<any>((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT')), 25000)
    );

    const response = await Promise.race([
        fetch(searchUrl, {
            headers: BROWSER_HEADERS,
        }),
        timeoutPromise
    ]) as Response;

    if (!response.ok) return [];

    const json = await response.json();
    if (!json.success || !json.data || !json.data.results) return [];

    return json.data.results.map((song: any) => {
      const imageArray = song.image || [];
      const highResImage = imageArray.find((i: any) => i.quality === '500x500') || imageArray[imageArray.length - 1];
      const urlArray = song.downloadUrl || [];
      const topQuality = urlArray.find((u: any) => u.quality === '320kbps') || urlArray[urlArray.length - 1];

      let artistName = 'Unknown Artist';
      if (typeof song.primaryArtists === 'string') artistName = song.primaryArtists;
      else if (song.artists?.primary?.[0]) artistName = song.artists.primary.map((a: any) => a.name).join(', ');

      return {
        id: song.id,
        title: song.name || song.title,
        artist: artistName,
        highResArt: highResImage?.url || '',
        downloadUrl: topQuality?.url || '',
        hasLyrics: song.hasLyrics === true,
        source: 'Gaana' as const, // Distinct source
        duration: song.duration,
        playCount: 0, // Gaana doesn't always provide playCount
        language: song.language
      };
    }).filter((s: UnifiedSong) => s.downloadUrl);

  } catch (error: any) {
    console.warn(`[Gaana] Search failed: ${error.message}`);
    return [];
  }
}

/**
 * ============================================================================
 * LAYER 1: JIOSAAVN (The Official Source)
 * ============================================================================
 */
async function searchSaavn(query: string): Promise<UnifiedSong[]> {
  try {
    console.log(`[Saavn] Searching: ${query}`);
    const searchUrl = `${SAAVN_API}/search/songs?query=${encodeURIComponent(query)}&limit=20`;

    const timeoutPromise = new Promise<any>((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT')), 25000)
    );

    const response = await Promise.race([
        fetch(searchUrl, {
            headers: BROWSER_HEADERS,
        }),
        timeoutPromise
    ]) as Response;

    if (!response.ok) {
        console.warn(`[Saavn] API Error: ${response.status}`);
        return [];
    }

    const json = await response.json();
    if (!json.success || !json.data || !json.data.results) {
         return [];
    }

    const results = json.data.results;

    return results.map((song: any) => {
      const imageArray = song.image || [];
      const highResImage = imageArray.find((i: any) => i.quality === '500x500') || imageArray[imageArray.length - 1];
      const urlArray = song.downloadUrl || [];
      const topQuality = urlArray.find((u: any) => u.quality === '320kbps') || urlArray[urlArray.length - 1];

      let artistName = 'Unknown Artist';
      if (typeof song.primaryArtists === 'string') {
          artistName = song.primaryArtists;
      } else if (song.artists && song.artists.primary && song.artists.primary[0]) {
          artistName = song.artists.primary.map((a: any) => a.name).join(', ');
      }

      const parsePlays = (val: any) => {
          if (typeof val === 'number') return val;
          if (typeof val === 'string') return parseInt(val.replace(/[^0-9]/g, '') || '0');
          return 0;
      };

      return {
        id: song.id,
        title: song.name || song.title,
        artist: artistName,
        highResArt: highResImage?.url || '',
        downloadUrl: topQuality?.url || '',
        hasLyrics: song.hasLyrics === true,
        source: 'Saavn' as const,
        duration: song.duration,
        playCount: parsePlays(song.playCount || song.play_count),
        language: song.language
      };
    }).filter((s: UnifiedSong) => s.downloadUrl);

  } catch (error: any) {
    console.warn(`[Saavn] Search failed: ${error.message}`);
    return [];
  }
}

/**
 * Main Search Interface
 * Now exclusively uses Saavn for reliability
 */
export async function searchMusic(query: string, artistName?: string, onProgress?: (status: string) => void): Promise<UnifiedSong[]> {
  console.log(`[SearchEngine] 🚀 Searching JioSaavn. Query: "${query}"`);
  onProgress?.('Searching JioSaavn...');

  try {
      let results = await searchSaavn(query);
      
      // FALLBACK TO GAANA
      if (results.length === 0) {
          console.log(`[SearchEngine] ⚠️ Saavn returned 0 results. Trying Gaana...`);
          onProgress?.('Saavn empty. Trying Gaana...');
          const gaanaResults = await searchGaana(query);
          results = gaanaResults;
      }

      if (artistName && results.length > 0) {
        const lowerArtist = artistName.toLowerCase();
        results = results.filter(s => 
          s.artist.toLowerCase().includes(lowerArtist) || 
          lowerArtist.includes(s.artist.toLowerCase())
        );
      }

      // Sort by popularity and authenticity
      return results.sort((a, b) => {
          if (a.isAuthentic !== b.isAuthentic) return a.isAuthentic ? -1 : 1; 
          return (b.playCount || 0) - (a.playCount || 0);
      });

  } catch (error: any) {
      if (error.message === 'TIMEOUT' || error.name === 'AbortError' || error.message?.includes('Network request failed')) {
          console.warn(`[SearchEngine] Network timeout/error for "${query}".`);
      } else {
          console.error(`[SearchEngine] ⚠️ Search Failed:`, error);
      }
      return [];
  }
}

/**
 * Recommendations (Saavn Radio)
 */
export async function getRecommendations(songId: string): Promise<UnifiedSong[]> {
  try {
    const url = `${SAAVN_API}/songs/${songId}/suggestions?limit=15`;
    const response = await fetch(url, { headers: BROWSER_HEADERS });
    if (!response.ok) return [];

    const json = await response.json();
    if (!json.success || !json.data) return [];

    const results = json.data;

    return (Array.isArray(results) ? results : [results]).map((song: any) => {
      const imageArray = song.image || [];
      const highResImage = imageArray.find((i: any) => i.quality === '500x500') || imageArray[imageArray.length - 1];
      const urlArray = song.downloadUrl || [];
      const topQuality = urlArray.find((u: any) => u.quality === '320kbps') || urlArray[urlArray.length - 1];

      let artistName = 'Unknown Artist';
      if (typeof song.primaryArtists === 'string') {
          artistName = song.primaryArtists;
      } else if (song.artists && song.artists.primary && song.artists.primary[0]) {
          artistName = song.artists.primary.map((a: any) => a.name).join(', ');
      }

      const parsePlays = (val: any) => {
          if (typeof val === 'number') return val;
          if (typeof val === 'string') return parseInt(val.replace(/[^0-9]/g, '') || '0');
          return 0;
      };

      return {
        id: song.id,
        title: song.name || song.title,
        artist: artistName,
        highResArt: highResImage?.url || '',
        downloadUrl: topQuality?.url || '',
        hasLyrics: song.hasLyrics === true,
        source: 'Saavn' as const,
        duration: song.duration,
        playCount: parsePlays(song.playCount || song.play_count),
        language: song.language
      };
    }).filter((s: UnifiedSong) => s.downloadUrl);

  } catch (error) {
    console.warn(`[SaavnRecs] Failed:`, error);
    return [];
  }
}

export const MultiSourceSearchService = {
  searchMusic,
  searchSaavn,
  getRecommendations
};
