# 햇반이네 v2

Vite와 Vanilla JavaScript로 새로 만드는 학급용 배움 앱이다. 4개 최상위 화면과 반응형 navigation, 배움공책의 주간 시간표, 텍스트·Canvas 필기 저장, 제출용 PNG 생성과 공유 기능을 제공한다.

## 실행

```bash
npm install
npm run dev
```

프로덕션 빌드 확인:

```bash
npm test
npm run build
```

## 현재 범위

- 홈
- 배움공책 주간 시간표, 과목 선택, 텍스트·Canvas 필기 자동 저장·복원
- 현재 공책의 날짜·수업 정보·텍스트·그림을 합친 PNG 생성
- 지원 기기의 시스템 공유와 미지원 환경의 PNG 다운로드 fallback
- 학습 도우미
- 집중 게임
- hash 기반 화면 이동
- 모바일, 태블릿, PC 반응형 UI

메모, 배움공책 모아보기, 도구, 게임, 서버 저장은 이후 단계에서 기능별로 구현한다. legacy v1 기능 목록은 `docs/FEATURE_CHECKLIST.md`에서 관리한다.
