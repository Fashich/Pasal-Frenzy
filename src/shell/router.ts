/**
 * Router hash sederhana (#/, #/masuk, #/daftar, #/beranda, #/main/<bab>).
 * Hash dipilih karena aman untuk GitHub Pages (subpath), Electron (skema app://),
 * dan Capacitor tanpa konfigurasi server, serta mendukung tombol kembali.
 */

export const CHAPTER_IDS = ['prolog', 'case-1-ham', 'case-2-pasal33', 'case-3-perppu'] as const;
export type ChapterId = (typeof CHAPTER_IDS)[number];

export type Route =
  | { name: 'landing' }
  | { name: 'masuk' }
  | { name: 'daftar' }
  | { name: 'beranda' }
  | { name: 'main'; chapterId: ChapterId };

export function isChapterId(value: string): value is ChapterId {
  return (CHAPTER_IDS as readonly string[]).includes(value);
}

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '').replace(/^\/+/, '').replace(/\/+$/, '');
  if (path === '' || path === 'landing') return { name: 'landing' };
  if (path === 'masuk') return { name: 'masuk' };
  if (path === 'daftar') return { name: 'daftar' };
  if (path === 'beranda') return { name: 'beranda' };
  const main = /^main\/([a-z0-9-]+)$/.exec(path);
  if (main && main[1] && isChapterId(main[1])) return { name: 'main', chapterId: main[1] };
  return { name: 'landing' };
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'landing':
      return '#/';
    case 'masuk':
      return '#/masuk';
    case 'daftar':
      return '#/daftar';
    case 'beranda':
      return '#/beranda';
    case 'main':
      return `#/main/${route.chapterId}`;
  }
}

export function sameRoute(a: Route, b: Route): boolean {
  return routeToHash(a) === routeToHash(b);
}

export type RouteListener = (route: Route, previous: Route | null) => void;

export class Router {
  private listeners = new Set<RouteListener>();
  private currentRoute: Route;
  private started = false;

  constructor(private readonly win: Window = window) {
    this.currentRoute = parseHash(win.location.hash);
  }

  get current(): Route {
    return this.currentRoute;
  }

  onChange(listener: RouteListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.win.addEventListener('hashchange', this.onHashChange);
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;
    this.win.removeEventListener('hashchange', this.onHashChange);
  }

  navigate(route: Route, options: { replace?: boolean } = {}): void {
    const hash = routeToHash(route);
    if (options.replace) {
      const url = `${this.win.location.pathname}${this.win.location.search}${hash}`;
      this.win.history.replaceState(null, '', url);
      this.onHashChange();
      return;
    }
    if (this.win.location.hash === hash) {
      this.onHashChange();
      return;
    }
    this.win.location.hash = hash;
  }

  back(): void {
    this.win.history.back();
  }

  private readonly onHashChange = (): void => {
    const next = parseHash(this.win.location.hash);
    const previous = this.currentRoute;
    if (sameRoute(next, previous) && this.started) {
      // hash sama: tetap beri tahu (mis. navigate ke rute aktif untuk refresh)
      for (const l of this.listeners) l(next, previous);
      return;
    }
    this.currentRoute = next;
    for (const l of this.listeners) l(next, previous);
  };
}
