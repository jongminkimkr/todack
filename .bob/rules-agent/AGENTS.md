# Project Coding Rules (Non-Obvious Only)

## 파일 편집 시 반드시 지킬 것

- `index.html`은 **단일 파일**이며 1725줄. 섹션 구획(`/* == XXX == */`) 순서를 절대 바꾸지 않는다.
- CSS 값을 추가할 때는 반드시 `/* == TOKENS == */`에 CSS 변수를 먼저 선언하고 참조한다. 색 하드코딩 금지.
- **LOGIC 구획 함수**(pickAdvice, availableDates, buildMonth, makeBookingId, ymd, parseYmd)는 DOM·localStorage에 접근하면 안 된다. selfTest()가 깨진다.
- 새 순수 함수를 추가했으면 `/* == SELFTEST == */`에 어서션을 함께 추가한다.

## 화면 추가·수정 패턴

- 새 화면: `render<Name>(root)` 형식의 함수를 `/* == VIEWS == */`에 추가, `ROUTES` 객체와 `TAB_ORDER` 배열에 등록, tabbar HTML에 `<a>`를 추가한다.
- 같은 라우트 내 단계 전환: `rerender(root, fn)` 사용 (`router()` 호출 금지 — 주소 변경 없이 재렌더링).
- 시트(bottom-sheet)를 열기 전에 기존 `.sheet`, `.sheet-dim`이 남아 있는지 확인하고 제거한 뒤 추가한다.

## 저장소 수정

- localStorage 키는 항상 `todak.` 접두사. `DB.read(key, fallback)` / `DB.write(key, value)` 경유.
- `Bookings.add()`의 신청번호 생성 로직(당일 max+1)은 손대지 않는다 — 번호 재사용 버그가 재발한다(검토 C2).

## 위기 키워드 관리

- `CRISIS_WORDS`에 등록할 단어는 공백을 제거한 형태로만 작성 (`pickAdvice`가 `flat = t.replace(/\s/g,'')` 대조).
- `selfesteem` 규칙의 키워드에 `살`을 쓰지 않는다 — `죽고살` 패턴을 가로채 위기 감지를 우회시킨다(주석 참고).

## 캐시 갱신

코드를 수정하면 `sw.js`의 `const CACHE = 'todak-v1'` 숫자를 반드시 올린다. 안 올리면 폰·PWA에 이전 버전이 계속 나온다.
