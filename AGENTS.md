# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project

**토닥+** — 빌드 도구·서버·외부 라이브러리가 전혀 없는 단일 HTML 파일 PWA.
`index.html` 1개에 HTML·CSS·JS·인라인 SVG 로고가 모두 들어 있다.

## No Build / No Test Runner

- 빌드 명령, `package.json`, npm, 번들러, 테스트 프레임워크 **없음**.
- 로컬 실행: `open index.html` (macOS) / `start index.html` (Windows).
- 로컬 서버: `python3 -m http.server 8000` (서비스워커 + localStorage 둘 다 필요할 때).

## 유일한 테스트 방법

브라우저 콘솔에서 직접 실행:

```js
selfTest()   // 49건 → 전부 true면 통과
```

`selfTest()`는 `index.html` 맨 아래 `/* == SELFTEST == */` 구획에 있으며, 실제 `localStorage`를 쓰고 테스트 후 원상 복구한다.

## index.html 내부 구획 구조 (엄수)

파일 내 주석 구획 순서는 고정이며 반드시 유지해야 한다:

```
<style>
  /* == TOKENS == */   디자인 토큰
  /* == MOTION == */   @keyframes, prefers-reduced-motion
  /* == BASE == */
  /* == SHELL == */    appbar, tabbar, #view
  /* == COMPONENTS == */
  /* == HOME/CHAT/BOOKING/CALENDAR == */

<script>
  /* == DATA: 상수 == */   MOODS, SLOTS, RULES, CRISIS_WORDS
  /* == UTIL == */         ymd(), esc(), parseYmd()
  /* == STORE == */        DB, Moods, Bookings
  /* == LOGIC == */        pickAdvice(), availableDates(), buildMonth() …
  /* == FX == */           fx.reveal, AURORA, enhance …
  /* == VIEWS == */        renderHome/Chat/Booking/Calendar
  /* == ROUTER == */
  /* == SELFTEST == */
```

## 핵심 아키텍처 제약

- **LOGIC 함수는 DOM·`localStorage`를 절대 건드리지 않는다.** 입력 → 반환만. 이 원칙 덕에 `selfTest()`로 검증 가능하다.
- 화면 전환: 해시 라우터 (`#/home`, `#/chat`, `#/booking`, `#/calendar`). `#view` 영역을 통째로 재렌더링.
- `router()` 호출 시 기존 `.sheet`·`.sheet-dim` 노드를 직접 `remove()`로 정리함 (시트가 남아 상태가 어긋나는 것을 방지).
- **시트 이전에 라우터가 hash를 변경하지 않는다.** 같은 라우트 안에서 단계를 바꿀 때는 `rerender(root, fn)`을 쓴다.
- `Bookings.add()`에서 신청번호는 배열 길이가 아닌 당일 최댓값 +1로 계산 (취소 후 번호 재사용 방지).

## 저장소 패턴

모든 localStorage 키는 `todak.` 접두사 (`todak.moods`, `todak.bookings`).  
`STORAGE_OK` 플래그로 첫 로드 시 가용성을 확인 → 불가 시 상단 빨간 띠 표시.

## CSS 패턴

- 모든 색·간격·라운드·폰트는 `/* == TOKENS == */`의 CSS 변수로 정의. 하드코딩 금지.
- `body` font-size는 **16px 이상** 고정 — iOS가 입력 시 뷰포트를 확대하는 것을 막기 위함.
- `touch-action:manipulation`은 탭 가능한 요소 전체에 선언 (더블탭 확대·300ms 지연 제거).

## 배포 후 캐시 갱신

`sw.js`의 `const CACHE = 'todak-v1'` 값을 올려야 이전 캐시가 교체된다. 코드 수정만으로는 폰에 새 버전이 반영되지 않는다.

## CLAUDE.md 규칙 (요약)

- 가정하지 말고 모른다면 물어라.
- 요청한 것만 최소한으로 변경 — 인접 코드를 "개선"하지 말 것.
- 목표는 검증 가능하게 설정 후 달성 여부를 직접 확인.
