import './styles/main.css';

import { createRouter } from './app/router.js';
import { applyPreferences } from './app/preferences.js';
import { renderGamesView } from './features/games/gamesView.js';
import { renderHomeView } from './features/home/homeView.js';
import { renderNotebookView } from './features/notebook/notebookView.js';
import { renderToolsView } from './features/tools/toolsView.js';
import { createHomeStorage } from './features/home/homeStorage.js';

applyPreferences(createHomeStorage().getPreferences());

const routes = {
  home: {
    label: '홈',
    icon: '🏠',
    render: renderHomeView,
  },
  notebook: {
    label: '배움공책',
    icon: '📖',
    render: renderNotebookView,
  },
  tools: {
    label: '학습 도우미',
    shortLabel: '도우미',
    icon: '🧰',
    render: renderToolsView,
  },
  games: {
    label: '집중 게임',
    icon: '🎮',
    render: renderGamesView,
  },
};

function renderAppShell() {
  const app = document.querySelector('#app');

  app.innerHTML = `
    <div class="app-shell">
      <header class="app-header">
        <a class="brand" href="#/home" aria-label="햇반이네 홈으로 이동">
          <span class="brand__mascot" aria-hidden="true">🍚</span>
          <span>
            <strong>햇반이네</strong>
            <small>우리 반 배움 놀이터</small>
          </span>
        </a>
        <span class="version-badge">v2 · 새 출발</span>
      </header>

      <div class="app-body">
        <nav class="primary-nav" aria-label="주요 화면">
          ${Object.entries(routes)
            .map(
              ([routeId, route]) => `
                <button class="nav-item" type="button" data-route="${routeId}">
                  <span class="nav-item__icon" aria-hidden="true">${route.icon}</span>
                  <span>${route.shortLabel || route.label}</span>
                </button>
              `,
            )
            .join('')}
        </nav>

        <main id="main-content" class="main-content" tabindex="-1"></main>
      </div>
    </div>
  `;
}

function updateNavigation(routeId) {
  document.querySelectorAll('[data-route]').forEach((button) => {
    const isActive = button.dataset.route === routeId;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
}

renderAppShell();

const mainContent = document.querySelector('#main-content');
let activeViewCleanup = null;
const router = createRouter({
  routes,
  defaultRoute: 'home',
  onRouteChange(routeId, route) {
    activeViewCleanup?.();

    const view = route.render();
    const viewElement = view.element || view;
    activeViewCleanup = view.destroy || null;

    mainContent.replaceChildren(viewElement);
    updateNavigation(routeId);
    document.title = `${route.label} | 햇반이네 v2`;
    mainContent.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  },
});

document.querySelector('.primary-nav').addEventListener('click', (event) => {
  const button = event.target.closest('[data-route]');
  if (button) router.navigate(button.dataset.route);
});

router.start();
