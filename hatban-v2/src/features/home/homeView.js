import { createView } from '../../utils/createView.js';

export function renderHomeView() {
  return createView(`
    <section class="screen screen--home" aria-labelledby="home-title">
      <div class="hero-card">
        <div class="hero-card__content">
          <span class="eyebrow">오늘도 반짝이는 우리 반</span>
          <h1 id="home-title">안녕, 햇반이! <span aria-hidden="true">👋</span></h1>
          <p>배운 것을 기록하고, 필요한 도구를 꺼내고, 잠깐의 게임으로 다시 집중해요.</p>
          <div class="hero-card__tags" aria-label="앞으로 추가할 기능">
            <span>닉네임 준비 중</span>
            <span>우리 반 연결 준비 중</span>
          </div>
        </div>
        <div class="hero-card__art" aria-hidden="true">
          <span class="rice-bowl">🍚</span>
          <span class="spark spark--one">✦</span>
          <span class="spark spark--two">✦</span>
        </div>
      </div>

      <div class="section-heading">
        <div>
          <span class="eyebrow">한눈에 보기</span>
          <h2>오늘의 햇반이네</h2>
        </div>
        <span class="soft-badge">기본 화면</span>
      </div>

      <div class="dashboard-grid">
        <article class="info-card info-card--sunny">
          <span class="info-card__icon" aria-hidden="true">☀️</span>
          <div>
            <span class="card-label">오늘의 한마디</span>
            <h3>조금씩 해도 괜찮아!</h3>
            <p>한 칸씩 채우다 보면 어느새 멋진 하루가 완성돼요.</p>
          </div>
        </article>

        <article class="info-card info-card--mint">
          <span class="info-card__icon" aria-hidden="true">🌱</span>
          <div>
            <span class="card-label">나의 배움</span>
            <h3>첫 기록을 기다리는 중</h3>
            <p>다음 단계에서 배움공책 저장 기능을 연결할 예정이에요.</p>
          </div>
        </article>

        <article class="info-card info-card--lilac">
          <span class="info-card__icon" aria-hidden="true">🏆</span>
          <div>
            <span class="card-label">집중 기록</span>
            <h3>새로운 도전 준비 완료</h3>
            <p>게임별 개인 기록과 우리 반 랭킹이 이곳에 연결될 거예요.</p>
          </div>
        </article>
      </div>
    </section>
  `);
}
