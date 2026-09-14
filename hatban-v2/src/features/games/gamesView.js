import { createView } from '../../utils/createView.js';

const games = [
  ['🧠', '짝맞추기', '기억력'],
  ['⚡', '스피드 암산', '계산력'],
  ['💣', '지뢰찾기', '추리력'],
  ['⏱️', '10초 맞추기', '집중력'],
  ['❌', '틱택토', '2인용'],
  ['⚫', '오목', '2인용'],
  ['⚾', '숫자야구', '추리력'],
  ['🔢', '스도쿠', '논리력'],
];

export function renderGamesView() {
  return createView(`
    <section class="screen" aria-labelledby="games-title">
      <div class="page-heading">
        <div>
          <span class="eyebrow">짧게 놀고 다시 집중!</span>
          <h1 id="games-title">집중 게임 <span aria-hidden="true">🎮</span></h1>
          <p>v1에서 사랑받던 게임을 하나씩 옮기고, 나중에는 개인 기록과 우리 반 랭킹도 연결할 거예요.</p>
        </div>
        <span class="status-pill">8개 게임 예정</span>
      </div>

      <div class="games-grid">
        ${games
          .map(
            ([icon, name, skill]) => `
              <article class="game-card">
                <span class="game-card__icon" aria-hidden="true">${icon}</span>
                <div>
                  <span class="game-card__skill">${skill}</span>
                  <h2>${name}</h2>
                  <p>게임 준비 중</p>
                </div>
                <span class="game-card__arrow" aria-hidden="true">→</span>
              </article>
            `,
          )
          .join('')}
      </div>
    </section>
  `);
}
