import { createView } from '../../utils/createView.js';

const tools = [
  { icon: '📚', name: '국어·한자 사전', description: '궁금한 낱말을 빠르게 찾아봐요.', tone: 'blue' },
  { icon: '🧮', name: '계산기', description: '공부 중 필요한 계산을 간단하게 해요.', tone: 'mint' },
  { icon: '⏱️', name: '타이머·스톱워치', description: '집중 시간과 활동 시간을 재어 봐요.', tone: 'orange' },
  { icon: '🔗', name: '학습 사이트', description: '자주 쓰는 배움터로 바로 이동해요.', tone: 'lilac' },
];

export function renderToolsView() {
  return createView(`
    <section class="screen" aria-labelledby="tools-title">
      <div class="page-heading">
        <div>
          <span class="eyebrow">필요할 때 바로 꺼내요</span>
          <h1 id="tools-title">학습 도우미 <span aria-hidden="true">🧰</span></h1>
          <p>공부의 흐름을 끊지 않도록 자주 쓰는 도구를 한자리에 모을 예정이에요.</p>
        </div>
        <span class="status-pill">메뉴 미리보기</span>
      </div>

      <div class="feature-grid">
        ${tools
          .map(
            (tool) => `
              <article class="feature-card feature-card--${tool.tone}">
                <span class="feature-card__icon" aria-hidden="true">${tool.icon}</span>
                <div>
                  <span class="coming-soon">준비 중</span>
                  <h2>${tool.name}</h2>
                  <p>${tool.description}</p>
                </div>
              </article>
            `,
          )
          .join('')}
      </div>
    </section>
  `);
}
