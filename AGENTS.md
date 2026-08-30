# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## 프로젝트 구조

**토닥+** — 빌드 도구·서버·외부 라이브러리가 전혀 없는 단일 HTML 파일 PWA.
- `app.html` (2836줄) — iPhone 홈 화면 설치 전용. safe-area 변수(`--sat/--sab`), black-translucent 상태바.
- `index.html` (2751줄) — 웹/PC 버전. **`selfTest()`는 여기에만 있다.**
- `sw.js` — 현재 캐시 버전 **`todak-v16`**. 코드 수정 시 반드시 올릴 것.
- 두 파일 내용은 항상 동기화. **하나를 바꾸면 반드시 둘 다 바꾼다.**

## 빌드·테스트 명령

빌드 도구 없음. 유일한 테스트는 브라우저 콘솔:

```js
selfTest()   // ~50건 어서션, 전부 true면 통과 (index.html에서만 실행 가능)
```

로컬 실행: `python3 -m http.server 8000` (서비스워커 + localStorage 모두 필요할 때)

## 파일 내 구획 순서 (고정)

```
<style>  TOKENS → MOTION → BASE → SHELL → COMPONENTS → HOME/CHAT/BOOKING/CALENDAR
<script> DATA:상수 → UTIL → STORE → LOGIC → FX → VIEWS → ROUTER → SELFTEST(index.html만)
```

## 핵심 제약

- **LOGIC 함수**(pickAdvice, availableDates, buildMonth, makeBookingId, ymd, parseYmd)는 DOM·localStorage **절대 금지** → selfTest()로 검증 가능한 이유.
- `rerender(root, fn)` — 같은 라우트 내 단계 전환. `router()` 호출 금지 (주소 변경 없이 재렌더링).
- localStorage 키: `todak.` 접두사, 반드시 `DB.read/write` 경유.
- `Bookings.add()` 신청번호 = 당일 max+1 (길이 기반 아님 — 취소 후 번호 재사용 방지).
- CRISIS_WORDS 단어는 공백 제거 형태. `selfesteem` 키워드에 `살` 금지(위기 감지 우회 버그).

## 데이터 상수 현황

- `MOODS` (달력) / `CHAT_MOODS` (채팅): 6개 — great/good/okay/hard/tough/angry
- `RULES`: 56개 카테고리 (14 기본 + 36 AI Hub 기반 + 6 신규: lgbtq/dream_job/mental_stigma/sns_pressure/transfer/alcohol_drug)
- `Q2_MAP`: 56개 전부 2차 선택지 3개씩.
- `WITTY_PATTERNS`: 100+ 엉뚱한 질문 정규식 (14개 카테고리: 정체성/능력테스트/음식/욕설/철학 등)
- `normalizeText()`: 구어 19패턴을 키워드로 치환 후 `pickAdvice()`에 전달.

## CSS 패턴

- 모든 색·간격은 `/* == TOKENS == */`의 CSS 변수. 하드코딩 금지.
- `body` font-size **16px 이상** 고정 (iOS 입력 시 뷰포트 확대 방지).
- 탭 가능한 요소 전체에 `touch-action:manipulation` (더블탭 확대·300ms 지연 제거).

## 배포

```bash
git push https://<GH_TOKEN>@github.com/jongminkimkr/todack.git main
```
코드 수정 후 `sw.js`의 `const CACHE = 'todak-v16'` 버전을 올리지 않으면 폰·PWA에 이전 버전이 유지된다.

## CLAUDE.md 규칙

- 가정하지 말고 모른다면 물어라.
- 요청한 것만 최소한으로 변경 — 인접 코드를 "개선"하지 말 것.
- 목표는 검증 가능하게 설정 후 달성 여부를 직접 확인.
