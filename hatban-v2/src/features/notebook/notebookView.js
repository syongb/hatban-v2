import { createView } from '../../utils/createView.js';

export function renderNotebookView() {
  return createView(`
    <section class="screen" aria-labelledby="notebook-title">
      <div class="page-heading">
        <div>
          <span class="eyebrow">쓰고, 그리고, 간직해요</span>
          <h1 id="notebook-title">배움공책 <span aria-hidden="true">✏️</span></h1>
          <p>태블릿에서도 손쉽게 오늘 배운 내용을 남길 수 있는 공간으로 준비하고 있어요.</p>
        </div>
        <span class="status-pill">기반 준비 완료</span>
      </div>

      <div class="notebook-layout">
        <article class="notebook-preview">
          <div class="notebook-preview__top">
            <div>
              <span class="card-label">오늘의 공책</span>
              <h2>국어 · 1교시</h2>
            </div>
            <span class="notebook-date">예시 화면</span>
          </div>
          <div class="paper-placeholder" aria-label="배움공책 기능 준비 안내">
            <span aria-hidden="true">🖍️</span>
            <strong>자유롭게 쓰는 공책을 준비 중이에요</strong>
            <p>텍스트와 펜 입력은 다음 개발 단계에서 연결됩니다.</p>
          </div>
        </article>

        <aside class="plan-card">
          <span class="card-label">태블릿 우선 설계</span>
          <h2>곧 만날 기능</h2>
          <ul class="check-list">
            <li><span>✓</span> 손가락·펜으로 편하게 그리기</li>
            <li><span>✓</span> 텍스트와 그림 함께 저장하기</li>
            <li><span>✓</span> PNG 이미지로 내려받기</li>
            <li><span>✓</span> 지원 기기에서 바로 공유하기</li>
          </ul>
        </aside>
      </div>
    </section>
  `);
}
