import type { ActivityId } from './content/sets';

export type Screen =
  | { id: 'welcome' }
  | { id: 'home' }
  | { id: 'find'; activity: ActivityId }
  | { id: 'trace'; set: ActivityId }
  | { id: 'book' }
  | { id: 'parent'; tab?: ParentTab };

export type ParentTab = 'settings' | 'dashboard' | 'record' | 'players' | 'news';

export type Go = (s: Screen) => void;
