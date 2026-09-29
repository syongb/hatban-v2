# 햇반이네 v2

Vite와 Vanilla JavaScript로 새로 만드는 학급용 배움 앱이다. 개인화 홈 대시보드, 반응형 navigation, 배움공책의 주간 시간표, 텍스트·Canvas 필기 저장, 제출용 PNG 생성과 공유 기능을 제공한다.

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

- 홈: 프로필, 오늘의 문구, D-Day, 포스트잇 메모, 오늘의 자기평가, 테마·글꼴 설정
- 학습 도우미: 국어·한자 사전, 안전한 간단 계산기, 타이머·스톱워치, 학습 사이트 링크
- 배움공책 주간 시간표, 과목 선택, 텍스트·Canvas 필기 자동 저장·복원
- 지난 배움공책 모아보기, 최신순 정렬, 요일·과목 필터, 과거 기록 재편집
- 현재 공책의 날짜·수업 정보·텍스트·그림을 합친 PNG 생성
- 지원 기기의 시스템 공유와 미지원 환경의 PNG 다운로드 fallback
- 학습 도우미
- 집중 게임
- hash 기반 화면 이동
- 모바일, 태블릿, PC 반응형 UI

배움공책 모아보기는 구현되어 있으며, legacy v1 기능 목록은 `docs/FEATURE_CHECKLIST.md`에서 관리한다.

## Supabase 학급 랭킹

Supabase는 집중게임 랭킹에만 사용한다. 배움공책, 그림, 포스트잇, D-Day, 테마, 글꼴, 시간표는 기존처럼 브라우저의 localStorage에 저장한다. 학생은 이메일이나 비밀번호 없이 Anonymous Auth로 식별되며, Home 프로필 이름과 서버 표시 이름을 함께 사용한다.

학생은 처음 랭킹을 열 때 학급 참가 코드를 입력한다. 코드는 서버 RPC에서 SHA-256 해시로 검증되고, 가입 뒤에는 RLS가 같은 학급의 멤버와 최고 기록만 조회하도록 제한한다. 게임 결과도 RPC가 허용된 게임·모드·점수 범위를 확인한 뒤 개인 최고 기록만 갱신한다. `game_bests` 변경은 Supabase Realtime으로 구독하며 연결 실패 시 게임과 로컬 기록은 계속 작동한다.

로컬 환경에는 `.env.example`을 복사해 다음 공개 값만 설정한다.

```text
VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

service-role key, database password 같은 비밀 값은 프론트엔드 환경변수나 저장소에 넣지 않는다. GitHub Pages는 저장소의 `.env.production`에 있는 공개 URL과 publishable key를 사용한다.

Supabase CLI로 원격 프로젝트를 연결하고 migration을 적용한다.

```bash
npx supabase login
npx supabase link --project-ref PROJECT_REF
npx supabase db push
```

Anonymous Sign-Ins를 활성화한 뒤 `supabase/migrations`의 schema, RLS, RPC, Realtime publication을 적용해야 한다.
