import { getRecommendations, searchMusic } from './MultiSourceSearchService';

const mockFetch = jest.fn();

const jsonResponse = (body: unknown, ok = true, status = 200): Response => ({
  ok,
  status,
  json: jest.fn().mockResolvedValue(body),
} as unknown as Response);

describe('MultiSourceSearchService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockFetch.mockReset();
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('maps typed Saavn search responses and filters items without downloads', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({
      success: true,
      data: {
        results: [
          {
            id: 'saavn-1',
            name: 'Saavn Song',
            image: [
              { quality: '150x150', url: 'small.jpg' },
              { quality: '500x500', url: 'large.jpg' },
            ],
            downloadUrl: [
              { quality: '96kbps', url: 'low.mp3' },
              { quality: '320kbps', url: 'high.mp3' },
            ],
            hasLyrics: true,
            duration: 210,
            primaryArtists: 'Primary Artist',
            playCount: '1,234 plays',
            language: 'hindi',
          },
          {
            id: 'saavn-2',
            name: 'Missing Download',
            image: [],
            downloadUrl: [],
          },
        ],
      },
    }));

    const results = await searchMusic('saavn song');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(results).toEqual([
      expect.objectContaining({
        id: 'saavn-1',
        title: 'Saavn Song',
        artist: 'Primary Artist',
        highResArt: 'large.jpg',
        downloadUrl: 'high.mp3',
        hasLyrics: true,
        source: 'Saavn',
        duration: 210,
        playCount: 1234,
        language: 'hindi',
      }),
    ]);
  });

  it('falls back to Gaana when Saavn returns no usable results', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { results: [] } }))
      .mockResolvedValueOnce(jsonResponse({
        success: true,
        data: {
          results: [
            {
              id: 'gaana-1',
              title: 'Gaana Song',
              image: [{ quality: '500x500', url: 'gaana.jpg' }],
              downloadUrl: [{ quality: '320kbps', url: 'gaana.mp3' }],
              artists: {
                primary: [{ name: 'Artist One' }, { name: 'Artist Two' }],
              },
            },
          ],
        },
      }));

    const results = await searchMusic('fallback song');

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(results).toEqual([
      expect.objectContaining({
        id: 'gaana-1',
        title: 'Gaana Song',
        artist: 'Artist One, Artist Two',
        highResArt: 'gaana.jpg',
        downloadUrl: 'gaana.mp3',
        source: 'Gaana',
        playCount: 0,
      }),
    ]);
  });

  it('maps single recommendation responses through the shared provider shape', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({
      success: true,
      data: {
        id: 'rec-1',
        name: 'Recommended Song',
        image: [{ quality: '500x500', url: 'rec.jpg' }],
        downloadUrl: [{ quality: '320kbps', url: 'rec.mp3' }],
        primaryArtists: 'Recommended Artist',
        play_count: '987',
      },
    }));

    const results = await getRecommendations('song-id');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(results).toEqual([
      expect.objectContaining({
        id: 'rec-1',
        title: 'Recommended Song',
        artist: 'Recommended Artist',
        highResArt: 'rec.jpg',
        downloadUrl: 'rec.mp3',
        source: 'Saavn',
        playCount: 987,
      }),
    ]);
  });
});
