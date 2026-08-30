# Project Coding Rules (Non-Obvious Only)

## 파일 편집 시 반드시 지킬 것

- **app.html과 index.html을 항상 동기화**. 두 파일은 독립적이며, 하나를 바꾸면 둘 다 바꿔야 한다.
  - `app.html` (2836줄): iPhone 전용. `--sat/--sab` safe-area 변수, black-translucent 상태바 코드가 추가되어 있음.
  - `index.html` (2751줄): 웹/PC. `selfTest()` 함수(`/* == SELFTEST == */`)가 여기에만 있음.
- 섹션 구획(`/* == XXX == */`) 순서를 절대 바꾸지 않는다.
- CSS 값 추가 시 `/* == TOKENS == */`에 CSS 변수를 먼저 선언하고 참조한다. 색 하드코딩 금지.
- **LOGIC 구획 함수**(pickAdvice, availableDates, buildMonth, makeBookingId, ymd, parseYmd)는 DOM·localStorage에 절대 접근하면 안 된다. selfTest()가 깨진다.
- 새 순수 함수를 추가했으면 `index.html`의 `/* == SELFTEST == */`에 어서션을 함께 추가한다.

## 화면 추가·수정 패턴

- 새 화면: `render<Name>(root)` 형식의 함수를 `/* == VIEWS == */`에 추가, `ROUTES` 객체와 `TAB_ORDER` 배열에 등록, tabbar HTML에 `<a>`를 추가한다.
- 같은 라우트 내 단계 전환: `rerender(root, fn)` 사용 (`router()` 호출 금지 — 주소 변경 없이 재렌더링).
- 시트(bottom-sheet)를 열기 전에 기존 `.sheet`, `.sheet-dim`이 남아 있는지 확인하고 제거한 뒤 추가한다.

## 저장소 수정

- localStorage 키는 항상 `todak.` 접두사. `DB.read(key, fallback)` / `DB.write(key, value)` 경유.
- `Bookings.add()`의 신청번호 생성 로직(당일 max+1)은 손대지 않는다 — 번호 재사용 버그가 재발한다(검토 C2).

## 데이터 상수 수정

- `MOODS` 배열 변경 시 `CHAT_MOODS`도 동일하게 변경. `MOOD_BY_KEY`는 `MOODS`에서 자동 생성됨.
- `RULES`에 카테고리 추가 시 `Q2_MAP`에도 해당 id의 선택지 3개를 추가해야 한다.
- `normalizeText()`: 구어 패턴을 키워드로 치환하는 19개 규칙. 새 미매칭 패턴 발견 시 여기에 추가.
- `WITTY_PATTERNS`: 엉뚱한 질문용 정규식 100+개. 신규 패턴은 적절한 카테고리 그룹 안에 추가.

## 위기 키워드 관리

- `CRISIS_WORDS`에 등록할 단어는 공백을 제거한 형태로만 작성 (`pickAdvice`가 `flat = t.replace(/\s/g,'')` 대조).
- `selfesteem` 규칙의 키워드에 `살`을 쓰지 않는다 — `죽고살` 패턴을 가로채 위기 감지를 우회시킨다(주석 참고).
- `pickAdvice()`에서 위기 감지는 **early-return**이며 다른 모든 규칙보다 우선한다. 로직 순서를 바꾸지 않는다.

## 캐시 갱신

코드를 수정하면 `sw.js`의 `const CACHE = 'todak-v16'` 숫자를 반드시 올린다. 안 올리면 폰·PWA에 이전 버전이 계속 나온다.
