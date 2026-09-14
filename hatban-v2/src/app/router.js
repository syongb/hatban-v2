function routeFromHash() {
  return window.location.hash.replace(/^#\/?/, '');
}

export function createRouter({ routes, defaultRoute, onRouteChange }) {
  function showCurrentRoute() {
    const requestedRoute = routeFromHash();
    const routeId = routes[requestedRoute] ? requestedRoute : defaultRoute;

    if (requestedRoute !== routeId) {
      window.history.replaceState(null, '', `#/${routeId}`);
    }

    onRouteChange(routeId, routes[routeId]);
  }

  function navigate(routeId) {
    if (!routes[routeId]) return;

    const nextHash = `#/${routeId}`;
    if (window.location.hash === nextHash) {
      showCurrentRoute();
      return;
    }

    window.location.hash = nextHash;
  }

  function start() {
    window.addEventListener('hashchange', showCurrentRoute);
    showCurrentRoute();
  }

  return { navigate, start };
}
