// router.js — tiny hash router: '#/' (home) and '#/game/<id>'.

export function parseHash() {
  const h = (location.hash || '#/').replace(/^#\/?/, '');
  const [seg0, seg1] = h.split('/');
  if (seg0 === 'game' && seg1) return { page: 'game', id: seg1 };
  return { page: 'home' };
}

export function navigate(path) {
  const target = path.startsWith('#') ? path : `#${path}`;
  if (location.hash === target) return;
  location.hash = target;
}

export function initRouter(onRoute) {
  window.addEventListener('hashchange', () => onRoute(parseHash()));
  onRoute(parseHash());
}
