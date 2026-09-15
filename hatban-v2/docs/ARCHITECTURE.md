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

`main.js`는 앱 shell과 navigation을 연결한다. router는 URL hash와 현재 화면만 동기화한다. 각 feature 모듈은 자신의 화면 DOM만 생성한다.

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

현재 배움공책은 다음 네 책임으로 나뉜다.

```text
src/features/notebook/
├─ notebookView.js
├─ notebookSchedule.js
├─ notebookStorage.js
└─ notebookCanvas.js
```

- `notebookView.js`: 선택 상태, 화면 렌더링, 입력과 autosave 연결
- `notebookSchedule.js`: 월~금 시간표, 수업 시간, 현재 교시와 주간 날짜 계산
- `notebookStorage.js`: `hatban_v2_notebooks` 읽기·안전 파싱·저장
- `notebookCanvas.js`: Canvas 크기, Pointer Events, 펜·지우개, Undo, PNG Data URL 추출·복원

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

다음 단계에서 PNG 다운로드와 공유를 구현할 때 `shareNotebook.js`를 추가한다. 이 모듈은 Web Share API 지원 여부를 확인하고 지원되지 않으면 일반 PNG 다운로드를 사용한다.
