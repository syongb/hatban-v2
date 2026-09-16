# 햇반이네 v2 구조

## 현재 원칙

- v1 코드를 복사해 쪼개지 않고 기능을 새로 구현한다.
- 화면 단위 코드는 `features` 아래에서 독립적으로 찾을 수 있게 한다.
- 앱 전체에 필요한 navigation만 `app` 아래에 둔다.
- 아직 사용하지 않는 service/state 계층은 빈 파일로 미리 만들지 않는다.
- 기능이 실제로 저장을 필요로 할 때 repository 경계를 추가한다.

## 현재 실행 흐름

```text
index.html
  → src/main.js
    → app/router.js
    → features/*/*View.js
    → styles/main.css
```

`main.js`는 앱 shell과 navigation을 연결하고, 시작할 때 저장된 전역 테마·글꼴을 적용한다. router는 URL hash와 현재 화면만 동기화한다. 각 feature 모듈은 자신의 화면 DOM만 생성한다.

### 홈

홈은 화면, 저장소, 공통 화면 설정을 분리한다.

- `homeView.js`: 대시보드 화면, 입력 이벤트와 메모 debounce
- `homeStorage.js`: `hatban_v2_home`의 안전한 읽기·쓰기와 D-Day 날짜 계산
- `app/preferences.js`: 홈에서 고른 테마·글꼴을 앱 전체 CSS 변수에 적용

홈 저장소는 legacy 키를 읽거나 변경하지 않는다. 손상된 JSON은 warning만 남기고 메모리 기본값으로 열며, 손상된 원본은 자동 삭제하지 않는다.

## 향후 확장 경계

### 상태

닉네임, 반 코드처럼 여러 화면에서 공유하는 값이 생길 때 `src/app/state.js`를 추가한다. 특정 게임의 진행 상태는 해당 게임 폴더 안에 둔다.

### 저장소

첫 저장 기능인 배움공책은 기능 전용 `notebookStorage.js`를 사용한다. 화면은 `localStorage` 키와 JSON 파싱 방법을 알지 못한다. 다른 기능에서도 저장이 필요해져 공통 동작이 실제로 생기면 그때 `src/services/storage/`로 공통 부분을 올린다.

손상된 JSON은 warning을 남기고 메모리 기본값으로 연다. 읽는 과정에서는 손상된 원본 값을 삭제하거나 정상 기본값으로 덮어쓰지 않는다.

### Supabase

Supabase 연결 단계에서는 local repository와 같은 역할을 하는 adapter를 별도로 추가한다. 화면과 게임 로직은 어느 저장소인지 알 필요가 없도록 한다.

```text
src/services/records/
├─ localRecordsRepository.js
└─ supabaseRecordsRepository.js
```

예상 게임 결과 공통 필드는 `gameId`, `mode`, `score`, `studentId`, `classCode`, `playedAt`이다. 실제 schema는 Supabase 작업 단계에서 확정한다.

### 배움공책

현재 배움공책은 다음 여섯 책임으로 나뉜다.

```text
src/features/notebook/
├─ notebookView.js
├─ notebookSchedule.js
├─ notebookStorage.js
├─ notebookCanvas.js
├─ notebookExport.js
└─ notebookHistory.js
```

- `notebookView.js`: 선택 상태, 화면 렌더링, 입력과 autosave 연결
- `notebookSchedule.js`: 월~금 시간표, 수업 시간, 현재 교시와 주간 날짜 계산
- `notebookStorage.js`: `hatban_v2_notebooks` 읽기·안전 파싱·저장
- `notebookCanvas.js`: Canvas 크기, Pointer Events, 펜·지우개, Undo, PNG Data URL 추출·복원
- `notebookExport.js`: 출력용 Canvas 합성, 한글 줄바꿈, 파일명 정리, PNG Blob 생성, 공유·다운로드 선택
- `notebookHistory.js`: 저장 항목의 안전한 정규화, 최신순 정렬, 요일·과목 필터, 미리보기 생성

저장 데이터는 다음 형태다.

```json
{
  "version": 1,
  "entries": {
    "2026-09-15:tue:3": {
      "id": "2026-09-15:tue:3",
      "date": "2026-09-15",
      "dayId": "tue",
      "day": "화요일",
      "subject": "수학",
      "period": 3,
      "text": "오늘 배운 내용",
      "drawing": "data:image/png;base64,... 또는 null",
      "createdAt": "ISO 날짜",
      "updatedAt": "ISO 날짜"
    }
  }
}
```

공책 ID에 날짜·요일·교시를 사용하므로 같은 과목이 하루에 여러 번 있어도 분리되며, 주가 바뀌면 새 기록이 된다. 텍스트와 그림은 한 entry에 함께 저장된다. 빈 Canvas는 큰 이미지를 만들지 않고 `drawing: null`을 유지한다. 모든 픽셀이 지워진 경우도 다음 저장 때 `null`이 된다.

텍스트 입력과 완료된 Canvas stroke는 같은 700ms debounce로 저장한다. `pointermove`마다 이미지를 만들지 않는다. 과목이나 앱 화면을 바꾸거나 페이지가 종료될 때 대기 중인 기록은 즉시 저장한다. `main.js`는 화면 모듈이 반환한 선택적 `destroy()`를 다음 화면 렌더 전에 호출한다.

Canvas는 `pointerdown`부터 `pointerup`/`pointercancel`까지를 한 stroke로 처리한다. stroke 시작 전 PNG snapshot 하나를 Undo history에 넣고 최근 25개만 메모리에 유지한다. 지우개는 흰색을 칠하지 않고 `destination-out` compositing으로 투명하게 지운다.

Canvas CSS 크기와 bitmap 크기를 함께 맞추며 `devicePixelRatio`를 최대 2까지 반영한다. `ResizeObserver`가 화면 크기 변화를 감지하고, 크기를 바꾸기 전에 현재 bitmap을 임시 Canvas에 복사한 뒤 새 buffer에 비율을 맞춰 복원한다.

그림은 `canvas.toDataURL('image/png')` 결과로 저장한다. 그림 데이터 때문에 localStorage 저장이 실패하면 새 그림은 저장되지 않았음을 화면에 표시하고, 이전 그림을 유지한 작은 entry로 다시 저장해 새 텍스트가 함께 사라지는 것을 막는다.

내보내기는 저장 구조를 변경하지 않는다. 현재 화면의 날짜·요일·교시·과목·텍스트·그림을 `notebookExport.js`에 전달해 폭 1600px의 별도 Canvas에 합성한다. 텍스트는 명시적인 줄바꿈을 보존하면서 글자 단위까지 폭을 계산하고, 내용 길이에 맞춰 이미지 높이를 늘린다. drawing은 원본 비율을 유지하고 투명 픽셀 경계를 찾아 불필요한 여백을 줄인다. 최종 배경은 밝은색으로 명시한다.

출력 Canvas는 PNG Blob으로만 만들며 localStorage에는 다시 저장하지 않는다. 안전한 날짜·교시·과목 파일명을 만들고, `navigator.share`와 `navigator.canShare`가 PNG `File` 공유를 지원하면 시스템 공유창을 사용한다. 지원하지 않거나 공유 오류가 발생하면 임시 object URL을 이용해 다운로드한다. `AbortError`는 사용자가 취소한 정상 흐름으로 처리하며 다운로드나 오류 안내를 강제하지 않는다.

모아보기는 `notebookStorage.js`의 `getAllEntries()`만 통해 저장 항목을 읽는다. `notebookHistory.js`는 일부 필드가 빠진 항목을 안전한 기본값으로 정리하고, 식별자·날짜·교시가 심하게 손상된 항목은 건너뛴다. 목록은 날짜 내림차순, 같은 날짜에서는 교시 오름차순이며 과목 목록은 실제 저장된 항목에서만 만든다.

과거 공책을 열면 화면은 entry의 기존 `id`, `date`, `dayId`, `subject`, `period`을 편집 대상으로 고정한다. 따라서 수정과 PNG 내보내기가 현재 시간표 날짜가 아니라 과거 entry 자체에 적용된다. 모아보기는 drawing 이미지를 미리 디코딩하지 않고 존재 여부만 표시한다.

다음 배움공책 단계에서는 기록 삭제와 전체·요일·과목별 추가 정리 기능을 검토한다. 서버 기능이 시작되기 전까지 PNG는 기기에서 즉시 생성하며 별도로 보관하지 않는다.
