import { sessionStorage } from './sessionStorage';

const KEY = 'last_active_tab';

export async function getLastTab(): Promise<string | null> {
  return sessionStorage.getItem(KEY);
}

export async function setLastTab(tab: string): Promise<void> {
  await sessionStorage.setItem(KEY, tab);
}
