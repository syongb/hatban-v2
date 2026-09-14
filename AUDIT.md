# 햇반이네 리팩터링 감사 보고서

분석 대상: `햇반이네_최종.html`  
원본: `C:\Users\USER\Desktop\용 바이브코딩\햇반이네_최종.html`  
원본 SHA-256: `B5704546B97F0BD2F9E28F300E9B9FA0EDE73797B967DFFD6521AA172C9085D3`  
분석 기준: 2,516줄, 171,663바이트(CRLF 기준)

## 1. 현재 앱 구조

- 빌드 과정 없이 브라우저에서 직접 여는 단일 HTML 앱이다.
- `<head>`에는 PWA 관련 메타 태그, 외부 CDN 4종, Tailwind 설정, 앱 전용 CSS가 있다.
- `<body>`는 상단 프로필/문구/설정, 하단 내비게이션, 4개 주요 탭으로 구성된다.
  - `tab-home`: D-Day, 메모, 오늘의 자기평가
  - `tab-notebook`: 주간 시간표와 스마트 배움공책
  - `tab-helpers`: 사전, 계산기, 타이머/스톱워치, 외부 학습 링크
  - `tab-game`: 8개 집중 게임
- 알림, 확인, 프로필, 문구, D-Day, 메모, 배움공책, 모아보기, 사전, 계산기, 시간 관리 모달이 body 하단에 있다.
- 주 JavaScript는 body 끝의 한 개 classic script에 있으며, 전역 상태 → 초기화/설정 → 메모 → 시간표/Canvas → 모아보기 → 도우미 → 게임 → onload 순이다.
- 정적 HTML ID는 120개이고 중복 ID는 없다.

## 2. 주요 기능 목록

### 홈

- 앱 제목과 이모지 로고 변경
- 날짜별 오늘의 문구와 사용자 문구 저장
- 테마 색상과 15종 Google Fonts 선택
- 이름/날짜를 지정하는 D-Day
- 색상 메모 생성, 수정, 삭제, 드래그 정렬
- 학습 태도/경청/결과를 0.5점 단위 별점으로 저장

### 스마트 배움공책

- 월~금, 1~6교시 시간표 렌더링
- 현재 요일과 교시 강조
- 과목별 텍스트, 글자 크기, Canvas 그림 저장
- 마우스/터치 그리기, 펜 색상/굵기, 지우개, 최대 20단계 undo
- 기존 문자열형 Canvas 데이터와 객체형 데이터를 모두 읽는 호환 코드
- 전체/요일/과목 모아보기
- 하루 기록 삭제 후 5초간 되돌리기
- html2canvas 기반 PNG 다운로드

### 학습 도우미

- 네이버 국어/한자사전 검색(검색어 URL 인코딩)
- 버튼 입력 계산기
- 분 단위 타이머와 1/100초 스톱워치
- 외부 학습 사이트 링크

### 집중 게임

- 짝맞추기: 일반/횟수 제한/시간 제한과 상위 3개 기록
- 스피드 암산: 곱셈/나눗셈과 상위 3개 점수
- 지뢰찾기: 10×10/15×15/20×20, 클릭/길게 누르기/우클릭
- 10초 맞추기: 오차 상위 3개 기록
- 2인용 틱택토
- 2인용 15×15 오목
- 3~5자리 숫자야구
- 고정 정답판에서 칸을 무작위로 비우는 스도쿠

## 3. localStorage 저장 구조

키 이름은 모두 유지해야 한다.

| 키 | 현재 값 형식 | 호환성 메모 |
|---|---|---|
| `hatban_theme_color` | hex 색상 문자열 | 기본값 `#ec4899` |
| `hatban_font` | CSS font-family 문자열 | 기본값 `'Jua', sans-serif` |
| `hatban_profile` | `{ title, emoji }` | 누락 값은 화면 적용 시 기본값 처리 |
| `hatban_dday` | `{ name, date }` | 값이 없으면 다음 여름방학 날짜 생성 |
| `hatban_game_records` | `{ match: { normal, moves, time }, math: { mul, div }, tensec }` | 각 기록은 `{ score, label, date }`; `matchMoves`, `matchTime`, `chosung` 관련 구형 처리 존재 |
| `hatban_quote` | `{ date, text }` | 저장 날짜에만 사용자 문구 표시 |
| `hatban_ratings` | `{ date, attitude, listen, outcome }` | 날짜가 바뀌면 0점 데이터로 교체 저장 |
| `hatban_memos` | `[{ id, text, color }]` | 배열 순서가 화면/드래그 순서 |
| `hatban_notebooks` | `{ [cellId]: string 또는 { img, text, size } }` | 문자열은 구형 Canvas data URL로 계속 읽음 |

현재 코드에는 `removeItem` 호출이나 다른 `hatban_*` 키가 없다. 모든 JSON 키는 방어 없는 `JSON.parse`를 사용한다.

## 4. 전역 상태 / window 함수

### 주요 전역 상태

- 사용자 데이터: `attitudeData`, `memos`, `notebookData`, `customQuoteData`, `customProfile`, `customDday`, `gameRecords`
- UI 상태: `memoSortable`, `editingMemoId`, `backupDayData`, `currentCollectionMode`, `currentCollectionSub`
- Canvas: `currentCellId`, `isDrawing`, `currentTool`, `currentPenColor`, `canvas`, `ctx`, `canvasHistory`, `currentNotebookMode`, `currentCanvasImgData`
- 시간 도구: `calcVal`, `tInterval`, `tRemaining`, `isTRunning`, `swInterval`, `swTime`, `isSwRunning`
- 게임: 짝맞추기/암산/지뢰찾기/10초/틱택토/오목/숫자야구/스도쿠별 상태
- 공통 비동기 상태: `activeIntervals`, `window.alertResolve`, `window.confirmResolve`

### window 함수

inline handler 호환을 위해 77개 함수가 `window`에 노출되어 있다.

- 설정/홈: `updateDday`, `openDdayModal`, `closeDdayModal`, `saveDday`, `applyThemeColor`, `changeTheme`, `changeFont`, `initData`, `editQuote`, `closeQuoteModal`, `saveQuote`, `applyProfile`, `openProfileModal`, `closeProfileModal`, `saveProfile`, `switchTab`, `customAlert`, `closeAlert`, `customConfirm`, `closeConfirm`, `toggleStar`
- 메모: `openMemoModal`, `closeMemoModal`, `selectMemoColor`, `saveMemo`, `deleteMemo`
- 배움공책: `toggleNotebookMode`, `undoCanvas`, `setPenStyle`, `applyCustomColor`, `clearCanvas`, `deleteCanvasData`, `openCanvasModal`, `closeCanvasModal`, `saveCanvas`
- 모아보기: `openCollectionModal`, `renderCollectionView`, `renderCollectionList`, `closeCollectionModal`, `clearDay`, `undoClearDay`, `downloadWeeklyNotebooks`
- 학습 도구: `openDict`, `searchDict`, `calcAction`, `setCustomTimer`, `toggleTimer`, `resetTimer`, `stopTimerAlarm`, `toggleStopwatch`, `resetStopwatch`, `openTimeModal`, `closeTimeModal`, `switchTimeTab`
- 게임: `showGameMenu`, `openGame`, 각 게임의 설정/초기화/입력 함수

HTML에는 161개의 inline event 속성이 있다. inline handler에서 호출하는 앱 함수는 모두 정의되어 있다. `window` 노출 방식은 파일 분리 후에도 유지해야 한다.

## 5. 외부 라이브러리

| 리소스 | URL/버전 | 용도/주의점 |
|---|---|---|
| Tailwind CSS | `https://cdn.tailwindcss.com` (버전 미고정) | 유틸리티 CSS와 런타임 설정 |
| Google Fonts | `fonts.googleapis.com` | 15종 한글/장식 폰트 |
| Font Awesome | cdnjs `6.4.0` | UI 아이콘 |
| SortableJS | jsDelivr `@latest` (버전 미고정) | 메모 드래그 정렬 |
| html2canvas | cdnjs `1.4.1` | 모아보기 PNG 생성 |

Tailwind와 SortableJS의 버전이 고정되지 않아 CDN 최신 버전 변경 시 앱 동작이 달라질 수 있다. 버전 고정은 별도 검증 후 진행한다.

## 6. 구조적으로 복잡한 부분

1. Canvas는 모드 전환 시 wrapper 크기로 bitmap 크기를 다시 잡고 저장 이미지를 재그리므로 실행 순서가 중요하다.
2. `hatban_notebooks`가 구형 문자열과 신형 객체를 동시에 허용해 모든 읽기 경로가 두 형식을 고려해야 한다.
3. 모아보기는 HTML 문자열 생성, 삭제/되돌리기, 필터 상태, DOM 복제, 이미지 다운로드가 한 영역에 결합돼 있다.
4. `activeIntervals` 하나가 타이머, 스톱워치, 짝맞추기, 암산, 10초 게임의 interval을 함께 관리한다.
5. 8개 게임의 상태와 화면 전환이 한 script와 공유 전역 공간에 있다.
6. custom alert/confirm이 Promise resolver 하나씩만 보관하므로 알림이 겹칠 때 이전 Promise가 남을 수 있다.
7. 사용자 입력과 고정 UI HTML이 같은 `innerHTML` 템플릿에서 렌더링되는 영역이 있다.

## 7. 실제 오류 가능성이 높은 부분

### 높음 — 존재하지 않는 지뢰찾기 도움말 모달

- 근거: `openMineHelp()`와 `closeMineHelp()`는 `mine-help-modal`을 조회하지만 HTML에 해당 ID가 없다.
- 사용자 현상: 지뢰찾기의 ‘팁’ 버튼을 누르면 `null.classList` TypeError가 발생하고 아무 창도 열리지 않는다.

### 높음 — 손상된 저장값 하나가 앱 전체 초기화를 중단

- 근거: 초기화에서 프로필, D-Day, 기록, 문구, 평가, 메모, 공책을 모두 직접 `JSON.parse`한다.
- 사용자 현상: 저장 데이터 하나만 잘못돼도 이후 홈/시간표/메모 초기화가 멈추고 Console에 SyntaxError가 남는다.

### 높음 — 메모 색상 함수의 암묵적 전역 event 의존

- 근거: `selectMemoColor(color)`가 인자로 event를 받지 않고 `event.target`을 사용하지만 `openMemoModal()`에서도 프로그램 방식으로 호출된다.
- 사용자 현상: 브라우저에 따라 메모 추가/수정 창이 열리지 않거나, 실제 색상 버튼 대신 메모 카드/추가 버튼에 선택 테두리가 붙는다.

### 중간 — 서로 무관한 interval을 한꺼번에 종료

- 근거: 시간 도구와 세 게임이 모두 `safeSetInterval()`/`clearAllIntervals()`를 공유한다.
- 사용자 현상: 타이머나 스톱워치를 켠 뒤 게임을 시작하면 시간이 멈추지만 실행 상태와 버튼은 계속 실행 중처럼 보일 수 있다. 암산 문제 전환도 다른 interval을 종료한다.

### 중간 — 짝맞추기 설정 화면 복귀 시 제한시간 유지

- 근거: `showMatchConfig()`는 match interval을 정리하지 않는다.
- 사용자 현상: 시간제한 게임 중 설정 버튼을 누른 뒤에도 숨은 제한시간이 계속 줄고, 설정 화면에서 시간 초과 알림이 나타날 수 있다.

### 중간 — 메모/공책 텍스트의 HTML 직접 삽입

- 근거: 메모의 `memo.text`와 모아보기의 `formattedText`가 템플릿의 `innerHTML`에 직접 들어간다.
- 사용자 현상: `<b>` 같은 입력이 글자가 아니라 HTML로 처리되고, 조작된 localStorage 값은 스크립트/이벤트 속성 삽입 경로가 될 수 있다.

### 중간 — 타이머 종료가 한 tick 늦음

- 근거: interval callback이 0보다 클 때 먼저 감소시키고, 다음 callback에서야 alarm 분기로 들어간다.
- 사용자 현상: 설정한 시간보다 약 1초 늦게 알람이 뜬다.

### 낮음 — 다운로드 실패 시 숨은 clone 잔류

- 근거: clone은 `try` 안에서 append되고 정상 경로에서만 remove된다.
- 사용자 현상: html2canvas가 실패하면 화면 밖 DOM이 문서에 남는다. 반복 실패 시 불필요한 DOM이 누적된다.

### 낮음 — 하루 삭제 undo 타이머 경합

- 근거: 삭제마다 5초 timeout을 만들지만 이전 timeout을 취소하지 않고 백업은 한 세트만 보관한다.
- 사용자 현상: 빠르게 연속 삭제하면 새 undo 안내가 예상보다 일찍 사라질 수 있다.

### 낮음 — 계산기의 동적 코드 실행

- 근거: `new Function('return ' + calcVal)`을 사용한다.
- 사용자 현상: 현재는 버튼 문자만 입력되어 외부 주입 가능성이 낮지만, 입력 경로가 추가되면 위험해진다. 잘못된 연산식은 `Error`로 처리된다.

## 8. 중복 / dead code 후보

### A. 확실히 사용 중

- 모든 inline handler 대상 함수
- Canvas mouse/touch handler와 그림 복원/undo 함수
- 게임 렌더/판정 함수
- localStorage 구형 notebook 문자열 호환 분기
- 게임 기록의 `matchMoves`/`matchTime` 및 `chosung` 처리: 의도는 불완전해 보여도 구형 데이터 호환 가능성이 있어 유지

### B. 사용 여부 불확실 — 유지

- `renderRecords`의 `unit` 인자: 모든 호출부에서 전달하지만 함수 내부에서는 쓰지 않는다.
- `window.closeMineHelp`: 호출 UI가 없지만 누락된 도움말 모달의 닫기 함수로 보인다.
- `window.onload`에 직접 할당하는 방식: 현재는 동작하지만 외부 script와 충돌 가능성이 있다.

### C. 삭제해도 안전하다고 판단해 Phase 1에서 제거

- `backupDayName`: 선언/대입 외 읽는 곳이 없다.
- `matchTimerInt`, `mathTimerInt`, `tenSecInt`: interval 반환값을 저장하기만 하고 읽지 않는다. interval 실행과 공통 정리는 그대로 유지했다.

복사-붙여넣기 중복은 모달 열기/닫기, 게임 config/play 전환, 저장/렌더 호출, 시간 도구 버튼 갱신에 집중돼 있다. 기능별 동작이 조금씩 달라 1차 정리에서는 공통화하지 않는다.

## 9. 리팩터링 우선순위

1. 누락 DOM/handler 오류와 메모 색상 event 의존 수정
2. JSON parse 방어를 추가하되 손상값을 자동 덮어쓰지 않기
3. 사용자 텍스트를 DOM node/textContent 기반으로 안전하게 렌더링
4. interval을 시간 도구/각 게임 단위로 분리하고 화면 이탈 시 상태도 함께 정리
5. 다운로드 clone을 finally에서 정리하고 undo timeout을 단일화
6. 기능별 섹션/저장 helper를 정돈한 뒤 일반 script 파일 분리 검토
7. 계산기 parser 개선은 버튼 동작 회귀 테스트를 준비한 뒤 마지막에 진행

## 10. 제안하는 파일 구조

### 단일 HTML 유지안

```text
햇반이네_최종.html
```

- 장점: 원본과 가장 가깝고 파일을 더블클릭해 바로 실행 가능하며 배포가 쉽다.
- 단점: 2,500줄 이상에서 기능 탐색, 충돌 검토, 부분 테스트가 어렵다.
- 권장 용도: Phase 1~3. 현재 리팩터링은 이 안으로 진행한다.

### 보수적 파일 분리안

```text
hatban/
├─ index.html
├─ css/
│  └─ style.css
└─ js/
   ├─ app.js
   ├─ notebook.js
   └─ games.js
```

- `app.js`: 저장, 초기화, 홈, 메모, 도우미, 시간 도구
- `notebook.js`: 시간표, Canvas, 모아보기/다운로드
- `games.js`: 기록 helper와 8개 게임
- 장점: 기능 위치가 명확하고 수정 범위가 작아진다.
- 단점: script 로드 순서와 공유 전역 상태를 관리해야 하며 누락 시 inline handler가 깨질 수 있다.
- 제안: 일반 `<script defer>`만 사용하고 ES Module은 쓰지 않는다. Phase 3 회귀 검증 후에만 수행한다.

## 11. 작업 계획

### Phase 0 — Baseline (완료)

- 빈 Git 저장소 상태 확인
- 원격이 없어 pull 생략
- 원본 해시/크기 기록
- 원본과 문자 내용이 동일한 작업용 사본을 기준 커밋으로 저장

### Phase 1 — Audit & Safe Cleanup (이번 단계)

- 저장 키, 전역 상태, handler, ID/DOM 참조, 비동기 작업, Canvas, 외부 의존성 조사
- 동작을 바꾸지 않는 긴 한 줄/섹션 가독성 정리
- 확실한 미사용 상태 변수만 제거
- JavaScript 구문과 정적 연결 재검사

### Phase 2 — Reliability

- 누락된 지뢰 도움말 UI 또는 팁 버튼 동작 복구
- 메모 색상 선택의 event 의존 제거
- `safeParseJSON`과 저장 데이터 shape guard 추가
- 사용자 입력 안전 렌더링
- 타이머/게임 interval과 timeout 생명주기 분리
- 다운로드/undo 정리 보강

### Phase 3 — Focused Refactor

- 반복되는 모달/config 전환을 작은 helper로만 공통화
- 저장/렌더 순서와 게임 기록 처리 명확화
- 긴 함수 내부를 책임별 helper로 나누되 window API 보존

### Phase 4 — Optional File Split

- 단일 HTML 버전의 전체 회귀 테스트가 끝난 뒤 3개 JavaScript 파일 수준으로만 분리 검토
- `file://` 직접 실행과 inline handler 호환 검증 후 채택 여부 결정

## 12. 회귀 테스트 계획

### 자동/정적 검사

- 마지막 inline script를 `node --check`로 구문 검사
- 중복 ID 검사
- 모든 정적 `getElementById` 참조와 HTML ID 대조
- 모든 inline handler 호출과 함수 정의 대조
- `hatban_*` 키 목록과 저장 JSON shape 스냅샷 비교
- 변경 전후 UI 문자열, 외부 URL, handler 속성, storage key diff 검사

### 수동 브라우저 검사

1. 빈 localStorage와 정상 기존 데이터에서 시작/새로고침/Console 확인
2. 의도적으로 JSON 하나를 손상시킨 상태에서 나머지 기능 초기화 확인
3. 테마, 폰트, 프로필, D-Day, 문구, 별점 저장/새로고침 확인
4. 메모 생성/수정/삭제/색상/정렬과 HTML 특수문자 표시 확인
5. 시간표 현재 교시와 빈 시간 확인
6. 공책 텍스트/크기/그림 모드, mouse/touch, pen/eraser/undo, 저장/복원/삭제 확인
7. 전체/요일/과목 모아보기, 하루 삭제/undo, PNG 다운로드 확인
8. 사전 URL 인코딩과 계산기 C/DEL/소수점/사칙연산/오류 확인
9. 타이머/스톱워치 시작/정지/재시작/초기화/알람 확인
10. 각 게임의 진입/시작/플레이/다시/설정/메뉴 복귀 확인
11. 게임 interval 실행 중 다른 탭/게임/시간 도구로 이동해 정리와 상태 일치 확인
12. 기록 게임의 상위 3개 정렬과 새로고침 유지 확인

앱 내 브라우저는 로컬 `file://` URL을 보안 정책상 차단했으므로 이번 단계에서는 수동 브라우저 검사를 수행하지 못했다. Phase 1 완료 판정은 정적 검사 범위로 제한한다.
