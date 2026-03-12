export type HistoryMediaSource = {
  mediaUrl: string;
  mediaUrls?: string[];
};

export type HistoryMediaEntry = {
  url: string;
  isVideo: boolean;
};

export const isVideoHistoryUrl = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url);

export const getHistoryMediaEntries = (item: HistoryMediaSource): HistoryMediaEntry[] => {
  const rawUrls = Array.isArray(item.mediaUrls) && item.mediaUrls.length > 0
    ? item.mediaUrls
    : [item.mediaUrl];

  const uniqueUrls = rawUrls
    .filter((url): url is string => typeof url === 'string')
    .map((url) => url.trim())
    .filter((url, index, values) => url.length > 0 && values.indexOf(url) === index);

  return uniqueUrls.map((url) => ({
    url,
    isVideo: isVideoHistoryUrl(url)
  }));
};
