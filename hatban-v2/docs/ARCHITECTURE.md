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

첫 저장 기능을 구현할 때 `src/services/storage/`를 추가하고 UI가 `localStorage`를 직접 호출하지 않게 한다. 예시는 다음과 같다.

```text
src/services/storage/
├─ localStorageRepository.js
└─ storageKeys.js
```

### Supabase

Supabase 연결 단계에서는 local repository와 같은 역할을 하는 adapter를 별도로 추가한다. 화면과 게임 로직은 어느 저장소인지 알 필요가 없도록 한다.

```text
src/services/records/
├─ localRecordsRepository.js
└─ supabaseRecordsRepository.js
```

예상 게임 결과 공통 필드는 `gameId`, `mode`, `score`, `studentId`, `classCode`, `playedAt`이다. 실제 schema는 Supabase 작업 단계에서 확정한다.

### 배움공책

Canvas 입력, 기록 상태, PNG 생성, 공유를 한 파일에 섞지 않는다.

```text
src/features/notebook/
├─ notebookView.js
├─ drawingCanvas.js
├─ notebookStore.js
└─ shareNotebook.js
```

`shareNotebook.js`는 Web Share API 지원 여부를 확인하고, 지원되지 않으면 PNG 다운로드를 사용한다.
