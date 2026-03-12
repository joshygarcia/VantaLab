import { getHistoryMediaEntries } from '../../../../web/src/app/(studio)/history/history-media';

describe('getHistoryMediaEntries', () => {
  it('keeps a single media output as an actionable entry', () => {
    expect(
      getHistoryMediaEntries({
        mediaUrl: 'https://cdn.example.com/render.mp4'
      })
    ).toEqual([
      {
        url: 'https://cdn.example.com/render.mp4',
        isVideo: true
      }
    ]);
  });

  it('deduplicates and preserves multiple outputs', () => {
    expect(
      getHistoryMediaEntries({
        mediaUrl: 'https://cdn.example.com/primary.png',
        mediaUrls: [
          'https://cdn.example.com/primary.png',
          ' https://cdn.example.com/alt.png ',
          'https://cdn.example.com/primary.png'
        ]
      })
    ).toEqual([
      {
        url: 'https://cdn.example.com/primary.png',
        isVideo: false
      },
      {
        url: 'https://cdn.example.com/alt.png',
        isVideo: false
      }
    ]);
  });
});
