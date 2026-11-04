/** Texto para buscar: minúsculas y sin tildes («Tríceps» → «triceps»). */
export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** ¿Contiene el texto todas las palabras buscadas, en cualquier orden? */
export function matchesSearch(normalizedName: string, query: string): boolean {
  const words = normalizeSearch(query).split(' ').filter(Boolean);
  return words.every((w) => normalizedName.includes(w));
}
