import passagesData from '../data/passages.json';
import { Passage, PassagesData } from '../types/passage';

// This service layer abstracts data fetching.
// Currently uses static JSON, but can be easily migrated to Cloudflare KV
// by changing the implementation to fetch from an API endpoint.

const data = passagesData as PassagesData;

export async function getPassages(): Promise<Passage[]> {
  // When migrating to KV, replace with:
  // const res = await fetch('/api/passages');
  // return res.json();
  return data.passages;
}

export async function getPassageById(id: string): Promise<Passage | undefined> {
  // When migrating to KV, replace with:
  // const res = await fetch(`/api/passages/${id}`);
  // return res.json();
  return data.passages.find(p => p.id === id);
}

export async function getPassageByIndex(index: number): Promise<Passage | undefined> {
  return data.passages[index];
}

export function getPassagesSync(): Passage[] {
  // Synchronous version for initial render if needed
  return data.passages;
}
