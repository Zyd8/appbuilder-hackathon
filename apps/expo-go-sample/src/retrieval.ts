import { Guide } from './fixtures';

export type SearchHit = {
  guideId: string;
  guideTitle: string;
  sectionId: string;
  heading: string;
  body: string;
  score: number;
};

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function searchGuides(guides: Guide[], query: string, limit = 4): SearchHit[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];

  return guides.flatMap((guide) => guide.sections.map((section) => {
    const heading = normalize(section.heading);
    const body = normalize(section.body);
    const title = normalize(guide.title);
    const score = terms.reduce((total, term) => {
      const exact = heading.includes(term) ? 4 : 0;
      const inBody = body.includes(term) ? 2 : 0;
      const inTitle = title.includes(term) ? 3 : 0;
      return total + exact + inBody + inTitle;
    }, 0);
    return { guideId: guide.id, guideTitle: guide.title, sectionId: section.id, heading: section.heading, body: section.body, score };
  })).filter((hit) => hit.score > 0).sort((a, b) => b.score - a.score || a.sectionId.localeCompare(b.sectionId)).slice(0, limit);
}

export function buildOfflineAnswer(question: string, hits: SearchHit[]): string {
  if (!hits.length) return `No local source matches “${question}”. Try a fault code, equipment name, or checklist term.`;
  const lead = hits[0];
  return `Based on local guide material, start with “${lead.heading}”: ${lead.body} This is retrieval-only guidance; verify the physical condition before acting.`;
}
