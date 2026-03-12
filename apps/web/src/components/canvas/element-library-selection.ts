export type ElementLibrarySelectionItem = {
  id: string;
  name: string;
  description: string;
  imageUrls: string[];
  tags?: string[];
};

export type KlingElementParameter = {
  name: string;
  description?: string;
  elementInputUrls?: string[];
  elementInputVideoUrls?: string[];
};

const normalizeImageUrls = (imageUrls: string[]) =>
  imageUrls
    .map((imageUrl) => imageUrl.trim())
    .filter((imageUrl, index, values) => imageUrl.length > 0 && values.indexOf(imageUrl) === index)
    .slice(0, 4);

export const normalizeElementLibrarySelection = (
  items: ElementLibrarySelectionItem[]
): ElementLibrarySelectionItem[] => {
  const seenIds = new Set<string>();
  const normalized: ElementLibrarySelectionItem[] = [];

  for (const item of items) {
    const id = item.id.trim();
    const name = item.name.trim();
    const description = item.description.trim();
    const imageUrls = normalizeImageUrls(item.imageUrls);

    if (!id || !name || seenIds.has(id) || imageUrls.length < 2) {
      continue;
    }

    seenIds.add(id);
    normalized.push({
      id,
      name,
      description,
      imageUrls,
      tags: Array.isArray(item.tags) ? item.tags.filter((tag) => typeof tag === 'string' && tag.trim().length > 0) : undefined
    });
  }

  return normalized;
};

export const buildKlingElementParametersFromSelection = (
  items: ElementLibrarySelectionItem[]
): KlingElementParameter[] =>
  normalizeElementLibrarySelection(items).map((item) => ({
    name: item.name,
    description: item.description || undefined,
    elementInputUrls: [...item.imageUrls]
  }));

export const removeElementLibrarySelectionItem = (
  items: ElementLibrarySelectionItem[],
  itemId: string
): ElementLibrarySelectionItem[] =>
  items.filter((item) => item.id !== itemId);
