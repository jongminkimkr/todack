# 토닥+ 구현 계획서 (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 「간편 상담 → 위클래스 상담 신청·예약 → 감정달력 기록」 세 흐름을 하나로 연결한 학생용 심리상담 접근성 앱을, 빌드·서버·네트워크 없이 어디서나 열리는 단일 HTML 파일로 만든다.

**Architecture:** `index.html` 한 파일에 CSS·JS·SVG 로고를 전부 인라인한다. 화면 전환은 해시 라우터(`#/home`, `#/chat`, `#/booking`, `#/calendar`)로 처리하고, 각 화면은 `#view` 안을 통째로 다시 그리는 렌더 함수 하나가 담당한다. 데이터는 `localStorage`에 저장하며, 순수 함수(감정 저장, 키워드 매칭, 예약 슬롯 생성, 달력 격자 생성)를 UI에서 분리해 브라우저 콘솔에서 `selfTest()`로 검증한다. 시각적 완성도는 [reactbits.dev](https://reactbits.dev)의 이펙트를 **바닐라 CSS/Canvas로 이식**해 확보한다 (§5).

> **읽는 순서:** §0–§5 설계 → §6 태스크(빌드 기록) → **§10 최종 검토에서 고친 것** → **§11 보완·모바일(PWA)**.
> 코드를 참고할 목적이라면 태스크 블록이 아니라 `index.html`을 보세요.

**Tech Stack:** 바닐라 HTML/CSS/JS (ES2020). 외부 라이브러리·CDN·폰트·빌드 도구 **전부 없음**. 저장소는 `localStorage`. 아이콘은 이모지, 로고는 인라인 SVG. 모션은 CSS `transform`/`opacity`, Web Animations API, `IntersectionObserver`, 그리고 배경 1개에 한해 2D Canvas.

---

## 0. 확정된 설계 결정

요구 정의서를 읽고 사용자와 확인한 결과, 아래 3가지가 확정되었다.

| 항목 | 결정 | 이유 |
|---|---|---|
| 간편 상담 응답 | **규칙 기반 (키워드 매칭)** | API 키·서버·인터넷 불필요. 심사·시연 환경에서 100% 동일하게 재현된다. |
| 파일 구성 | **단일 `index.html` 1개** | "어느 환경에서도 작동"이라는 요구에 가장 부합. 더블클릭으로 열린다. |
| 데이터 저장 | **`localStorage` 프로토타입** | 서버 없이 새로고침 후에도 데이터 유지. 실제 위클래스 선생님께 전송되지는 않는다. |

### 이 결정이 만드는 제약 (반드시 인지할 것)

1. **간편 상담은 대화형 AI가 아니다.** 고민 텍스트에서 키워드를 뽑아 미리 작성된 도움말 카드를 보여주는 방식이다. 요구 정의서 4-①의 "상황에 맞는 기본적인 도움말이나 생각해 볼 수 있는 방법을 제공한다"에 정확히 대응한다.
2. **상담 신청은 실제로 전송되지 않는다.** 신청 내역은 이 브라우저 안에만 남는다. 이 사실을 신청 완료 화면에 명시한다 — 학생이 "신청됐으니 선생님이 아시겠지"라고 오해하면 안 된다.
3. **`localStorage`는 브라우저별·기기별로 분리된다.** 다른 기기에서는 기록이 보이지 않는다.
4. **개인정보가 기기에 남는다.** 학년·반·이름을 저장하므로, 공용 PC 사용을 가정해 설정 화면 없이도 신청 내역에서 개별 삭제가 가능해야 한다 (Task 8에 포함).

### TDD 적용 방식에 대한 메모

빌드 도구가 없으므로 Jest·Vitest 같은 테스트 러너를 쓸 수 없다. 대신:

- **순수 로직**(`ymd`, `pickAdvice`, `availableDates`, `buildMonth`, `makeBookingId`)은 `index.html` 안의 `selfTest()` 함수에 어서션을 먼저 작성하고, 콘솔에서 FAIL을 확인한 뒤 구현한다. 실질적인 TDD 사이클이다.
- **UI**는 각 태스크에 명시된 **수동 검증 체크리스트**로 확인한다.

`selfTest()`는 약 60줄이며 최종 산출물에 남겨둔다 (제거해도 앱 동작에는 영향 없음).

---

## 1. 파일 구조

**생성 파일은 `index.html` 단 하나.** 단, 파일 내부는 아래 순서의 주석 구획으로 나눈다. 이 구획 순서를 지켜야 이후 태스크의 "어디에 넣어라" 지시가 맞아떨어진다.

```
index.html
├─ <head>
│   └─ <style>
│       ├─ /* == TOKENS == */        디자인 토큰 (색·간격·라운드)
│       ├─ /* == BASE == */          리셋, body, 타이포
│       ├─ /* == SHELL == */         appbar, tabbar, view
│       ├─ /* == COMPONENTS == */    card, btn, chip, field, sheet
│       ├─ /* == HOME == */
│       ├─ /* == CHAT == */
│       ├─ /* == BOOKING == */
│       └─ /* == CALENDAR == */
└─ <body>
    ├─ <svg hidden> #logo-clover 심볼 정의
    ├─ <header class="appbar">
    ├─ <main id="view">              ← 화면별로 통째 교체되는 영역
    ├─ <nav class="tabbar">
    └─ <script>
        ├─ /* == DATA: 상수 == */     MOODS, SLOTS, RULES, CRISIS
        ├─ /* == UTIL == */          ymd, el, esc
        ├─ /* == STORE == */         DB, Moods, Bookings
        ├─ /* == LOGIC == */         pickAdvice, availableDates, buildMonth, makeBookingId
        ├─ /* == FX == */            reveal, revealWords, typeText, scrambleTo, countUp,
        │                            spotlight, tilt, magnet, clickSpark, AURORA, enhance
        ├─ /* == VIEWS == */         renderHome/Chat/Booking/Calendar
        ├─ /* == ROUTER == */
        └─ /* == SELFTEST == */
```

`<style>`에도 이펙트 구획이 하나 더 들어간다 — `/* == MOTION == */` (모션 토큰, `@keyframes`, `prefers-reduced-motion` 무력화 블록). 위치는 `TOKENS` 바로 다음.

**책임 분리 원칙:** `LOGIC` 구획의 함수는 DOM·`localStorage`를 절대 만지지 않는다. 인자를 받아 값을 반환할 뿐이다. 그래야 `selfTest()`로 검증할 수 있다.

---

## 2. 데이터 모델

`localStorage` 키는 모두 `todak.` 접두어를 쓴다.

### `todak.moods` — 감정 기록 (객체, 날짜가 키)

```json
{
  "2026-08-30": { "mood": "good", "memo": "상담 받고 나니 조금 가벼워졌다", "savedAt": "2026-08-30T10:12:00.000Z" },
  "2026-08-29": { "mood": "hard", "memo": "", "savedAt": "2026-08-29T21:40:00.000Z" }
}
```

날짜를 키로 쓰므로 "하루 1건" 규칙이 자연히 강제되고, 조회가 O(1)이다.

### `todak.bookings` — 상담 신청 (배열)

```json
[
  {
    "id": "TD-260830-01",
    "date": "2026-09-02",
    "slot": "15:30 방과후",
    "grade": "2",
    "classNo": "4",
    "name": "김하늘",
    "topics": ["학업·성적", "진로"],
    "message": "요즘 집중이 잘 안 돼요",
    "createdAt": "2026-08-30T10:15:00.000Z"
  }
]
```

### 감정 5단계 정의

| key | 이모지 | 라벨 | score | 색 토큰 |
|---|---|---|---|---|
| `great` | 😊 | 좋음 | 5 | `--mood-5` |
| `good` | 🙂 | 괜찮음 | 4 | `--mood-4` |
| `okay` | 😐 | 보통 | 3 | `--mood-3` |
| `hard` | 😟 | 힘듦 | 2 | `--mood-2` |
| `tough` | 😢 | 매우 힘듦 | 1 | `--mood-1` |

요구 정의서 4-③의 5단계와 정확히 일치한다.

---

## 3. 디자인 방향

요구사항: **흰색과 초록색을 적절히 섞고, 로고는 네잎클로버.**

- **바탕은 흰색/아주 옅은 초록(`--green-50`)**, 카드는 흰색 + 옅은 초록 테두리, **강조·버튼·선택 상태에만 진한 초록**을 쓴다. 초록을 넓은 면적에 깔지 않는 것이 핵심 — 깔면 촌스러워지고 텍스트 대비도 무너진다.
- 감정 5단계 중 `좋음/괜찮음/보통`은 초록 계열 농도 차로, `힘듦/매우 힘듦`은 낮은 채도의 살구·흙빛으로 구분한다. 전부 초록으로 하면 "힘듦"이 시각적으로 구별되지 않는다.
- 폰트는 시스템 폰트 스택만 사용한다 (웹폰트를 불러오면 오프라인에서 깨진다).
- 레이아웃은 **모바일 우선, `max-width: 480px` 중앙 정렬**. 데스크톱에서 열어도 휴대폰 앱처럼 보인다.
- 모션은 §5의 이펙트 시스템을 따른다. **원칙: 불안한 학생을 진정시키는 움직임만 넣는다.** 빠르고 튀는 모션(글리치·번쩍임·급가속)은 이 앱에서 금지다.

---

## 4. 화면 및 라우팅

| 해시 | 화면 | 렌더 함수 |
|---|---|---|
| `#/home` (기본) | HOME — 3개 진입 카드 + 오늘의 감정 요약 | `renderHome` |
| `#/chat` | 간편 상담 — 고민 입력 → 도움말 → 상담 신청 연결 | `renderChat` |
| `#/booking` | 상담 신청 — 날짜 선택 → 정보 입력 → 완료 | `renderBooking` |
| `#/calendar` | 감정달력 — 월 격자 → 날짜 선택 → 감정·메모 | `renderCalendar` |

요구 정의서 5번의 화면 구성과 1:1 대응한다. 상담 신청의 3단계는 별도 라우트가 아니라 `renderBooking` 내부의 `step` 상태로 처리한다 (뒤로가기로 홈까지 한 번에 나가지 않게 하려면 단계별 "이전" 버튼을 둔다).

---

## 5. 모션·이펙트 시스템 (reactbits.dev 참고)

### 5.1 이식 전략 — 왜 라이브러리를 안 쓰는가

[reactbits.dev](https://reactbits.dev)의 컴포넌트는 React + framer-motion / GSAP / OGL(WebGL) 기반이다. 우리는 **단일 HTML·오프라인 동작**이 요구 정의서의 제약이므로 패키지를 그대로 쓸 수 없다. 대신 **효과의 동작 원리를 바닐라로 이식**한다 — 사용자의 지시("참고해서")가 정확히 이것을 의미한다.

이식 난이도는 세 등급으로 나뉜다.

| 등급 | 원본 구현 | 이식 방법 | 채택 |
|---|---|---|---|
| A | CSS transform/opacity/gradient | CSS `@keyframes` + Web Animations API로 1:1 이식 | ✅ 대부분 여기 |
| B | requestAnimationFrame + 2D Canvas | rAF 루프 직접 작성 (30~60줄) | ✅ 선별 채택 |
| C | WebGL 셰이더 (OGL/three.js) | 이식 불가 — CSS 근사치로 대체하거나 포기 | ❌ 원칙적 제외 |

**C등급은 쓰지 않는다.** 학교 공용 PC·구형 태블릿에서 WebGL이 꺼져 있거나 느릴 수 있고, 무엇보다 라이브러리 없이는 재현이 불가능하다. Aurora·Silk·LiquidEther 같은 셰이더 배경은 **CSS blur 그라디언트 블롭**으로 근사한다 (5.3).

### 5.2 채택 이펙트 매핑

reactbits 카탈로그에서 **이 앱의 성격에 맞는 것만** 골랐다. 선정 기준은 아래 5.5의 큐레이션 원칙이다.

| 화면 / 요소 | 참고한 reactbits 컴포넌트 | 우리 구현 이름 | 등급 |
|---|---|---|---|
| 전역 — 화면 진입 시 요소 등장 | `AnimatedContent`, `FadeContent` | `fx.reveal()` | A |
| 전역 — 목록/그리드 순차 등장 | `AnimatedList`, `BounceCards` | `fx.reveal()` 의 `stagger` 옵션 | A |
| 전역 — 클릭 피드백 | `ClickSpark` | `fx.clickSpark()` | B |
| 전역 — 하단 탭바 위 페이드 | `GradualBlur` | CSS `mask-image` 그라디언트 | A |
| 전역 — 미세 질감 | `Noise` | SVG `feTurbulence` data URI 오버레이 | A |
| HOME — 히어로 배경 | `Aurora`, `SoftAurora`, `Silk` | `fx.AURORA` (CSS 블롭 마크업) | A |
| HOME — 「토닥+」 워드마크 | `ShinyText`, `GradientText` | `.wordmark--shiny` | A |
| HOME — 3개 진입 카드 | `SpotlightCard` + `TiltedCard` | `fx.spotlight()` + `fx.tilt()` | A |
| HOME — 이번 달 기록 일수 | `CountUp`, `Counter` | `fx.countUp()` | A |
| 탭바 — 활성 표시 이동 | `PillNav`, `GooeyNav` | `.tabbar__pill` (슬라이딩) | A |
| 간편 상담 — 입력창 포커스 | `BorderGlow`, `ElectricBorder`(약화) | `.field--glow` | A |
| 간편 상담 — 공감 문장 등장 | `BlurText`, `SplitText` | `fx.reveal()` 의 `words` 모드 | A |
| 간편 상담 — 도움말 타이핑 | `TextType` | `fx.typeText()` | A |
| 간편 상담 — 팁 카드 순차 등장 | `AnimatedList` | `fx.reveal()` stagger | A |
| 상담 신청 — 3단계 진행 표시 | `Stepper` | `.stepper` | A |
| 상담 신청 — 날짜/시간 칩 hover | `Magnet`, `GlareHover` | `fx.magnet()`, `.chip--glare` | A |
| 상담 신청 — 완료 신청번호 | `DecryptedText`, `Shuffle` | `fx.scrambleTo()` | A |
| 상담 신청 — 완료 카드 테두리 | `StarBorder` | `.card--star` | A |
| 감정달력 — 날짜 격자 등장 | `AnimatedContent` (대각선 stagger) | `fx.reveal()` stagger | A |
| 감정달력 — 월 전환 | `FadeContent` (방향성) | `.slide-in-left/right` | A |
| 감정달력 — 감정 선택 시트 | `StaggeredMenu` | `.sheet` + stagger | A |
| 감정달력 — 월 요약 막대 | `CountUp` + 막대 성장 | `fx.countUp()` + CSS width 트랜지션 | A |

**B등급은 `fx.clickSpark()` 하나뿐**이다. Canvas 루프를 하나만 유지해 성능 리스크를 최소화한다.

### 5.3 Aurora 배경을 CSS로 근사하는 방법

원본 `Aurora`/`Silk`는 프래그먼트 셰이더로 노이즈 필드를 그린다. CSS 근사치는 **크게 blur 처리한 초록 계열 방사형 그라디언트 3개를 서로 다른 주기로 느리게 이동**시키는 것이다.

```css
.aurora { position:absolute; inset:-20%; z-index:0; pointer-events:none;
          filter: blur(60px) saturate(1.1); opacity:.55; }
.aurora__blob { position:absolute; width:60%; aspect-ratio:1; border-radius:50%; }
.aurora__blob:nth-child(1){ background:radial-gradient(circle,#7FD1A6 0%,transparent 70%);
                            top:-10%; left:-5%;  animation:drift-a 18s ease-in-out infinite; }
.aurora__blob:nth-child(2){ background:radial-gradient(circle,#2FA36B 0%,transparent 70%);
                            top:10%;  right:-10%; animation:drift-b 23s ease-in-out infinite; }
.aurora__blob:nth-child(3){ background:radial-gradient(circle,#C8E6D5 0%,transparent 70%);
                            bottom:-15%; left:20%; animation:drift-c 29s ease-in-out infinite; }
```

주기를 18/23/29초처럼 **서로 소인 값**으로 두면 패턴이 반복되는 것처럼 보이지 않는다. 셰이더 없이 "살아있는 배경"을 얻는 가장 값싼 방법이다.

### 5.4 모션 토큰

```css
:root{
  --dur-fast: 140ms;
  --dur-base: 260ms;
  --dur-slow: 480ms;
  --dur-reveal: 620ms;
  --ease-out:    cubic-bezier(.22,.61,.36,1);
  --ease-spring: cubic-bezier(.34,1.42,.64,1);
  --stagger: 55ms;
}
```

- `--ease-spring`은 살짝 오버슈트한다. **버튼·칩·카드 등 "누르는 것"에만** 쓰고, 텍스트에는 쓰지 않는다 (글자가 튀면 읽기 불편하다).
- `--stagger` 55ms는 8개 항목이면 총 440ms. 12개를 넘어가면 마지막 항목이 너무 늦게 나타나므로 **stagger 상한을 300ms로 클램프**한다 (`Math.min(i * 55, 300)`).

### 5.5 큐레이션 원칙 — 안 쓰는 이펙트와 그 이유

reactbits에는 170개가 넘는 컴포넌트가 있지만, **대부분은 이 앱에 넣으면 해가 된다.** 이 앱의 사용자는 "고민이 있어서 상담을 망설이는 학생"이다.

| 제외한 이펙트 | 이유 |
|---|---|
| `GlitchText`, `LetterGlitch`, `FaultyTerminal`, `ScrambledText` | 글자가 깨져 보이는 연출은 불안·오작동을 연상시킨다. 단 `DecryptedText`는 **신청번호가 확정되는 순간** 한 번만, 성공의 의미로 사용한다 (5.2 참고). |
| `SplashCursor`, `BlobCursor`, `Ribbons`, `SwarmCursor`, `Crosshair`, `TargetCursor` | 커서 추종 효과는 모바일에서 전혀 동작하지 않는다. 이 앱은 모바일 우선이다. |
| `Hyperspeed`, `Lightning`, `PixelBlast`, `Ballpit`, `Balatro` | 빠르고 자극적. 진정시키는 톤과 정면으로 충돌한다. |
| `Lanyard`, `DomeGallery`, `FlyingPosters`, `ModelViewer`, `InfiniteSpiral` | 3D/WebGL 의존 (C등급). 라이브러리 없이 이식 불가. |
| `Dock` | macOS 확대 도크는 데스크톱 은유다. 하단 탭바는 `PillNav` 방식이 맞다. |
| `ASCIIText`, `CRTWarp`, `Dither`, `PixelSnow` | 레트로/게임 톤. 학교 상담 앱의 신뢰감을 깎는다. |

**가장 중요한 예외:** 위기 키워드(자해·자살 등)가 감지된 응답 카드에는 **어떤 장식 모션도 넣지 않는다.** 반짝임·타이핑·스파클 전부 끈다. 즉시, 조용히, 전부 보이게 한다. 이 화면에서 연출은 방해물이다.

### 5.6 접근성과 성능 예산 (타협 불가)

```css
@media (prefers-reduced-motion: reduce){
  *, *::before, *::after{
    animation-duration:.01ms !important; animation-iteration-count:1 !important;
    transition-duration:.01ms !important; scroll-behavior:auto !important;
  }
  .aurora{ animation:none; }
}
```

JS 이펙트도 동일하게 존중해야 한다.

```js
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
```

`fx.typeText`, `fx.scrambleTo`, `fx.countUp`, `fx.clickSpark`는 `REDUCED`가 `true`면 **애니메이션을 건너뛰고 최종 상태를 즉시 반영**한다. 값이 안 보이거나 빈 채로 남으면 안 된다.

**성능 예산:**
- 애니메이션은 `transform`과 `opacity`만 사용한다. `width`/`top`/`left`/`box-shadow` 애니메이션 금지 (월 요약 막대의 `width` 트랜지션은 예외 — 6개뿐이고 1회성이다).
- 상시 실행되는 rAF 루프는 **0개**다. `clickSpark`는 스파크가 남아 있는 동안만 돌고 다 사라지면 스스로 멈춘다. `scrambleTo`(약 0.9초)와 `countUp`(약 0.9초)은 1회성 단발 루프이며 서로 다른 화면에서 실행되므로 겹치지 않는다.
- `.aurora`에는 `will-change: transform`을 주되, **HOME 화면에만** 둔다. 다른 화면으로 이동하면 DOM에서 제거된다 (`#view` 통째 교체이므로 자동).
- 모든 이펙트는 **없어도 앱이 정상 동작**해야 한다. 이펙트 코드가 예외를 던져도 화면이 비지 않도록, `fx.*` 호출부는 렌더 로직과 분리한다.

---

## 6. 태스크

> ⚠️ **이 아래 태스크 블록은 최초 빌드 시점의 코드입니다.**
> 구현 후 최종 검토(**§10**)와 보완·PWA 작업(**§11**)에서 일부 코드가 바뀌었고,
> 그 변경은 태스크 블록에 반영되어 있지 않습니다.
> **현재 동작하는 코드의 기준은 `index.html`이며**, 태스크 블록은 어떤 순서로
> 무엇을 왜 만들었는지에 대한 기록으로 읽어 주세요.
> 특히 `'살'` 키워드, `list.length + 1` 신청번호처럼 §10에서 **결함으로 판명되어
> 고친 코드**가 아래 블록에는 그대로 남아 있으니, 여기서 복사하지 마세요.

> **선행 안내:** 이 저장소는 아직 git 저장소가 아니다. 각 태스크 끝의 커밋 단계를 쓰려면 Task 1의 Step 0에서 `git init`을 먼저 실행한다. 커밋을 쓰지 않기로 했다면 커밋 단계는 건너뛰고 다음 태스크로 진행한다.

---

### Task 1: 앱 뼈대 — 토큰, 로고, 셸, 라우터

**Files:**
- Create: `index.html`

- [ ] **Step 0: (선택) git 저장소 초기화**

```bash
git init && printf 'coverage/\n.DS_Store\n' > .gitignore
```

- [ ] **Step 1: `index.html` 뼈대 생성**

아래 내용을 그대로 `index.html`로 저장한다. 이후 모든 태스크는 이 파일의 주석 구획 안에 코드를 추가한다.

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#F4FBF7">
<title>토닥+ — 마음을 토닥이고, 도움을 더하다</title>
<style>
/* == TOKENS == */
:root{
  --white:#FFFFFF;
  --green-50:#F4FBF7;  --green-100:#E6F5EC; --green-200:#C8E6D5;
  --green-300:#7FD1A6; --green-500:#2FA36B; --green-600:#25895A; --green-700:#1F7A4D;
  --ink:#16261E; --ink-muted:#5C7268; --line:#DCEAE2;
  --mood-5:#2FA36B; --mood-4:#7FD1A6; --mood-3:#C8E6D5; --mood-2:#F0C48A; --mood-1:#E39B8F;
  --danger:#C0553F; --danger-bg:#FCEEEA;
  --radius:14px; --radius-lg:20px; --radius-pill:999px;
  --shadow-sm:0 1px 3px rgba(22,38,30,.06);
  --shadow:0 4px 16px rgba(22,38,30,.08);
  --shadow-lg:0 12px 32px rgba(22,38,30,.12);
  --font:'Pretendard','Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic',system-ui,-apple-system,sans-serif;
  --app-w:480px;
}
/* == MOTION == */
:root{
  --dur-fast:140ms; --dur-base:260ms; --dur-slow:480ms; --dur-reveal:620ms;
  --ease-out:cubic-bezier(.22,.61,.36,1);
  --ease-spring:cubic-bezier(.34,1.42,.64,1);
  --stagger:55ms;
}
@keyframes drift-a{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(12%,8%) scale(1.15)}}
@keyframes drift-b{0%,100%{transform:translate(0,0) scale(1.1)}50%{transform:translate(-10%,12%) scale(.95)}}
@keyframes drift-c{0%,100%{transform:translate(0,0) scale(.95)}50%{transform:translate(8%,-10%) scale(1.2)}}
@keyframes shine{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes sheet-up{from{transform:translateY(100%)}to{transform:translateY(0)}}
@keyframes caret{0%,49%{opacity:1}50%,100%{opacity:0}}
.is-hidden-fx{opacity:0}
@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{
    animation-duration:.01ms !important; animation-iteration-count:1 !important;
    transition-duration:.01ms !important; scroll-behavior:auto !important;
  }
  .aurora__blob{animation:none !important}
  .is-hidden-fx{opacity:1 !important}
}
/* == BASE == */
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{
  font-family:var(--font); color:var(--ink); background:var(--green-50);
  -webkit-font-smoothing:antialiased; line-height:1.55;
  padding-bottom:calc(84px + env(safe-area-inset-bottom));
}
h1,h2,h3{margin:0; line-height:1.3; letter-spacing:-.02em}
p{margin:0}
button{font:inherit; color:inherit; cursor:pointer; border:0; background:none}
a{color:inherit; text-decoration:none}
:focus-visible{outline:2px solid var(--green-500); outline-offset:2px; border-radius:6px}
/* == SHELL == */
.appbar{
  position:sticky; top:0; z-index:30;
  display:flex; align-items:center; gap:8px;
  max-width:var(--app-w); margin:0 auto; padding:14px 20px 10px;
  background:linear-gradient(to bottom,var(--green-50) 70%,transparent);
}
.appbar__logo{width:26px; height:26px; color:var(--green-500); flex:none}
.appbar__title{font-size:19px; font-weight:800; letter-spacing:-.03em}
.appbar__title .plus{color:var(--green-500)}
#view{max-width:var(--app-w); margin:0 auto; padding:4px 20px 24px; position:relative}
.view-fade{
  position:fixed; bottom:calc(72px + env(safe-area-inset-bottom)); left:50%;
  transform:translateX(-50%); width:100%; max-width:var(--app-w); height:56px;
  pointer-events:none; z-index:19;
  background:linear-gradient(to top,var(--green-50) 25%,transparent);
}
.noise{
  position:fixed; inset:0; pointer-events:none; z-index:60; opacity:.03; mix-blend-mode:multiply;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E");
}
.tabbar{
  position:fixed; bottom:0; left:50%; transform:translateX(-50%);
  width:100%; max-width:var(--app-w); z-index:20;
  display:grid; grid-template-columns:repeat(4,1fr);
  padding:6px 8px calc(6px + env(safe-area-inset-bottom));
  background:rgba(255,255,255,.86); backdrop-filter:blur(14px) saturate(1.4);
  border-top:1px solid var(--line);
}
.tabbar__pill{
  position:absolute; top:6px; left:8px; z-index:0;
  width:calc((100% - 16px)/4); height:60px; border-radius:var(--radius);
  background:var(--green-100);
  transform:translateX(calc(var(--tab-i,0) * 100%));
  transition:transform var(--dur-base) var(--ease-spring);
}
.tabbar a{
  position:relative; z-index:1;
  display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px;
  height:60px; font-size:11px; font-weight:600; color:var(--ink-muted);
  transition:color var(--dur-base) var(--ease-out);
}
.tabbar a .ico{font-size:19px; line-height:1; transition:transform var(--dur-base) var(--ease-spring)}
.tabbar a.is-active{color:var(--green-700)}
.tabbar a.is-active .ico{transform:translateY(-2px) scale(1.12)}
/* == COMPONENTS == */
/* (Task 5에서 채운다) */
/* == HOME == */
/* == CHAT == */
/* == BOOKING == */
/* == CALENDAR == */
</style>
</head>
<body>

<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="logo-clover" viewBox="0 0 48 48">
    <g fill="currentColor">
      <path id="td-leaf" d="M24 24C24 24 24.2 13.6 21.5 10.9C19 8.4 15 8.4 12.5 10.9C10 13.4 10 17.4 12.5 19.9C15.2 22.6 24 24 24 24Z"/>
      <use href="#td-leaf" transform="rotate(90 24 24)"/>
      <use href="#td-leaf" transform="rotate(180 24 24)"/>
      <use href="#td-leaf" transform="rotate(270 24 24)"/>
    </g>
    <path d="M24 25.5C26 30 26.2 35 23.5 39.5" fill="none"
          stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>
  </symbol>
</svg>

<header class="appbar">
  <svg class="appbar__logo" aria-hidden="true"><use href="#logo-clover"/></svg>
  <h1 class="appbar__title">토닥<span class="plus">+</span></h1>
</header>

<main id="view" role="main"></main>

<div class="view-fade" aria-hidden="true"></div>
<div class="noise" aria-hidden="true"></div>

<nav class="tabbar" aria-label="주요 화면">
  <span class="tabbar__pill" aria-hidden="true"></span>
  <a href="#/home"     data-tab="home"><span class="ico">🍀</span>홈</a>
  <a href="#/chat"     data-tab="chat"><span class="ico">💬</span>간편 상담</a>
  <a href="#/booking"  data-tab="booking"><span class="ico">📝</span>상담 신청</a>
  <a href="#/calendar" data-tab="calendar"><span class="ico">📅</span>감정달력</a>
</nav>

<script>
'use strict';
/* == DATA: 상수 == */
/* == UTIL == */
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
function esc(s){ return String(s ?? '').replace(/[&<>"']/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function ymd(date){
  return date.getFullYear() + '-' +
         String(date.getMonth() + 1).padStart(2,'0') + '-' +
         String(date.getDate()).padStart(2,'0');
}
function parseYmd(s){ const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); }
/* == STORE == */
/* == LOGIC == */
/* == FX == */
/* == VIEWS == */
/* 해시를 바꾸지 않고 화면만 다시 그린다. router()와 달리 주소는 그대로지만
   스크롤은 위로 되돌려야 한다 — 아니면 새 화면이 중간부터 보인다.
   간편 상담 결과에서는 위기 안내 카드가 화면 밖으로 밀려나므로 특히 중요하다. */
function rerender(root, render){
  render(root);
  try { fx.enhance(root); } catch (err) { console.warn('fx 실패', err); }
  window.scrollTo(0, 0);
}
function renderHome(root){ root.innerHTML = '<p>HOME</p>'; }
function renderChat(root){ root.innerHTML = '<p>CHAT</p>'; }
function renderBooking(root){ root.innerHTML = '<p>BOOKING</p>'; }
function renderCalendar(root){ root.innerHTML = '<p>CALENDAR</p>'; }
/* == ROUTER == */
const ROUTES = { home:renderHome, chat:renderChat, booking:renderBooking, calendar:renderCalendar };
const TAB_ORDER = ['home','chat','booking','calendar'];
function router(){
  const name = (location.hash.replace('#/','').split('?')[0]) || 'home';
  const key = ROUTES[name] ? name : 'home';
  const root = document.getElementById('view');
  /* 시트는 body에 붙어 있어 #view 교체로 사라지지 않는다.
     열어둔 채 뒤로가기를 누르면 화면만 바뀌고 시트가 남아 상태가 어긋난다. */
  document.querySelectorAll('.sheet, .sheet-dim').forEach(n => n.remove());
  root.innerHTML = '';
  ROUTES[key](root);
  document.querySelectorAll('.tabbar a').forEach(a =>
    a.classList.toggle('is-active', a.dataset.tab === key));
  document.querySelector('.tabbar')
    .style.setProperty('--tab-i', TAB_ORDER.indexOf(key));
  window.scrollTo(0,0);
}
window.addEventListener('hashchange', router);
router();
/* == SELFTEST == */
</script>
</body>
</html>
```

- [ ] **Step 2: 브라우저에서 열어 셸 확인 (수동 검증)**

```bash
open index.html
```

확인 항목:
- 상단에 **초록 네잎클로버 로고 + "토닥+"** 가 보인다. 잎이 4장이고 줄기가 아래로 뻗어 있다.
- 하단 탭 4개가 보이고, 탭을 누르면 **초록 알약(pill)이 스프링 느낌으로 미끄러져 이동**한다.
- 본문에 `HOME` / `CHAT` / `BOOKING` / `CALENDAR` 텍스트가 라우트에 따라 바뀐다.
- 주소창 해시가 `#/chat` 등으로 바뀌고, **브라우저 뒤로가기로 이전 탭으로 돌아간다.**
- 창 너비를 넓혀도 콘텐츠가 480px로 중앙 정렬된다.

로고 잎이 4장으로 안 보이면 `<use href="#td-leaf">`의 회전 중심(`24 24`)과 `td-leaf` 경로가 중심에서 시작하는지 확인한다.

- [ ] **Step 3: 커밋**

```bash
git add index.html .gitignore && git commit -m "feat: 토닥+ 앱 셸 - 디자인/모션 토큰, 네잎클로버 로고, 해시 라우터, 슬라이딩 탭바"
```

---

### Task 2: 저장소 계층 + 셀프테스트 하네스 (TDD)

**Files:**
- Modify: `index.html` — `/* == DATA: 상수 == */`, `/* == STORE == */`, `/* == SELFTEST == */` 구획

- [ ] **Step 1: 실패하는 테스트를 먼저 작성**

`/* == SELFTEST == */` 구획에 아래를 넣는다.

```js
function selfTest(){
  const log = [];
  const ok = (name, actual, expected) => {
    const pass = JSON.stringify(actual) === JSON.stringify(expected);
    log.push((pass ? '✅ PASS' : '❌ FAIL') + ' — ' + name +
      (pass ? '' : `\n     got:  ${JSON.stringify(actual)}\n     want: ${JSON.stringify(expected)}`));
  };

  // --- ymd: 로컬 시간 기준이어야 한다 (toISOString은 UTC라 하루가 밀린다)
  ok('ymd 한 자리 월/일 0패딩', ymd(new Date(2026, 0, 5)), '2026-01-05');
  ok('ymd 자정 직후에도 날짜 유지', ymd(new Date(2026, 7, 30, 0, 10)), '2026-08-30');

  // --- makeBookingId
  ok('신청번호 형식', makeBookingId(1, new Date(2026, 7, 30)), 'TD-260830-01');
  ok('신청번호 2자리 패딩', makeBookingId(12, new Date(2026, 11, 3)), 'TD-261203-12');

  // --- Moods (실제 localStorage를 쓰되 테스트 후 원상 복구)
  const backup = localStorage.getItem('todak.moods');
  localStorage.removeItem('todak.moods');
  ok('빈 저장소 조회는 null', Moods.get('2026-08-30'), null);
  Moods.set('2026-08-30', 'good', '괜찮은 하루');
  ok('저장 후 감정 조회', Moods.get('2026-08-30').mood, 'good');
  ok('저장 후 메모 조회', Moods.get('2026-08-30').memo, '괜찮은 하루');
  Moods.set('2026-08-30', 'hard', '');
  ok('같은 날짜 재저장은 덮어쓰기', Moods.get('2026-08-30').mood, 'hard');
  ok('하루 1건만 유지', Object.keys(Moods.all()).length, 1);
  Moods.remove('2026-08-30');
  ok('삭제 후 null', Moods.get('2026-08-30'), null);
  if (backup === null) localStorage.removeItem('todak.moods');
  else localStorage.setItem('todak.moods', backup);

  console.log('\n' + log.join('\n') + '\n');
  const failed = log.filter(l => l.startsWith('❌')).length;
  console.log(failed ? `${failed}건 실패` : `전체 ${log.length}건 통과`);
  return failed === 0;
}
window.selfTest = selfTest;
```

- [ ] **Step 2: 실패 확인**

브라우저에서 `index.html`을 열고 콘솔에 입력:

```
selfTest()
```

기대 결과: `Uncaught ReferenceError: makeBookingId is not defined` (또는 `Moods is not defined`). **정의가 없어서 나는 실패**임을 확인한다.

- [ ] **Step 3: 상수 정의**

`/* == DATA: 상수 == */` 구획에 넣는다.

```js
const MOODS = [
  { key:'great', emoji:'😊', label:'좋음',      score:5, color:'var(--mood-5)' },
  { key:'good',  emoji:'🙂', label:'괜찮음',    score:4, color:'var(--mood-4)' },
  { key:'okay',  emoji:'😐', label:'보통',      score:3, color:'var(--mood-3)' },
  { key:'hard',  emoji:'😟', label:'힘듦',      score:2, color:'var(--mood-2)' },
  { key:'tough', emoji:'😢', label:'매우 힘듦', score:1, color:'var(--mood-1)' },
];
const MOOD_BY_KEY = Object.fromEntries(MOODS.map(m => [m.key, m]));
```

- [ ] **Step 4: 저장소 구현**

`/* == STORE == */` 구획에 넣는다.

```js
const DB = {
  read(key, fallback){
    try {
      const raw = localStorage.getItem('todak.' + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch { return fallback; }          // 사생활 보호 모드 / 손상된 JSON
  },
  write(key, value){
    try { localStorage.setItem('todak.' + key, JSON.stringify(value)); return true; }
    catch { return false; }               // 용량 초과 등
  }
};

const Moods = {
  all(){ return DB.read('moods', {}); },
  get(date){ return this.all()[date] || null; },
  set(date, mood, memo){
    const map = this.all();
    map[date] = { mood, memo: memo || '', savedAt: new Date().toISOString() };
    DB.write('moods', map);
    return map[date];
  },
  remove(date){ const map = this.all(); delete map[date]; DB.write('moods', map); }
};

function makeBookingId(seq, today = new Date()){
  const y = String(today.getFullYear()).slice(2);
  const m = String(today.getMonth() + 1).padStart(2,'0');
  const d = String(today.getDate()).padStart(2,'0');
  return `TD-${y}${m}${d}-${String(seq).padStart(2,'0')}`;
}

const Bookings = {
  all(){ const v = DB.read('bookings', []); return Array.isArray(v) ? v : []; },
  taken(){ return new Set(this.all().map(b => b.date + '|' + b.slot)); },
  add(entry){
    const list = this.all();
    /* 길이로 번호를 매기면 취소 후 번호가 재사용되어 기존 신청과 충돌한다 */
    const prefix = makeBookingId(0).slice(0, -2);
    const used = list.filter(b => String(b.id).startsWith(prefix))
                     .map(b => Number(String(b.id).slice(-2)) || 0);
    const seq = (used.length ? Math.max(...used) : 0) + 1;
    const record = { id: makeBookingId(seq), createdAt: new Date().toISOString(), ...entry };
    list.push(record);
    DB.write('bookings', list);
    return record;
  },
  cancel(id){
    const list = this.all();
    const i = list.findIndex(b => b.id === id);
    if (i >= 0){ list.splice(i, 1); DB.write('bookings', list); }
  }
};
```

- [ ] **Step 5: 테스트 통과 확인**

새로고침 후 콘솔에서 `selfTest()`.
기대 출력: `전체 10건 통과`, 반환값 `true`.

- [ ] **Step 6: 커밋**

```bash
git add index.html && git commit -m "feat: localStorage 저장소 계층(Moods/Bookings)과 셀프테스트 하네스"
```

---

### Task 3: 컴포넌트 & 이펙트 CSS

**Files:**
- Modify: `index.html` — `/* == COMPONENTS == */` 구획

- [ ] **Step 1: 컴포넌트 + 이펙트 CSS 작성**

`/* == COMPONENTS == */` 주석 바로 아래에 넣는다.

```css
/* --- 카드 --- */
.card{
  background:var(--white); border:1px solid var(--line); border-radius:var(--radius-lg);
  padding:18px; box-shadow:var(--shadow-sm);
  transition:box-shadow var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out);
}
.card--tap{cursor:pointer; -webkit-tap-highlight-color:transparent}
.card--tap:hover{box-shadow:var(--shadow)}
.card--tap:active{transform:scale(.985)}

/* --- SpotlightCard 이식 --- */
.card--spot{position:relative; overflow:hidden}
.card--spot::before{
  content:''; position:absolute; inset:0; pointer-events:none; opacity:0;
  background:radial-gradient(240px circle at var(--mx,50%) var(--my,50%), rgba(47,163,107,.16), transparent 65%);
  transition:opacity var(--dur-base) var(--ease-out);
}
.card--spot:hover::before{opacity:1}

/* --- StarBorder 이식 (완료 화면 전용) --- */
@property --ang{ syntax:'<angle>'; initial-value:0deg; inherits:false }
@keyframes star-spin{ to{ --ang:360deg } }
.card--star{position:relative}
.card--star::before{
  content:''; position:absolute; inset:-1.5px; border-radius:inherit; padding:1.5px;
  background:conic-gradient(from var(--ang,0deg), transparent 0 58%,
             var(--green-300) 74%, var(--green-500) 83%, transparent 93%);
  -webkit-mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite:xor; mask-composite:exclude;
  animation:star-spin 3.4s linear infinite; pointer-events:none;
}

/* --- GlareHover 이식 --- */
.glare{position:relative; overflow:hidden}
.glare::after{
  content:''; position:absolute; top:-60%; left:0; width:38%; height:220%;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.6),transparent);
  transform:skewX(-20deg) translateX(-160%); opacity:0; pointer-events:none;
}
.glare:hover::after{
  opacity:1; transform:skewX(-20deg) translateX(420%);
  transition:transform .68s var(--ease-out), opacity .18s var(--ease-out);
}

/* --- ShinyText / GradientText 이식 --- */
.shiny{
  background:linear-gradient(100deg,var(--green-700) 32%,var(--green-300) 48%,var(--green-700) 64%);
  background-size:220% auto; -webkit-background-clip:text; background-clip:text; color:transparent;
  animation:shine 4.6s linear infinite;
}

/* --- Aurora 이식 (CSS 블롭) --- */
.aurora{position:absolute; inset:-25%; z-index:0; pointer-events:none;
        filter:blur(58px) saturate(1.15); opacity:.5; will-change:transform}
.aurora__blob{position:absolute; display:block; width:62%; aspect-ratio:1; border-radius:50%}
.aurora__blob:nth-child(1){background:radial-gradient(circle,#7FD1A6 0%,transparent 70%); top:-8%;  left:-6%;  animation:drift-a 18s ease-in-out infinite}
.aurora__blob:nth-child(2){background:radial-gradient(circle,#2FA36B 0%,transparent 70%); top:6%;   right:-12%; animation:drift-b 23s ease-in-out infinite}
.aurora__blob:nth-child(3){background:radial-gradient(circle,#C8E6D5 0%,transparent 70%); bottom:-18%; left:18%; animation:drift-c 29s ease-in-out infinite}

/* --- 버튼 --- */
.btn{
  display:inline-flex; align-items:center; justify-content:center; gap:6px;
  padding:13px 20px; border-radius:var(--radius-pill);
  font-weight:700; font-size:15px; letter-spacing:-.01em;
  transition:transform var(--dur-fast) var(--ease-spring), box-shadow var(--dur-base) var(--ease-out),
             background-color var(--dur-base) var(--ease-out);
}
.btn:active{transform:scale(.96)}
.btn--primary{background:var(--green-500); color:#fff; box-shadow:0 6px 18px rgba(47,163,107,.28)}
.btn--primary:hover{background:var(--green-600); box-shadow:0 8px 24px rgba(47,163,107,.34)}
.btn--primary:disabled{background:var(--green-200); color:var(--ink-muted); box-shadow:none; cursor:not-allowed; transform:none}
.btn--ghost{background:var(--white); color:var(--green-700); border:1.5px solid var(--line)}
.btn--ghost:hover{border-color:var(--green-300); background:var(--green-50)}
.btn--block{width:100%}

/* --- 칩 (날짜/시간/감정/주제 선택) --- */
.chip{
  display:inline-flex; align-items:center; justify-content:center; gap:5px;
  padding:9px 14px; border-radius:var(--radius-pill);
  background:var(--white); border:1.5px solid var(--line);
  font-size:14px; font-weight:600; color:var(--ink-muted);
  transition:transform var(--dur-base) var(--ease-spring),
             border-color var(--dur-fast) var(--ease-out),
             background-color var(--dur-fast) var(--ease-out),
             color var(--dur-fast) var(--ease-out);
}
.chip:hover{border-color:var(--green-300); color:var(--green-700)}
.chip.is-on{background:var(--green-500); border-color:var(--green-500); color:#fff}
.chip:disabled{opacity:.4; cursor:not-allowed; text-decoration:line-through}
.chip-row{display:flex; flex-wrap:wrap; gap:8px}

/* --- 입력 필드 (BorderGlow 이식) --- */
.field{
  background:var(--white); border:1.5px solid var(--line); border-radius:var(--radius);
  transition:border-color var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out);
}
.field:focus-within{
  border-color:var(--green-300);
  box-shadow:0 0 0 4px rgba(47,163,107,.13), 0 8px 22px rgba(47,163,107,.10);
}
.field textarea, .field input{
  width:100%; border:0; background:transparent; padding:13px 15px;
  font:inherit; color:inherit; resize:none; outline:none;
}
.field textarea::placeholder, .field input::placeholder{color:#9DB3A8}
.label{display:block; font-size:13px; font-weight:700; color:var(--ink-muted); margin:0 0 7px 3px}

/* --- Stepper 이식 --- */
.stepper{display:flex; align-items:center; gap:6px; margin:2px 0 20px}
.stepper__dot{
  flex:1; height:4px; border-radius:2px; background:var(--green-200);
  position:relative; overflow:hidden;
}
.stepper__dot::after{
  content:''; position:absolute; inset:0; background:var(--green-500);
  transform:scaleX(0); transform-origin:left;
  transition:transform var(--dur-slow) var(--ease-out);
}
.stepper__dot.is-done::after{transform:scaleX(1)}
.stepper__label{font-size:12px; font-weight:700; color:var(--green-700); flex:none; margin-left:4px}

/* --- 바텀 시트 (StaggeredMenu 이식) --- */
.sheet-dim{
  position:fixed; inset:0; z-index:40; background:rgba(22,38,30,.32);
  backdrop-filter:blur(2px); animation:fade-in var(--dur-base) var(--ease-out) both;
}
@keyframes fade-in{from{opacity:0}to{opacity:1}}
.sheet{
  position:fixed; bottom:0; left:50%; transform:translateX(-50%);
  width:100%; max-width:var(--app-w); z-index:41;
  background:var(--white); border-radius:22px 22px 0 0;
  padding:10px 20px calc(24px + env(safe-area-inset-bottom));
  box-shadow:var(--shadow-lg);
  animation:sheet-up var(--dur-slow) var(--ease-out) both;
}
.sheet__grip{width:38px; height:4px; border-radius:2px; background:var(--green-200); margin:2px auto 16px}

/* --- 텍스트 이펙트용 --- */
.fx-word{display:inline-block; will-change:transform,filter}
.is-typing::after{
  content:''; display:inline-block; width:2px; height:1em; margin-left:2px; vertical-align:-.12em;
  background:var(--green-500); animation:caret 1s steps(1) infinite;
}
.spark-canvas{position:fixed; inset:0; pointer-events:none; z-index:55}

/* --- 기타 --- */
.muted{color:var(--ink-muted); font-size:13px}
.section-title{font-size:15px; font-weight:800; margin:26px 0 10px}
.empty{
  text-align:center; padding:36px 20px; color:var(--ink-muted); font-size:14px;
  background:var(--white); border:1px dashed var(--line); border-radius:var(--radius-lg);
}
```

- [ ] **Step 2: CSS 문법 오류 확인 (수동 검증)**

브라우저에서 새로고침하고 콘솔에 입력한다.

```js
document.styleSheets[0].cssRules.length
```

기대 결과: 숫자가 출력된다(0이 아님). `SecurityError`가 나면 무시하고, 대신 **개발자도구 → Elements → Styles**에서 `.card`, `.chip`, `.btn--primary` 규칙이 파싱되어 보이는지 확인한다.

`@property --ang`를 지원하지 않는 구형 브라우저에서는 `.card--star` 테두리가 회전하지 않고 정지한 그라디언트로 보인다. **깨지는 것이 아니라 정적으로 보이는 것**이므로 허용한다.

- [ ] **Step 3: 커밋**

```bash
git add index.html && git commit -m "style: 컴포넌트 CSS와 reactbits 이펙트 이식(Spotlight/StarBorder/Glare/Shiny/Aurora/Stepper)"
```

---

### Task 4: 이펙트 엔진 (JS)

**Files:**
- Modify: `index.html` — `/* == FX == */` 구획

- [ ] **Step 1: `fx` 객체 구현**

`/* == FX == */` 주석 바로 아래에 넣는다. 모든 함수가 `REDUCED`를 존중해야 한다.

```js
const fx = {};

/* AnimatedContent / AnimatedList 이식 — 등장 애니메이션 */
fx.reveal = function(scope, sel = '[data-reveal]', opts = {}){
  const { y = 14, dur = 620, stagger = 55, cap = 300 } = opts;
  const nodes = [...(scope || document).querySelectorAll(sel)];
  nodes.forEach((n, i) => {
    if (REDUCED){ n.classList.remove('is-hidden-fx'); return; }
    n.classList.add('is-hidden-fx');
    const anim = n.animate(
      [{ opacity:0, transform:`translateY(${y}px)` },
       { opacity:1, transform:'translateY(0)' }],
      { duration:dur, delay:Math.min(i * stagger, cap),
        easing:'cubic-bezier(.22,.61,.36,1)', fill:'both' });
    anim.finished.then(() => n.classList.remove('is-hidden-fx')).catch(() => {});
  });
};

/* BlurText / SplitText 이식 — 단어 단위 흐림 해제 */
fx.revealWords = function(el, opts = {}){
  if (!el || REDUCED) return;
  const { dur = 520, stagger = 42, cap = 420 } = opts;
  const words = el.textContent.trim().split(/\s+/);
  el.textContent = '';
  words.forEach((w, i) => {
    const span = document.createElement('span');
    span.className = 'fx-word';
    span.textContent = w;
    el.append(span, document.createTextNode(' '));
    span.animate(
      [{ opacity:0, filter:'blur(8px)', transform:'translateY(8px)' },
       { opacity:1, filter:'blur(0px)', transform:'translateY(0)' }],
      { duration:dur, delay:Math.min(i * stagger, cap),
        easing:'cubic-bezier(.22,.61,.36,1)', fill:'both' });
  });
};

/* TextType 이식 — 타이핑. 반환값을 호출하면 즉시 완성 */
fx.typeText = function(el, text, { speed = 20, onDone } = {}){
  if (!el) return () => {};
  if (REDUCED){ el.textContent = text; onDone && onDone(); return () => {}; }
  el.textContent = '';
  el.classList.add('is-typing');
  let i = 0, timer = null, finished = false;
  const finish = () => {
    if (finished) return; finished = true;
    clearTimeout(timer); el.textContent = text;
    el.classList.remove('is-typing'); onDone && onDone();
  };
  const step = () => {
    el.textContent = text.slice(0, ++i);
    if (i >= text.length) return finish();
    const ch = text[i - 1];
    const wait = /[.!?…]/.test(ch) ? speed * 9 : /[,·、]/.test(ch) ? speed * 4 : speed;
    timer = setTimeout(step, wait);
  };
  timer = setTimeout(step, 140);
  return finish;                       // 탭하면 건너뛰기용
};

/* DecryptedText 이식 — 왼쪽부터 순서대로 확정 */
fx.scrambleTo = function(el, text, { dur = 850 } = {}){
  if (!el) return;
  if (REDUCED){ el.textContent = text; return; }
  const POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const settleAt = text.split('').map((_, i) => 0.2 + (i / text.length) * 0.75);
  const start = performance.now();
  const tick = now => {
    const p = Math.min((now - start) / dur, 1);
    el.textContent = text.split('').map((c, i) =>
      (p >= settleAt[i] || c === '-') ? c : POOL[(Math.random() * POOL.length) | 0]
    ).join('');
    if (p < 1) requestAnimationFrame(tick); else el.textContent = text;
  };
  requestAnimationFrame(tick);
};

/* CountUp 이식 */
fx.countUp = function(el, to, { dur = 850 } = {}){
  if (!el) return;
  if (REDUCED || to === 0){ el.textContent = String(to); return; }
  const start = performance.now();
  const tick = now => {
    const p = Math.min((now - start) / dur, 1);
    el.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 3))));
    if (p < 1) requestAnimationFrame(tick); else el.textContent = String(to);
  };
  requestAnimationFrame(tick);
};

/* SpotlightCard 이식 — 커서 위치를 CSS 변수로 전달 */
fx.spotlight = function(el){
  if (!el) return;
  el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', ((e.clientX - r.left) / r.width  * 100).toFixed(1) + '%');
    el.style.setProperty('--my', ((e.clientY - r.top)  / r.height * 100).toFixed(1) + '%');
  });
};

/* TiltedCard 이식 — 마우스가 있는 환경에서만 */
fx.tilt = function(el, max = 6){
  if (!el || REDUCED || !matchMedia('(hover:hover)').matches) return;
  el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width  - .5;
    const py = (e.clientY - r.top)  / r.height - .5;
    el.style.transform =
      `perspective(700px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg)`;
  });
  el.addEventListener('pointerleave', () => { el.style.transform = ''; });
};

/* Magnet 이식 — CSS transition이 스프링 복귀를 담당한다 */
fx.magnet = function(el, strength = .22){
  if (!el || REDUCED || !matchMedia('(hover:hover)').matches) return;
  el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width  / 2);
    const dy = e.clientY - (r.top  + r.height / 2);
    el.style.transform = `translate(${(dx * strength).toFixed(1)}px, ${(dy * strength).toFixed(1)}px)`;
  });
  el.addEventListener('pointerleave', () => { el.style.transform = ''; });
};

/* ClickSpark 이식 — 스파크가 없으면 rAF 루프가 스스로 멈춘다 */
fx.clickSpark = (function(){
  if (REDUCED) return function(){};
  let canvas = null, ctx = null, sparks = [], running = false;
  function resize(){
    const d = devicePixelRatio || 1;
    canvas.width = innerWidth * d; canvas.height = innerHeight * d;
    canvas.style.width = innerWidth + 'px'; canvas.style.height = innerHeight + 'px';
    ctx.setTransform(d, 0, 0, d, 0, 0);
  }
  function ensure(){
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.className = 'spark-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.append(canvas);
    ctx = canvas.getContext('2d');
    resize();
    addEventListener('resize', resize);
  }
  function loop(){
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    sparks = sparks.filter(s => s.life > 0);
    for (const s of sparks){
      s.life -= .03; s.x += s.vx; s.y += s.vy; s.vy += .07; s.vx *= .985;
      ctx.globalAlpha = Math.max(s.life, 0);
      ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx * 3.2, s.y - s.vy * 3.2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (sparks.length) requestAnimationFrame(loop); else running = false;
  }
  return function(x, y, color = '#2FA36B', count = 10){
    ensure();
    for (let i = 0; i < count; i++){
      const a = (Math.PI * 2 * i) / count + Math.random() * .5;
      const sp = 1.5 + Math.random() * 1.9;
      sparks.push({ x, y, vx:Math.cos(a) * sp, vy:Math.sin(a) * sp, life:1, color });
    }
    if (!running){ running = true; requestAnimationFrame(loop); }
  };
})();

/* Aurora 마크업 헬퍼 */
fx.AURORA = '<div class="aurora" aria-hidden="true">' +
            '<span class="aurora__blob"></span><span class="aurora__blob"></span>' +
            '<span class="aurora__blob"></span></div>';

/* 화면이 그려진 뒤 공통으로 붙이는 이펙트 */
fx.enhance = function(scope){
  scope.querySelectorAll('.card--spot').forEach(fx.spotlight);
  scope.querySelectorAll('[data-tilt]').forEach(el => fx.tilt(el));
  scope.querySelectorAll('[data-magnet]').forEach(el => fx.magnet(el));
  fx.reveal(scope);
};

/* 전역 클릭 스파크 — data-spark 속성이 있는 요소에만 */
document.addEventListener('pointerdown', e => {
  const t = e.target.closest('[data-spark]');
  if (!t) return;
  const c = getComputedStyle(t).getPropertyValue('--spark').trim();
  fx.clickSpark(e.clientX, e.clientY, c || '#2FA36B');
});
```

- [ ] **Step 2: 라우터가 `fx.enhance`를 호출하도록 수정**

`/* == ROUTER == */` 구획의 `router()` 안에서 `ROUTES[key](root);` **바로 다음 줄**에 추가한다.

```js
  try { fx.enhance(root); } catch (err) { console.warn('fx 실패', err); }
```

`try/catch`가 필요한 이유: 이펙트가 실패해도 화면 내용은 이미 그려져 있어야 한다 (§5.6).

- [ ] **Step 3: 이펙트 동작 확인 (수동 검증)**

새로고침 후 콘솔에서 하나씩 실행한다.

```js
// 1) 타이핑
document.getElementById('view').innerHTML = '<p id="t"></p>';
fx.typeText(document.getElementById('t'), '안녕. 오늘 하루는 어땠어? 천천히 이야기해도 괜찮아.');
```
→ 글자가 한 자씩 나타나고, 마침표에서 잠깐 쉬며, 끝에 초록 커서가 깜빡인다.

```js
// 2) 스크램블
document.getElementById('view').innerHTML = '<h2 id="s"></h2>';
fx.scrambleTo(document.getElementById('s'), 'TD-260830-01');
```
→ 무작위 글자가 **왼쪽부터 순서대로** 확정되고, `-`는 처음부터 고정이다.

```js
// 3) 카운트업
document.getElementById('view').innerHTML = '<h2 id="c">0</h2>';
fx.countUp(document.getElementById('c'), 14);
```
→ 0에서 14까지 감속하며 올라간다.

```js
// 4) 클릭 스파크
document.body.insertAdjacentHTML('beforeend','<button data-spark style="position:fixed;top:40%;left:40%;padding:20px">테스트</button>');
```
→ 버튼을 누르면 초록 불꽃이 방사형으로 튀고 중력으로 떨어진 뒤 사라진다. **다 사라진 뒤 성능 탭에서 rAF가 멈춰 있어야 한다.**

```js
// 5) 오로라
document.getElementById('view').innerHTML = '<div style="position:relative;height:200px;overflow:hidden">' + fx.AURORA + '</div>';
```
→ 흐릿한 초록 덩어리 3개가 아주 느리게 떠다닌다. 경계가 뚜렷하면 `blur` 값이 적용되지 않은 것이다.

**감속 모션 확인:** OS 설정에서 「동작 줄이기」를 켠 뒤(macOS: 손쉬운 사용 → 디스플레이 → 동작 줄이기) 새로고침하고 1~3을 다시 실행한다. **애니메이션 없이 최종 값이 즉시 표시**되어야 한다. 빈 화면이 나오면 실패다.

- [ ] **Step 4: 커밋**

```bash
git add index.html && git commit -m "feat: 이펙트 엔진 - reveal/typeText/scrambleTo/countUp/spotlight/tilt/magnet/clickSpark"
```

---

### Task 5: HOME 화면

**Files:**
- Modify: `index.html` — `/* == HOME == */` CSS 구획, `/* == VIEWS == */` 의 `renderHome`

- [ ] **Step 1: HOME CSS 작성**

`/* == HOME == */` 아래에 넣는다.

```css
.hero{
  position:relative; overflow:hidden; border-radius:24px;
  background:linear-gradient(160deg,var(--white),var(--green-50));
  border:1px solid var(--line); padding:30px 22px 26px; margin-bottom:22px;
}
.hero__inner{position:relative; z-index:1}
.hero__logo{width:44px; height:44px; color:var(--green-500); display:block; margin-bottom:12px}
.hero__title{font-size:25px; font-weight:800; letter-spacing:-.035em; margin-bottom:10px}
.hero__sub{font-size:14px; color:var(--ink-muted); line-height:1.65}

.menu{display:grid; gap:10px}
.menu__item{display:flex; align-items:center; gap:14px; padding:16px 18px}
.menu__ico{
  flex:none; width:44px; height:44px; border-radius:13px; background:var(--green-100);
  display:grid; place-items:center; font-size:21px;
}
.menu__body{display:flex; flex-direction:column; gap:2px; flex:1; min-width:0}
.menu__body b{font-size:15.5px; font-weight:700}
.menu__arrow{color:var(--green-300); font-size:17px; transition:transform var(--dur-base) var(--ease-spring)}
.menu__item:hover .menu__arrow{transform:translateX(4px); color:var(--green-500)}

.stat-row{display:grid; grid-template-columns:1fr 1fr; gap:10px}
.stat{display:flex; flex-direction:column; align-items:center; gap:2px; padding:16px 12px}
.stat__num{font-size:26px; font-weight:800; color:var(--green-700); line-height:1.2}

.next-book{display:flex; align-items:center; gap:12px; padding:15px 18px; margin-top:10px}
.next-book__date{
  flex:none; text-align:center; background:var(--green-100); border-radius:12px;
  padding:8px 12px; color:var(--green-700); font-weight:800; line-height:1.2;
}
.next-book__date small{display:block; font-size:11px; font-weight:600; color:var(--ink-muted)}

.disclaimer{
  margin:26px 0 8px; padding:13px 15px; border-radius:var(--radius);
  background:var(--green-100); color:var(--green-700); font-size:12.5px; line-height:1.6;
}
```

- [ ] **Step 2: `renderHome` 구현**

`/* == VIEWS == */` 구획의 `renderHome` 임시 구현을 아래로 **교체**한다.

```js
function renderHome(root){
  const today = ymd(new Date());
  const todayMood = Moods.get(today);
  const todayM = todayMood && MOOD_BY_KEY[todayMood.mood];   // 알 수 없는 키여도 화면이 죽지 않게
  const thisMonth = today.slice(0, 7);
  const monthCount = Object.keys(Moods.all()).filter(d => d.startsWith(thisMonth)).length;
  const upcoming = Bookings.all()
    .filter(b => b.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  const menu = [
    ['#/chat',     '💬', '간편 상담',  '고민을 적으면 함께 정리해 드려요'],
    ['#/booking',  '📝', '상담 신청',  '위클래스 상담을 앱에서 바로 예약해요'],
    ['#/calendar', '📅', '감정달력',   '오늘의 마음을 기록하고 돌아봐요'],
  ];

  root.innerHTML = `
    <section class="hero">
      ${fx.AURORA}
      <div class="hero__inner">
        <svg class="hero__logo" aria-hidden="true"><use href="#logo-clover"/></svg>
        <h2 class="hero__title shiny">마음을 토닥이고,<br>도움을 더하다</h2>
        <p class="hero__sub" id="heroSub">혼자 담아두지 않아도 괜찮아요. 여기서 먼저 이야기해 봐요.</p>
      </div>
    </section>

    <div class="menu">
      ${menu.map(([href, ico, title, desc]) => `
        <a class="card card--tap card--spot menu__item" href="${href}"
           data-reveal data-tilt data-spark>
          <span class="menu__ico" aria-hidden="true">${ico}</span>
          <span class="menu__body"><b>${title}</b><span class="muted">${desc}</span></span>
          <span class="menu__arrow" aria-hidden="true">→</span>
        </a>`).join('')}
    </div>

    <h3 class="section-title">나의 기록</h3>
    <div class="stat-row">
      <div class="card stat" data-reveal>
        <b class="stat__num" id="statMonth">0</b>
        <span class="muted">이번 달 기록한 날</span>
      </div>
      <div class="card stat" data-reveal>
        <b class="stat__num">${todayM ? todayM.emoji : '—'}</b>
        <span class="muted">${todayM ? '오늘 ' + todayM.label : '오늘 기록 없음'}</span>
      </div>
    </div>

    ${upcoming ? `
      <h3 class="section-title">다가오는 상담</h3>
      <a class="card card--tap next-book glare" href="#/booking" data-reveal>
        <span class="next-book__date">
          ${Number(upcoming.date.slice(5,7))}/${Number(upcoming.date.slice(8,10))}
          <small>${esc(upcoming.slot.split(' ')[0])}</small>
        </span>
        <span class="menu__body"><b>위클래스 상담 예약됨</b>
          <span class="muted">신청번호 ${esc(upcoming.id)}</span></span>
        <span class="menu__arrow" aria-hidden="true">→</span>
      </a>` : ''}

    <p class="disclaimer">
      토닥+의 간편 상담은 전문 심리상담을 대신하지 않아요.
      마음이 많이 힘들 때는 위클래스 선생님이나 믿을 수 있는 어른에게 꼭 이야기해 주세요.
    </p>
  `;

  fx.countUp(document.getElementById('statMonth'), monthCount);
  fx.revealWords(document.getElementById('heroSub'));
}
```

- [ ] **Step 3: 수동 검증**

새로고침 후 `#/home`에서 확인한다.

- 히어로 카드 뒤로 **초록 덩어리가 아주 느리게 떠다닌다**.
- 「마음을 토닥이고, 도움을 더하다」에 **은은한 광택이 좌→우로 지나간다**.
- 부제가 **단어 단위로 흐림이 풀리며** 나타난다.
- 메뉴 카드 3개가 **위에서 순서대로 55ms 간격으로** 등장한다.
- 카드에 마우스를 올리면 **커서를 따라 초록 스포트라이트**가 생기고 **살짝 기울어진다**. 카드를 누르면 **초록 불꽃**이 튄다.
- 「이번 달 기록한 날」 숫자가 0에서 실제 값까지 **올라간다**. 기록이 없으면 `0`이 그대로 보인다.
- 콘솔에서 `Moods.set(ymd(new Date()),'good','테스트')` 실행 후 새로고침 → 「오늘의 감정」에 🙂 괜찮음이 뜬다. 확인 후 `Moods.remove(ymd(new Date()))`로 정리한다.

- [ ] **Step 4: 커밋**

```bash
git add index.html && git commit -m "feat: HOME 화면 - 오로라 히어로, 진입 메뉴 카드, 기록 요약"
```

---

### Task 6: 간편 상담 규칙 엔진 (TDD)

**Files:**
- Modify: `index.html` — `/* == DATA: 상수 == */`, `/* == LOGIC == */`, `/* == SELFTEST == */`

- [ ] **Step 1: 실패하는 테스트를 먼저 작성**

`selfTest()` 안, `console.log('\n' + log.join('\n') + '\n');` **바로 위**에 추가한다.

```js
  // --- pickAdvice
  ok('학업 고민 분류',   pickAdvice('요즘 시험 성적이 너무 안 나와서 공부가 손에 안 잡혀요').id, 'study');
  ok('친구 고민 분류',   pickAdvice('친구랑 크게 싸웠는데 먼저 말 걸기가 무서워요').id, 'friend');
  ok('가족 고민 분류',   pickAdvice('엄마가 자꾸 잔소리해서 집에 있기 싫어요').id, 'family');
  ok('진로 고민 분류',   pickAdvice('어떤 전공을 골라야 할지 진로가 막막해요').id, 'career');
  ok('불안 분류',        pickAdvice('발표만 하면 심장이 두근거리고 너무 긴장돼요').id, 'anxiety');
  ok('무입력은 기본 응답', pickAdvice('').id, 'default');
  ok('무관한 말도 기본 응답', pickAdvice('오늘 점심 맛있었다').id, 'default');
  ok('키워드 많은 쪽이 이김',
     pickAdvice('성적이랑 시험 때문에 진로가 걱정이에요').id, 'study');
  ok('위기 키워드가 최우선',
     pickAdvice('성적 때문에 그냥 죽고 싶어요').id, 'crisis');
  ok('위기 응답은 상담 연결 강제', pickAdvice('자해하고 싶어요').urgent, true);
  ok('일반 응답은 긴급 아님', pickAdvice('공부가 힘들어요').urgent, undefined);
```

- [ ] **Step 2: 실패 확인**

콘솔에서 `selfTest()` → `ReferenceError: pickAdvice is not defined`.

- [ ] **Step 3: 규칙 데이터 작성**

`/* == DATA: 상수 == */` 구획, `MOOD_BY_KEY` 아래에 넣는다.

```js
/* 공백을 제거한 문자열과 대조하므로 모두 붙여 쓴 형태로만 적는다.
   위기 응답은 부드럽고 덧붙이는 성격이라, 놓치는 것보다 넓게 잡는 편이 낫다. */
const CRISIS_WORDS = [
  '자해','자살','유서','자살충동','자해충동',
  '죽고싶','죽고파','죽어버','죽을래','죽자','죽어야',
  '살기싫','살고싶지않','살아있고싶지않',
  '사라지고싶','없어지고싶','없어지면편','없어지는게',
  '뛰어내리','목을매','목매달','손목을긋','손목긋','손목을그','손목그',
  '극단적인생각','극단적선택',
  '다끝내고싶','끝내버리고싶','끝내고싶',
  '살아서뭐하나','사는게의미가없','살아있는게의미가없','사는의미가없',
];

const CRISIS_RULE = {
  id:'crisis', label:'지금 바로 도움받기', urgent:true, suggest:true,
  reflect:'지금 많이 힘든 마음이 느껴져요. 그 이야기를 여기에 적어준 것만으로도 큰 용기예요.',
  advice:'이건 혼자 견딜 일이 아니에요. 지금 바로 도움을 받을 수 있는 곳이 있어요.',
  tips:[
    '지금 곁에 있는 어른(담임 선생님, 위클래스 선생님, 보호자)에게 바로 말하기',
    '자살예방 상담전화 109 — 24시간, 무료, 익명으로 통화할 수 있어요',
    '청소년 상담전화 1388 — 전화·문자·카카오톡 모두 가능해요',
  ],
};

const DEFAULT_RULE = {
  id:'default', label:'마음 정리하기', suggest:true,
  reflect:'이야기해 줘서 고마워요. 무엇 때문에 힘든지 아직 또렷하지 않아도 괜찮아요.',
  advice:'마음이 복잡할 때는 이름을 붙여보는 것만으로도 조금 정리가 돼요.',
  tips:[
    '지금 기분을 한 단어로 표현한다면 뭘까 생각해 보기',
    '이 마음이 언제부터 시작됐는지 떠올려 보기',
    '오늘 감정달력에 지금 기분을 기록해 두기',
  ],
};

/* 배열 순서 = 우선순위. 키워드 개수가 같으면 앞쪽 규칙이 이긴다. */
const RULES = [
  { id:'study', label:'학업·성적',
    keywords:['성적','공부','시험','수행평가','수행','학원','등급','내신','숙제','과제','집중','등수','점수'],
    reflect:'성적과 공부 때문에 마음이 무거웠군요. 잘하고 싶은 마음이 클수록 더 아프게 느껴져요.',
    advice:'성적은 나를 설명하는 여러 가지 중 하나일 뿐이에요. 지금은 결과보다 방법을 조금 바꿔볼 때예요.',
    tips:['오늘 하루 안에서 내가 실제로 해낸 것 한 가지를 적어 보기',
          '목표를 "이번 시험 전체"가 아니라 "오늘 30분, 한 단원"으로 잘게 쪼개 보기',
          '성적과 상관없이 내가 나를 괜찮게 느꼈던 순간 떠올려 보기'],
    suggest:true },

  { id:'friend', label:'친구 관계',
    keywords:['친구','왕따','따돌림','싸웠','싸움','오해','뒷담','무리','단톡','눈치','소외','절교','괴롭'],
    reflect:'친구 사이의 일은 겉으로는 사소해 보여도 마음에는 오래 남아요. 많이 신경 쓰였겠어요.',
    advice:'관계의 문제는 대부분 "누가 잘못했나"보다 "내가 뭘 원하는가"를 먼저 정하면 실마리가 보여요.',
    tips:['그 친구에게 바라는 게 사과인지, 설명인지, 거리두기인지 하나만 골라 보기',
          '하고 싶은 말을 "너는~" 대신 "나는 ~해서 속상했어"로 바꿔서 적어 보기',
          '지금 관계가 나를 계속 깎아내린다면, 거리를 두는 것도 선택지라는 걸 기억하기'],
    suggest:true },

  { id:'family', label:'가족',
    keywords:['부모','엄마','아빠','가족','집에서','형','누나','오빠','언니','동생','잔소리','기대','비교','집안'],
    reflect:'집은 쉬는 곳이어야 하는데, 거기서 힘들면 마음 둘 곳이 없죠. 많이 지쳤겠어요.',
    advice:'가족 문제는 내가 바꿀 수 있는 부분과 그렇지 않은 부분을 나누는 데서 시작해요.',
    tips:['지금 상황에서 내가 바꿀 수 있는 것과 없는 것을 각각 하나씩 적어 보기',
          '집에서 잠깐이라도 혼자 안전하게 있을 수 있는 시간·장소 만들어 두기',
          '말로 꺼내기 어렵다면, 하고 싶은 말을 메모로 먼저 정리해 보기'],
    suggest:true },

  { id:'career', label:'진로·미래',
    keywords:['진로','대학','전공','꿈','미래','졸업','직업','취업','문과','이과','원서','수시','정시'],
    reflect:'앞으로의 길이 잘 안 보일 때는 조급해지기 쉬워요. 그 막막함은 이상한 게 아니에요.',
    advice:'진로는 한 번에 정하는 답이 아니라 여러 번 고쳐 쓰는 초안에 가까워요.',
    tips:['좋아하는 일과 잘하는 일을 각각 세 가지씩 적고 겹치는 게 있는지 보기',
          '"어떤 직업"보다 "어떤 하루를 살고 싶은지"부터 떠올려 보기',
          '관심 있는 분야를 이번 달 안에 30분만 찾아보기로 정해 두기'],
    suggest:true },

  { id:'anxiety', label:'불안·긴장',
    keywords:['불안','걱정','긴장','초조','두근','떨려','발표','잠이 안','불면','숨이','답답','조마조마','실수할'],
    reflect:'몸이 먼저 반응할 만큼 긴장하고 있었군요. 그만큼 잘 해내고 싶었던 거예요.',
    advice:'불안은 없애는 것보다 크기를 줄이는 게 현실적인 목표예요.',
    tips:['4초 들이쉬고 6초 내쉬기를 다섯 번 — 내쉬는 숨을 더 길게',
          '걱정을 "지금 내가 할 수 있는 일"과 "아직 일어나지 않은 일"로 나눠 적기',
          '최악의 상황을 적고, 실제로 그렇게 될 확률을 숫자로 매겨 보기'],
    suggest:true },

  { id:'depress', label:'우울·무기력',
    keywords:['우울','무기력','슬프','슬퍼','눈물','의욕','지치','재미없','공허','아무것도','귀찮','혼자'],
    reflect:'아무것도 하고 싶지 않은 상태가 이어지면 스스로를 탓하기 쉬운데, 그건 게으른 게 아니라 지쳐 있다는 신호예요.',
    advice:'이럴 때는 크게 회복하려 하기보다 아주 작은 것 하나만 움직여 보는 게 나아요.',
    tips:['오늘은 딱 한 가지만 — 물 마시기, 창문 열기 중 하나만 해 보기',
          '10분만 밖에 나가 햇빛을 쬐어 보기',
          '이 상태가 2주 넘게 이어진다면 꼭 위클래스 상담을 신청하기'],
    suggest:true },

  { id:'selfesteem', label:'자존감',
    /* '살'은 살다·살고·살아를 전부 삼켜 위기 표현을 가로채므로 쓰지 않는다 */
    keywords:['외모','살쪘','살찐','살 빼','다이어트','뚱뚱','못생','자존감','자신감',
              '비교','부족한','한심','쓸모','못하는'],
    reflect:'스스로를 계속 깎아내리는 생각은 사실보다 훨씬 크게 들려요. 그 목소리에 많이 시달렸겠어요.',
    advice:'나에 대한 평가를 남의 기준에서 잠깐 떼어놓는 연습이 필요해요.',
    tips:['오늘 나에게 했던 말을 친구가 들었다면 뭐라고 했을지 생각해 보기',
          '잘하지 못한 일 말고, 그냥 해낸 일 세 가지 적어 보기',
          '비교하게 되는 SNS를 하루만 쉬어 보기'],
    suggest:true },
];
```

- [ ] **Step 4: 매칭 함수 구현**

`/* == LOGIC == */` 구획에 넣는다.

```js
function pickAdvice(text){
  const t = String(text || '');
  const flat = t.replace(/\s/g, '');          // '죽고 싶다'와 '죽고싶다'를 같게 본다
  if (CRISIS_WORDS.some(w => flat.includes(w))) return CRISIS_RULE;
  let best = null, bestScore = 0;
  for (const rule of RULES){
    const score = rule.keywords.reduce((n, k) => n + (t.includes(k) ? 1 : 0), 0);
    if (score > bestScore){ bestScore = score; best = rule; }
  }
  return best || DEFAULT_RULE;
}
```

`>` 비교(≥가 아님)라서 **동점이면 배열 앞쪽 규칙이 이긴다.** 이것이 `RULES` 순서를 우선순위로 만드는 장치다.

- [ ] **Step 5: 테스트 통과 확인**

새로고침 후 콘솔에서 `selfTest()` → `전체 21건 통과`.

한 건이라도 실패하면 해당 규칙의 `keywords`에 테스트 문장의 단어가 실제로 들어 있는지 확인한다. 예: 「키워드 많은 쪽이 이김」이 실패하면 `study`가 2개(`성적`,`시험`), `career`가 1개(`진로`)를 맞히는지 세어 본다.

- [ ] **Step 6: 커밋**

```bash
git add index.html && git commit -m "feat: 간편 상담 규칙 엔진 - 7개 고민 분류와 위기 키워드 최우선 처리"
```

---

### Task 7: 간편 상담 화면

**Files:**
- Modify: `index.html` — `/* == CHAT == */` CSS 구획, `/* == VIEWS == */` 의 `renderChat`

- [ ] **Step 1: CHAT CSS 작성**

```css
.chat__greet{display:flex; gap:12px; align-items:flex-start; margin-bottom:16px}
.chat__avatar{
  flex:none; width:38px; height:38px; border-radius:50%; background:var(--green-100);
  display:grid; place-items:center; color:var(--green-500);
}
.chat__avatar svg{width:22px; height:22px}
.chat__bubble{font-size:14.5px; line-height:1.65; min-height:1.6em; flex:1}

.chat__examples{margin:12px 0 18px}
.chat__send{margin-top:14px}

.result{display:grid; gap:12px; margin-bottom:18px}
.result__tag{
  display:inline-block; padding:5px 12px; border-radius:var(--radius-pill);
  background:var(--green-100); color:var(--green-700); font-size:12px; font-weight:800;
}
.result__reflect{font-size:17px; font-weight:700; line-height:1.55; letter-spacing:-.02em; margin-top:10px}
.result__advice{font-size:14.5px; color:var(--ink-muted); line-height:1.7; margin-top:8px; min-height:1.7em}
.tip{display:flex; gap:11px; align-items:flex-start; padding:14px 16px}
.tip__no{
  flex:none; width:23px; height:23px; border-radius:50%; background:var(--green-500); color:#fff;
  display:grid; place-items:center; font-size:12px; font-weight:800;
}
.tip__text{font-size:14px; line-height:1.6}

.result--urgent{border-color:#EFC9BE; background:var(--danger-bg)}
.result--urgent .result__tag{background:#F6DCD4; color:var(--danger)}
.result--urgent .tip__no{background:var(--danger)}
.result--urgent .result__reflect{color:var(--danger)}

.chat__actions{display:grid; gap:9px; margin-top:6px}
```

- [ ] **Step 2: `renderChat` 구현**

`renderChat` 임시 구현을 아래로 **교체**한다. `/* == VIEWS == */` 구획 안이면 위치는 자유다.

```js
let chatState = { text:'', result:null };

const CHAT_EXAMPLES = [
  '시험이 다가와서 불안해요',
  '친구랑 사이가 어색해졌어요',
  '집에 있는 게 힘들어요',
  '요즘 아무 의욕이 없어요',
];

function renderChat(root){
  if (chatState.result) renderChatResult(root);
  else renderChatInput(root);
}

function renderChatInput(root){
  root.innerHTML = `
    <div class="card chat__greet" data-reveal>
      <span class="chat__avatar" aria-hidden="true"><svg><use href="#logo-clover"/></svg></span>
      <p class="chat__bubble" id="greet"></p>
    </div>

    <div data-reveal>
      <label class="label" for="worry">지금 마음에 걸리는 일</label>
      <div class="field">
        <textarea id="worry" rows="5"
          placeholder="편하게 적어도 괜찮아요. 문장이 정리되지 않아도 돼요."
          maxlength="500">${esc(chatState.text)}</textarea>
      </div>
      <div class="chip-row chat__examples">
        ${CHAT_EXAMPLES.map(e =>
          `<button class="chip" data-example="${esc(e)}">${esc(e)}</button>`).join('')}
      </div>
      <button class="btn btn--primary btn--block" id="send" data-spark>이야기 나누기</button>
    </div>

    <p class="disclaimer">
      여기서 나눈 이야기는 이 기기에만 남고 어디에도 전송되지 않아요.
      간편 상담은 전문 심리상담을 대신하지 않아요.
    </p>
  `;

  fx.typeText(document.getElementById('greet'),
    '안녕하세요. 무슨 일이 있었는지 편하게 적어 주세요. 정답을 말하지 않아도 괜찮아요.');

  const ta = document.getElementById('worry');
  root.querySelectorAll('[data-example]').forEach(btn => {
    btn.addEventListener('click', () => {
      ta.value = btn.dataset.example;
      ta.focus();
    });
  });

  document.getElementById('send').addEventListener('click', () => {
    const text = ta.value.trim();
    if (!text){ ta.focus(); return; }
    chatState = { text, result: pickAdvice(text) };
    rerender(root, renderChat);
  });
}

function renderChatResult(root){
  const r = chatState.result;
  const urgent = !!r.urgent;

  root.innerHTML = `
    <div class="result">
      <div class="card ${urgent ? 'result--urgent' : ''}" ${urgent ? '' : 'data-reveal'}>
        <span class="result__tag">${esc(r.label)}</span>
        <p class="result__reflect" id="reflect">${esc(r.reflect)}</p>
        <p class="result__advice" id="advice">${urgent ? esc(r.advice) : ''}</p>
      </div>
      ${r.tips.map((t, i) => `
        <div class="card tip ${urgent ? 'result--urgent' : ''}" ${urgent ? '' : 'data-reveal'}>
          <span class="tip__no" aria-hidden="true">${i + 1}</span>
          <span class="tip__text">${esc(t)}</span>
        </div>`).join('')}
    </div>

    <div class="chat__actions">
      <a class="btn btn--primary btn--block" href="#/booking" data-spark>
        ${urgent ? '지금 위클래스 상담 신청하기' : '위클래스 상담 신청하기'}
      </a>
      <a class="btn btn--ghost btn--block" href="#/calendar">오늘 감정 기록하기</a>
      <button class="btn btn--ghost btn--block" id="again">다시 이야기하기</button>
    </div>

    <p class="disclaimer">
      ${urgent
        ? '지금 많이 힘들다면 혼자 견디지 마세요. 자살예방 상담전화 <b><a href="tel:109">109</a></b>, 청소년 상담전화 <b><a href="tel:1388">1388</a></b>은 24시간 열려 있어요.'
        : '토닥+의 간편 상담은 전문 심리상담을 대신하지 않아요. 더 이야기하고 싶다면 위클래스 상담을 신청해 보세요.'}
    </p>
  `;

  if (!urgent){
    fx.revealWords(document.getElementById('reflect'));
    fx.typeText(document.getElementById('advice'), r.advice, { speed: 18 });
  }
  // urgent일 때는 어떤 연출도 하지 않는다 — 전부 즉시 보인다 (§5.5)

  document.getElementById('again').addEventListener('click', () => {
    chatState = { text: chatState.text, result: null };
    rerender(root, renderChat);
  });
}
```

- [ ] **Step 3: 수동 검증**

`#/chat`에서 확인한다.

| 입력 | 기대 결과 |
|---|---|
| (빈칸) + 버튼 | 아무 일도 일어나지 않고 입력창에 포커스가 간다 |
| `시험 성적 때문에 힘들어요` | 태그 **학업·성적**, 공감 문장이 단어별로 흐림 해제, 조언이 타이핑, 팁 3개가 순차 등장 |
| `친구랑 싸웠어요` | 태그 **친구 관계** |
| 예시 칩 클릭 | 텍스트가 입력창에 채워지고 포커스가 간다 |
| `죽고 싶어요` | 카드가 **붉은 톤(`result--urgent`)**, **모든 텍스트가 즉시 전부 표시**(타이핑·흐림 해제 없음), 109·1388 안내가 보인다 |
| 「다시 이야기하기」 | 입력 화면으로 돌아가고 **직전에 쓴 글이 그대로 남아 있다** |

**중요:** 위기 응답에서 타이핑 연출이 보이면 실패다. 급한 정보를 지연시키는 연출이기 때문이다.

`<b>` 태그가 `disclaimer` 안에서 글자 그대로 보이면, 해당 문자열에 `esc()`를 적용하지 않았는지 확인한다 (이 문자열은 고정 리터럴이므로 `esc` 대상이 아니다).

- [ ] **Step 4: 커밋**

```bash
git add index.html && git commit -m "feat: 간편 상담 화면 - 타이핑 응답, 팁 카드, 위기 상황 즉시 안내"
```

---

### Task 8: 상담 신청 로직 (TDD)

**Files:**
- Modify: `index.html` — `/* == DATA: 상수 == */`, `/* == LOGIC == */`, `/* == SELFTEST == */`

- [ ] **Step 1: 실패하는 테스트를 먼저 작성**

`selfTest()`의 `console.log(...)` 위에 추가한다.

```js
  // --- availableDates (2026-08-30은 일요일)
  const D = availableDates(new Date(2026, 7, 30), 14);
  ok('평일 10일만 반환', D.length, 10);
  ok('당일은 제외하고 다음날부터', D[0], '2026-08-31');
  ok('마지막 날짜', D[D.length - 1], '2026-09-11');
  ok('주말이 하나도 없다',
     D.filter(s => [0,6].includes(parseYmd(s).getDay())).length, 0);
  ok('당일 미포함', D.includes('2026-08-30'), false);

  // --- formatKDate
  ok('한국식 날짜 표기', formatKDate('2026-09-02'), '9월 2일 (수)');
  ok('한 자리 월 표기',  formatKDate('2026-01-05'), '1월 5일 (월)');
```

- [ ] **Step 2: 실패 확인**

콘솔에서 `selfTest()` → `ReferenceError: availableDates is not defined`.

- [ ] **Step 3: 상수와 함수 구현**

`/* == DATA: 상수 == */` 에 추가:

```js
const SLOTS = ['12:40 점심시간', '15:30 방과후', '16:30 방과후'];
const TOPICS = ['학업·성적','친구 관계','가족','진로·미래','불안·긴장','우울·무기력','기타'];
const WEEK_KO = ['일','월','화','수','목','금','토'];
```

`/* == LOGIC == */` 에 추가:

```js
/* 내일부터 days일 안의 평일만 반환한다 (당일 신청 불가) */
function availableDates(from = new Date(), days = 14){
  const out = [];
  for (let i = 1; i <= days; i++){
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;
    out.push(ymd(d));
  }
  return out;
}

function formatKDate(s){
  const d = parseYmd(s);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEK_KO[d.getDay()]})`;
}
```

`new Date(y, m, d + i)`는 월·연 넘김을 자동으로 처리한다. 직접 계산하지 말 것.

- [ ] **Step 4: 테스트 통과 확인**

`selfTest()` → `전체 28건 통과`.

「한 자리 월 표기」가 실패하면 `2026-01-05`의 요일을 직접 확인한다 (2026년 1월 5일은 월요일).

- [ ] **Step 5: 커밋**

```bash
git add index.html && git commit -m "feat: 상담 가능 날짜 생성과 한국식 날짜 표기"
```

---

### Task 9: 상담 신청 화면 (3단계)

**Files:**
- Modify: `index.html` — `/* == BOOKING == */` CSS 구획, `/* == VIEWS == */` 의 `renderBooking`

- [ ] **Step 1: BOOKING CSS 작성**

```css
.book__dates{display:grid; grid-template-columns:repeat(auto-fill,minmax(80px,1fr)); gap:8px}
.date-chip{
  display:flex; flex-direction:column; align-items:center; gap:1px;
  padding:11px 4px; border-radius:var(--radius);
  background:var(--white); border:1.5px solid var(--line);
  font-size:15px; font-weight:800; color:var(--ink);
  transition:transform var(--dur-base) var(--ease-spring),
             border-color var(--dur-fast) var(--ease-out),
             background-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}
.date-chip small{font-size:11px; font-weight:600; color:var(--ink-muted)}
.date-chip:hover:not(:disabled){border-color:var(--green-300)}
.date-chip.is-on{background:var(--green-500); border-color:var(--green-500); color:#fff}
.date-chip.is-on small{color:rgba(255,255,255,.85)}
.date-chip:disabled{opacity:.4; cursor:not-allowed}

.form-row{display:grid; grid-template-columns:1fr 1fr 1.4fr; gap:9px}
.form-group{margin-bottom:16px}

.done{text-align:center; padding:32px 22px}
.done__check{
  width:64px; height:64px; border-radius:50%; background:var(--green-100); color:var(--green-500);
  display:grid; place-items:center; margin:0 auto 16px; font-size:30px;
}
.done__id{
  font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
  font-size:20px; font-weight:800; color:var(--green-700);
  letter-spacing:.08em; margin:8px 0 4px;
}
.done__meta{
  display:inline-flex; gap:8px; align-items:center; margin-top:14px; padding:10px 16px;
  background:var(--green-100); border-radius:var(--radius); color:var(--green-700);
  font-size:14px; font-weight:700;
}

.mine{display:grid; gap:9px}
.mine__item{display:flex; align-items:center; gap:12px; padding:14px 16px}
.mine__cancel{
  flex:none; font-size:12px; font-weight:700; color:var(--ink-muted);
  padding:6px 11px; border-radius:var(--radius-pill); border:1px solid var(--line);
  transition:color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);
}
.mine__cancel:hover{color:var(--danger); border-color:#EFC9BE}
```

- [ ] **Step 2: `renderBooking` 구현**

`renderBooking` 임시 구현을 아래로 **교체**한다.

```js
let bookState = { step:1, date:null, slot:null, done:null };

function stepperHTML(step){
  const names = ['날짜 선택','정보 입력','신청 완료'];
  return `<div class="stepper" role="progressbar"
            aria-valuemin="1" aria-valuemax="3" aria-valuenow="${step}">
    ${[1,2,3].map(i => `<span class="stepper__dot ${i <= step ? 'is-done' : ''}"></span>`).join('')}
    <span class="stepper__label">${step}/3 ${names[step - 1]}</span>
  </div>`;
}

function renderBooking(root){
  if (bookState.done)      return renderBookingDone(root);
  if (bookState.step === 2) return renderBookingForm(root);
  return renderBookingPick(root);
}

/* --- 1단계: 날짜 · 시간 선택 --- */
function renderBookingPick(root){
  const dates = availableDates();
  const taken = Bookings.taken();
  const mine  = Bookings.all().sort((a, b) => a.date.localeCompare(b.date));

  root.innerHTML = `
    ${stepperHTML(1)}
    <h2 class="hero__title" style="font-size:21px" data-reveal>언제 상담받고 싶나요?</h2>
    <p class="muted" style="margin-top:6px" data-reveal>
      위클래스 상담이 가능한 평일이에요. 신청은 다음 날짜부터 할 수 있어요.
    </p>

    <div class="book__dates" id="dates" style="margin-top:14px">
      ${dates.map(d => {
        const full = SLOTS.every(s => taken.has(d + '|' + s));
        return `<button class="date-chip ${bookState.date === d ? 'is-on' : ''}"
                  data-date="${d}" ${full ? 'disabled' : ''} data-magnet>
          ${Number(d.slice(5,7))}/${Number(d.slice(8,10))}
          <small>${WEEK_KO[parseYmd(d).getDay()]}${full ? ' 마감' : ''}</small>
        </button>`;
      }).join('')}
    </div>

    <div id="slotBox" style="margin-top:20px"></div>

    <button class="btn btn--primary btn--block" id="toStep2"
            style="margin-top:22px" disabled data-spark>다음</button>

    ${mine.length ? `
      <h3 class="section-title">내 신청 내역</h3>
      <div class="mine">
        ${mine.map(b => `
          <div class="card mine__item" data-reveal>
            <span class="next-book__date">
              ${Number(b.date.slice(5,7))}/${Number(b.date.slice(8,10))}
              <small>${esc(b.slot.split(' ')[0])}</small>
            </span>
            <span class="menu__body">
              <b>${esc(b.id)}</b>
              <span class="muted">${esc(b.topics.join(', ') || '주제 미선택')}</span>
            </span>
            <button class="mine__cancel" data-cancel="${esc(b.id)}">취소</button>
          </div>`).join('')}
      </div>
      <p class="disclaimer">
        신청 내역은 이 기기에만 저장돼요. 실제 위클래스 선생님께 전송되는 프로그램이 아니에요.
      </p>` : ''}
  `;

  const slotBox = document.getElementById('slotBox');
  const nextBtn = document.getElementById('toStep2');

  function drawSlots(){
    if (!bookState.date){ slotBox.innerHTML = ''; nextBtn.disabled = true; return; }
    slotBox.innerHTML = `
      <label class="label">${formatKDate(bookState.date)} 상담 시간</label>
      <div class="chip-row">
        ${SLOTS.map(s => {
          const isTaken = taken.has(bookState.date + '|' + s);
          return `<button class="chip ${bookState.slot === s ? 'is-on' : ''}"
                    data-slot="${esc(s)}" ${isTaken ? 'disabled' : ''}>${esc(s)}</button>`;
        }).join('')}
      </div>`;
    nextBtn.disabled = !bookState.slot;
    fx.reveal(slotBox, '.chip', { y: 8, dur: 380, stagger: 45 });
  }
  drawSlots();   // slotBox 요소 자체는 교체되지 않으므로 아래 위임 리스너가 계속 유효하다

  // 위임 리스너는 매 렌더마다 새로 만들어지는 컨테이너에 붙인다.
  // root에 붙이면 재렌더할 때마다 리스너가 누적되어 confirm이 두 번 뜬다.
  document.getElementById('dates').addEventListener('click', e => {
    const dateBtn = e.target.closest('[data-date]');
    if (!dateBtn || dateBtn.disabled) return;
    bookState.date = dateBtn.dataset.date;
    bookState.slot = null;
    root.querySelectorAll('[data-date]').forEach(b =>
      b.classList.toggle('is-on', b === dateBtn));
    drawSlots();
  });

  slotBox.addEventListener('click', e => {
    const slotBtn = e.target.closest('[data-slot]');
    if (!slotBtn || slotBtn.disabled) return;
    bookState.slot = slotBtn.dataset.slot;
    slotBox.querySelectorAll('[data-slot]').forEach(b =>
      b.classList.toggle('is-on', b === slotBtn));
    nextBtn.disabled = false;
  });

  const mineBox = root.querySelector('.mine');
  if (mineBox) mineBox.addEventListener('click', e => {
    const cancelBtn = e.target.closest('[data-cancel]');
    if (!cancelBtn) return;
    if (!confirm('이 상담 신청을 취소할까요?')) return;
    Bookings.cancel(cancelBtn.dataset.cancel);
    rerender(root, renderBooking);
  });

  nextBtn.addEventListener('click', () => {
    if (!bookState.date || !bookState.slot) return;
    bookState.step = 2;
    rerender(root, renderBooking);
  });
}

/* --- 2단계: 신청 정보 입력 --- */
function renderBookingForm(root){
  root.innerHTML = `
    ${stepperHTML(2)}
    <h2 class="hero__title" style="font-size:21px" data-reveal>신청 정보를 알려 주세요</h2>
    <div class="card" style="margin:14px 0" data-reveal>
      <b>${formatKDate(bookState.date)} · ${esc(bookState.slot)}</b>
    </div>

    <div class="form-group" data-reveal>
      <label class="label">학년 · 반 · 이름</label>
      <div class="form-row">
        <div class="field"><input id="grade" inputmode="numeric" placeholder="학년" maxlength="1"></div>
        <div class="field"><input id="classNo" inputmode="numeric" placeholder="반" maxlength="2"></div>
        <div class="field"><input id="name" placeholder="이름" maxlength="10"></div>
      </div>
    </div>

    <div class="form-group" data-reveal>
      <label class="label">어떤 이야기를 나누고 싶나요? (여러 개 선택 가능)</label>
      <div class="chip-row" id="topics">
        ${TOPICS.map(t => `<button class="chip" data-topic="${esc(t)}">${esc(t)}</button>`).join('')}
      </div>
    </div>

    <div class="form-group" data-reveal>
      <label class="label" for="msg">선생님께 미리 하고 싶은 말 (선택)</label>
      <div class="field">
        <textarea id="msg" rows="4" maxlength="300"
          placeholder="적어두면 상담이 더 편해져요. 비워 두어도 괜찮아요.">${esc(chatState.text)}</textarea>
      </div>
    </div>

    <button class="btn btn--primary btn--block" id="submit" data-spark>신청 완료하기</button>
    <button class="btn btn--ghost btn--block" id="back" style="margin-top:9px">이전으로</button>
  `;

  const picked = new Set();
  root.querySelectorAll('[data-topic]').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = btn.dataset.topic;
      picked.has(t) ? picked.delete(t) : picked.add(t);
      btn.classList.toggle('is-on', picked.has(t));
    });
  });

  document.getElementById('back').addEventListener('click', () => {
    bookState.step = 1;
    rerender(root, renderBooking);
  });

  document.getElementById('submit').addEventListener('click', () => {
    const grade   = document.getElementById('grade').value.trim();
    const classNo = document.getElementById('classNo').value.trim();
    const name    = document.getElementById('name').value.trim();
    if (!grade || !classNo || !name){
      alert('학년, 반, 이름을 모두 입력해 주세요.');
      return;
    }
    bookState.done = Bookings.add({
      date: bookState.date, slot: bookState.slot,
      grade, classNo, name,
      topics: [...picked],
      message: document.getElementById('msg').value.trim(),
    });
    bookState.step = 3;
    rerender(root, renderBooking);
  });
}

/* --- 3단계: 완료 --- */
function renderBookingDone(root){
  const b = bookState.done;
  root.innerHTML = `
    ${stepperHTML(3)}
    <div class="card card--star done">
      <div class="done__check" aria-hidden="true">🍀</div>
      <h2 style="font-size:20px">상담 신청이 접수됐어요</h2>
      <p class="done__id" id="doneId">${' '.repeat(12)}</p>
      <p class="muted">신청번호</p>
      <div class="done__meta">${formatKDate(b.date)} · ${esc(b.slot)}</div>
    </div>

    <p class="disclaimer" style="margin-top:18px">
      이 신청은 <b>이 기기에만 저장</b>돼요. 실제 위클래스 선생님께 자동으로 전달되지는 않으니,
      약속한 시간에 위클래스를 방문해 주세요.
    </p>

    <a class="btn btn--primary btn--block" href="#/calendar" style="margin-top:6px" data-spark>
      오늘 감정 기록하러 가기
    </a>
    <button class="btn btn--ghost btn--block" id="newBooking" style="margin-top:9px">
      신청 내역 보기
    </button>
  `;

  fx.scrambleTo(document.getElementById('doneId'), b.id);

  document.getElementById('newBooking').addEventListener('click', () => {
    bookState = { step:1, date:null, slot:null, done:null };
    rerender(root, renderBooking);
  });
}
```

- [ ] **Step 3: 수동 검증**

`#/booking`에서 순서대로 확인한다.

1. **1단계** — 진행 막대의 첫 칸만 초록으로 차오른다. 날짜 칩은 **평일만**, **오늘 날짜는 없다**. 마우스를 올리면 칩이 커서 쪽으로 살짝 끌려간다.
2. 날짜를 고르면 아래에 시간 칩 3개가 순차 등장하고, 「다음」 버튼이 활성화된다. **시간을 고르기 전에는 비활성**이어야 한다.
3. 날짜를 다른 날로 바꾸면 시간 선택이 **초기화되고 「다음」이 다시 비활성**된다.
4. **2단계** — 학년/반/이름 중 하나라도 비우고 제출하면 경고창이 뜬다. 주제 칩은 **여러 개 동시에 켜진다**.
5. 간편 상담에서 글을 쓴 뒤 상담 신청으로 넘어오면, 「하고 싶은 말」에 **그 글이 미리 채워져 있다**.
6. **3단계** — 신청번호가 **무작위 글자에서 왼쪽부터 확정되며** `TD-…` 형태로 정리되고, 카드 테두리를 **초록 빛줄기가 돈다**.
7. 「신청 내역 보기」 → 1단계로 돌아가면 아래 **내 신청 내역**에 방금 신청이 있다. 「취소」 → 확인창 → 목록에서 사라진다.
8. 같은 날짜·시간을 다시 신청하려 하면 그 시간 칩이 **비활성(취소선)** 이고, 세 시간대가 모두 차면 날짜 칩에 **「마감」** 이 뜬다.
9. `#/home`으로 가면 **다가오는 상담** 카드가 보인다.

- [ ] **Step 4: 커밋**

```bash
git add index.html && git commit -m "feat: 상담 신청 3단계 - 날짜/시간 선택, 정보 입력, 신청번호 발급"
```

---

### Task 10: 감정달력 로직 (TDD)

**Files:**
- Modify: `index.html` — `/* == LOGIC == */`, `/* == SELFTEST == */`

- [ ] **Step 1: 실패하는 테스트를 먼저 작성**

`selfTest()`의 `console.log(...)` 위에 추가한다.

```js
  // --- buildMonth (2026-08-01은 토요일 → 앞에 빈칸 6개)
  const aug = buildMonth(2026, 8);
  ok('8월 격자는 6주(42칸)', aug.length, 42);
  ok('앞 빈칸 6개', aug.slice(0, 6), [null,null,null,null,null,null]);
  ok('첫날 위치', aug[6], '2026-08-01');
  ok('마지막 날 위치', aug[36], '2026-08-31');
  ok('뒤는 빈칸으로 채움', aug[41], null);

  // --- buildMonth 윤년 2월 (2024-02-01은 목요일 → 빈칸 4개, 29일)
  const feb = buildMonth(2024, 2);
  ok('윤년 2월은 5주(35칸)', feb.length, 35);
  ok('윤년 2월 첫날', feb[4], '2024-02-01');
  ok('윤년 2월 29일 존재', feb[32], '2024-02-29');

  // --- monthStats
  const sample = {
    '2026-08-01':{mood:'good'}, '2026-08-02':{mood:'good'},
    '2026-08-03':{mood:'hard'}, '2026-07-30':{mood:'great'},
  };
  ok('해당 월만 집계', monthStats(sample, '2026-08').total, 3);
  ok('감정별 개수',   monthStats(sample, '2026-08').counts.good, 2);
  ok('다른 달은 제외', monthStats(sample, '2026-08').counts.great, 0);
  ok('빈 저장소',     monthStats({}, '2026-08').total, 0);
```

- [ ] **Step 2: 실패 확인**

콘솔에서 `selfTest()` → `ReferenceError: buildMonth is not defined`.

- [ ] **Step 3: 구현**

`/* == LOGIC == */` 에 추가한다.

```js
/* month는 1~12. 앞뒤를 null로 채워 7의 배수 길이로 맞춘다 */
function buildMonth(year, month){
  const lead  = new Date(year, month - 1, 1).getDay();
  const total = new Date(year, month, 0).getDate();   // 다음 달 0일 = 이번 달 말일
  const cells = new Array(lead).fill(null);
  for (let d = 1; d <= total; d++) cells.push(ymd(new Date(year, month - 1, d)));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function monthStats(moodMap, prefix){
  const counts = Object.fromEntries(MOODS.map(m => [m.key, 0]));
  let total = 0;
  for (const [date, rec] of Object.entries(moodMap)){
    if (!date.startsWith(prefix) || counts[rec.mood] === undefined) continue;
    counts[rec.mood]++; total++;
  }
  return { counts, total };
}
```

`new Date(year, month, 0).getDate()`가 말일을 주므로 윤년 판정을 직접 쓸 필요가 없다.

- [ ] **Step 4: 테스트 통과 확인**

`selfTest()` → `전체 40건 통과`.

- [ ] **Step 5: 커밋**

```bash
git add index.html && git commit -m "feat: 달력 격자 생성과 월별 감정 통계"
```

---

### Task 11: 감정달력 화면

**Files:**
- Modify: `index.html` — `/* == CALENDAR == */` CSS 구획, `/* == VIEWS == */` 의 `renderCalendar`

- [ ] **Step 1: CALENDAR CSS 작성**

```css
.cal__head{display:flex; align-items:center; justify-content:space-between; margin-bottom:16px}
.cal__title{font-size:19px; font-weight:800; letter-spacing:-.03em}
.cal__nav{
  width:36px; height:36px; border-radius:50%;
  background:var(--white); border:1px solid var(--line);
  display:grid; place-items:center; color:var(--green-700); font-size:15px;
  transition:background-color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-spring);
}
.cal__nav:hover:not(:disabled){background:var(--green-100)}
.cal__nav:active:not(:disabled){transform:scale(.9)}
.cal__nav:disabled{opacity:.3; cursor:not-allowed}

.cal__dows{display:grid; grid-template-columns:repeat(7,1fr); gap:4px; margin-bottom:6px}
.cal__dow{text-align:center; font-size:11px; font-weight:700; color:var(--ink-muted); padding:3px 0}
.cal__dow:first-child{color:var(--danger)}

.cal__grid{display:grid; grid-template-columns:repeat(7,1fr); gap:4px}
.cal__cell{
  aspect-ratio:1; border-radius:12px; background:var(--white); border:1px solid var(--line);
  display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px;
  font-size:12.5px; font-weight:700; color:var(--ink);
  transition:transform var(--dur-fast) var(--ease-spring),
             border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out);
}
.cal__cell:hover:not(:disabled){border-color:var(--green-300)}
.cal__cell:active:not(:disabled){transform:scale(.92)}
.cal__cell:disabled{opacity:.3; cursor:default}
.cal__cell--blank{background:transparent; border-color:transparent; pointer-events:none}
.cal__cell--today{box-shadow:0 0 0 2px rgba(47,163,107,.22)}
.cal__cell.has-mood{background:color-mix(in srgb, var(--cell) 26%, #fff); border-color:transparent}
.cal__emoji{font-size:15px; line-height:1}

@keyframes slide-l{from{opacity:0; transform:translateX(20px)} to{opacity:1; transform:none}}
@keyframes slide-r{from{opacity:0; transform:translateX(-20px)} to{opacity:1; transform:none}}
.slide-next{animation:slide-l var(--dur-slow) var(--ease-out) both}
.slide-prev{animation:slide-r var(--dur-slow) var(--ease-out) both}

.sheet__date{font-size:16px; font-weight:800; margin-bottom:14px}
.sheet__moods{display:grid; grid-template-columns:repeat(5,1fr); gap:7px; margin-bottom:16px}
.mood-btn{
  display:flex; flex-direction:column; align-items:center; gap:5px; padding:12px 3px;
  border-radius:var(--radius); background:var(--green-50); border:1.5px solid transparent;
  font-size:10.5px; font-weight:700; color:var(--ink-muted);
  transition:transform var(--dur-base) var(--ease-spring),
             background-color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);
}
.mood-btn .e{font-size:24px; line-height:1}
.mood-btn:hover{transform:translateY(-3px)}
.mood-btn.is-on{background:var(--white); border-color:var(--pick); color:var(--ink); box-shadow:var(--shadow)}
.sheet__actions{display:grid; grid-template-columns:1fr auto; gap:9px; margin-top:14px}
```

- [ ] **Step 2: `renderCalendar`와 바텀 시트 구현**

`renderCalendar` 임시 구현을 아래로 **교체**한다.

```js
const _now = new Date();
let calState = { year:_now.getFullYear(), month:_now.getMonth() + 1, dir:'' };

function renderCalendar(root){
  const { year, month } = calState;
  const today  = ymd(new Date());
  const prefix = `${year}-${String(month).padStart(2,'0')}`;
  const cells  = buildMonth(year, month);
  const moods  = Moods.all();
  const atMaxMonth = prefix >= today.slice(0, 7);   // 다음 달 이동 제한

  root.innerHTML = `
    <div class="cal__head">
      <button class="cal__nav" id="prevM" aria-label="이전 달">‹</button>
      <span class="cal__title">${year}년 ${month}월</span>
      <button class="cal__nav" id="nextM" aria-label="다음 달" ${atMaxMonth ? 'disabled' : ''}>›</button>
    </div>

    <div id="calBody" class="${calState.dir}">
      <div class="cal__dows" aria-hidden="true">
        ${WEEK_KO.map(d => `<span class="cal__dow">${d}</span>`).join('')}
      </div>
      <div class="cal__grid" id="calGrid">
        ${cells.map(date => {
          if (!date) return '<span class="cal__cell cal__cell--blank"></span>';
          const rec    = moods[date];
          const mood   = rec ? MOOD_BY_KEY[rec.mood] : null;
          const future = date > today;
          return `<button class="cal__cell ${mood ? 'has-mood' : ''} ${date === today ? 'cal__cell--today' : ''}"
                    ${mood ? `style="--cell:${mood.color}"` : ''}
                    data-day="${date}" ${future ? 'disabled' : ''}
                    aria-label="${Number(date.slice(8,10))}일${mood ? ' ' + mood.label : ' 기록 없음'}">
            <span>${Number(date.slice(8,10))}</span>
            ${mood ? `<span class="cal__emoji" aria-hidden="true">${mood.emoji}</span>` : ''}
          </button>`;
        }).join('')}
      </div>
    </div>

    <div id="calSummary"></div>
  `;
  calState.dir = '';

  fx.reveal(document.getElementById('calGrid'),
            '.cal__cell:not(.cal__cell--blank)', { y:8, dur:400, stagger:11, cap:280 });

  document.getElementById('prevM').addEventListener('click', () => {
    calState.month--; if (calState.month < 1){ calState.month = 12; calState.year--; }
    calState.dir = 'slide-prev';
    rerender(root, renderCalendar);
  });
  document.getElementById('nextM').addEventListener('click', () => {
    calState.month++; if (calState.month > 12){ calState.month = 1; calState.year++; }
    calState.dir = 'slide-next';
    rerender(root, renderCalendar);
  });

  document.getElementById('calGrid').addEventListener('click', e => {
    const cell = e.target.closest('[data-day]');
    if (!cell || cell.disabled) return;
    openMoodSheet(cell.dataset.day, () => { rerender(root, renderCalendar); });
  });
}

function openMoodSheet(date, onSaved){
  const rec = Moods.get(date);
  let picked = rec ? rec.mood : null;

  const dim = document.createElement('div');
  dim.className = 'sheet-dim';
  const sheet = document.createElement('div');
  sheet.className = 'sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.innerHTML = `
    <span class="sheet__grip" aria-hidden="true"></span>
    <p class="sheet__date">${formatKDate(date)} 기분은 어땠나요?</p>
    <div class="sheet__moods">
      ${MOODS.map(m => `
        <button class="mood-btn ${picked === m.key ? 'is-on' : ''}"
                data-mood="${m.key}" style="--pick:${m.color}">
          <span class="e" aria-hidden="true">${m.emoji}</span>${m.label}
        </button>`).join('')}
    </div>
    <label class="label" for="memo">한 줄 메모 (선택)</label>
    <div class="field">
      <textarea id="memo" rows="3" maxlength="200"
        placeholder="오늘 있었던 일을 짧게 남겨 보세요.">${esc(rec ? rec.memo : '')}</textarea>
    </div>
    <div class="sheet__actions">
      <button class="btn btn--primary" id="saveMood" data-spark ${picked ? '' : 'disabled'}>저장하기</button>
      <button class="btn btn--ghost" id="closeSheet">닫기</button>
    </div>
    ${rec ? '<button class="btn btn--ghost btn--block" id="delMood" style="margin-top:9px">기록 삭제</button>' : ''}
  `;
  document.body.append(dim, sheet);
  fx.reveal(sheet, '.mood-btn', { y:10, dur:340, stagger:38 });

  const close = () => {
    dim.remove(); sheet.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  dim.addEventListener('click', close);
  sheet.querySelector('#closeSheet').addEventListener('click', close);

  sheet.querySelectorAll('[data-mood]').forEach(btn => {
    btn.addEventListener('click', () => {
      picked = btn.dataset.mood;
      sheet.querySelectorAll('[data-mood]').forEach(b => b.classList.toggle('is-on', b === btn));
      sheet.querySelector('#saveMood').disabled = false;
    });
  });

  sheet.querySelector('#saveMood').addEventListener('click', () => {
    if (!picked) return;
    Moods.set(date, picked, sheet.querySelector('#memo').value.trim());
    close(); onSaved();
  });

  const del = sheet.querySelector('#delMood');
  if (del) del.addEventListener('click', () => {
    if (!confirm('이 날의 기록을 삭제할까요?')) return;
    Moods.remove(date); close(); onSaved();
  });
}
```

- [ ] **Step 3: 수동 검증**

`#/calendar`에서 확인한다.

1. 이번 달이 열리고, **1일이 올바른 요일 칸**에 있다. 오늘 날짜에 초록 링이 보인다.
2. 날짜 칸이 **왼쪽 위부터 물결처럼** 순차 등장한다.
3. **미래 날짜는 흐리고 눌리지 않는다.** 「다음 달」 버튼도 이번 달에서는 비활성이다.
4. 지난 날짜를 누르면 **바텀 시트가 아래에서 올라오고**, 감정 버튼 5개가 순차 등장한다.
5. 감정을 고르기 전에는 「저장하기」가 비활성이다. 고르면 해당 버튼에 감정 색 테두리가 생긴다.
6. 저장하면 시트가 닫히고 **그 날짜 칸에 이모지와 옅은 감정 색 배경**이 생긴다.
7. 같은 날짜를 다시 열면 **이전 선택과 메모가 그대로** 있고, 「기록 삭제」 버튼이 나타난다.
8. 「‹」로 지난 달로 가면 화면이 **오른쪽에서 슬라이드**되어 들어온다. 지난 달 기록도 그대로 보인다.
9. 시트가 열린 상태에서 **Esc 키** 또는 **어두운 배경 클릭**으로 닫힌다.
10. `#/home`으로 돌아가면 「이번 달 기록한 날」 숫자가 늘어나 있다.

`color-mix`를 지원하지 않는 구형 브라우저에서는 감정 배경색이 흰색으로 보인다. 이모지는 그대로 나오므로 정보 손실은 없다.

- [ ] **Step 4: 커밋**

```bash
git add index.html && git commit -m "feat: 감정달력 - 월 격자, 감정 기록 바텀 시트, 월 이동"
```

---

### Task 12: 월별 감정 요약

**Files:**
- Modify: `index.html` — `/* == CALENDAR == */` CSS 구획, `/* == VIEWS == */`

- [ ] **Step 1: 요약 CSS 추가**

`/* == CALENDAR == */` 구획 끝에 넣는다.

```css
.sum__lead{font-size:15px; margin-bottom:14px}
.sum__num{font-size:26px; font-weight:800; color:var(--green-700); margin-right:2px}
.sum__bars{display:grid; gap:9px}
.sum__row{display:grid; grid-template-columns:76px 1fr 20px; align-items:center; gap:9px}
.sum__label{font-size:12px; font-weight:700; color:var(--ink-muted); display:flex; gap:4px; align-items:center}
.sum__track{height:8px; border-radius:4px; background:var(--green-50); overflow:hidden}
.sum__fill{display:block; height:100%; width:0; border-radius:4px;
           transition:width var(--dur-slow) var(--ease-out)}
.sum__cnt{font-size:12px; font-weight:800; color:var(--ink-muted); text-align:right}
```

- [ ] **Step 2: `renderMonthSummary` 구현**

`/* == VIEWS == */` 구획에 추가한다.

```js
function renderMonthSummary(host, moods, prefix){
  const { counts, total } = monthStats(moods, prefix);

  if (!total){
    host.innerHTML = `
      <div class="empty" style="margin-top:22px">
        아직 이 달의 기록이 없어요.<br>날짜를 눌러 그날의 마음을 남겨 보세요.
      </div>`;
    return;
  }

  host.innerHTML = `
    <h3 class="section-title">이번 달 마음 살펴보기</h3>
    <div class="card">
      <p class="sum__lead"><b class="sum__num" id="sumTotal">0</b>일 기록했어요</p>
      <div class="sum__bars">
        ${MOODS.map(m => `
          <div class="sum__row">
            <span class="sum__label"><span aria-hidden="true">${m.emoji}</span>${m.label}</span>
            <span class="sum__track">
              <span class="sum__fill" data-w="${Math.round(counts[m.key] / total * 100)}"
                    style="background:${m.color}"></span>
            </span>
            <span class="sum__cnt">${counts[m.key]}</span>
          </div>`).join('')}
      </div>
    </div>`;

  fx.countUp(document.getElementById('sumTotal'), total);
  // 다음 프레임에 width를 넣어야 0% → 실제값 트랜지션이 실행된다
  requestAnimationFrame(() => {
    host.querySelectorAll('.sum__fill').forEach(f => { f.style.width = f.dataset.w + '%'; });
  });
}
```

- [ ] **Step 3: `renderCalendar`에서 호출**

`renderCalendar` 함수 끝, `document.getElementById('calGrid').addEventListener(...)` **다음 줄**에 추가한다.

```js
  renderMonthSummary(document.getElementById('calSummary'), moods, prefix);
```

- [ ] **Step 4: 수동 검증**

- 기록이 하나도 없는 달 → **「아직 이 달의 기록이 없어요」** 안내가 점선 상자로 보인다.
- 기록을 3일 남긴 달 → 「**3**일 기록했어요」의 숫자가 0에서 올라가고, 5개 막대가 **0에서 실제 비율까지 자란다**.
- 감정을 저장하면 요약이 **즉시 갱신**된다 (`onSaved` → `renderCalendar` → `renderMonthSummary`).
- 지난 달로 이동하면 그 달의 통계로 바뀐다.

막대가 자라지 않고 처음부터 최종 너비면 `requestAnimationFrame` 감싸기가 빠진 것이다.

- [ ] **Step 5: 커밋**

```bash
git add index.html && git commit -m "feat: 월별 감정 분포 요약과 빈 상태 안내"
```

---

### Task 13: 최종 점검

**Files:**
- Modify: `index.html` (발견된 문제만)

- [ ] **Step 1: 셀프테스트 전건 통과 확인**

```
selfTest()
```
기대: `전체 49건 통과`, 반환값 `true`. **한 건이라도 실패하면 다음 단계로 넘어가지 않는다.**

- [ ] **Step 2: 요구 정의서 6번 전체 사용자 흐름 재현**

브라우저 콘솔에서 `localStorage.clear()`로 초기화한 뒤, 요구 정의서의 흐름을 그대로 따라간다.

```
고민 발생 → 앱 실행(#/home)
→ 간편 상담(#/chat)에서 "요즘 성적 때문에 너무 불안해요" 입력
→ 도움말 확인
→ [위클래스 상담 신청하기] 클릭
→ 날짜·시간 선택 → 정보 입력 → 신청 완료(신청번호 확인)
→ [오늘 감정 기록하러 가기] → 오늘 날짜에 감정·메모 저장
→ 달력에서 기록 확인 → #/home에서 요약 확인
```

**중간에 한 번도 막히거나 뒤로 나가야 하는 지점이 없어야 한다.** 이것이 요구 정의서 8번 「차별점」의 핵심이다.

- [ ] **Step 3: 접근성 점검**

- **키보드만으로** 전체 흐름을 통과한다 (Tab / Shift+Tab / Enter / Space / Esc). 포커스 링이 항상 보여야 한다.
- 바텀 시트가 열렸을 때 **Esc로 닫힌다**.
- OS 「동작 줄이기」를 켠 뒤 전체 화면을 다시 돈다. **모든 텍스트와 숫자가 즉시 최종 상태로 보이고**, 빈 화면이 없어야 한다.
- 브라우저 확대 200%에서 글자가 잘리지 않는다.
- 이모지에는 `aria-hidden="true"`가, 달력 칸에는 `aria-label`이 있다.

- [ ] **Step 4: 반응형 점검**

개발자도구 기기 목록에서 확인한다.

| 폭 | 확인 |
|---|---|
| 320px (iPhone SE) | 날짜 칩이 겹치지 않고, 하단 탭 글자가 줄바꿈되지 않는다 |
| 390px (iPhone 14) | 기본 기준. 달력 칸이 정사각형이다 |
| 768px (iPad) | 콘텐츠가 480px로 중앙 정렬되고 양옆이 비어 있다 |
| 1280px (데스크톱) | 동일. 마우스 호버 이펙트(스포트라이트·틸트·마그넷)가 동작한다 |

- [ ] **Step 5: 환경 내성 점검**

- **`file://`로 직접 열기**: 파일 탐색기에서 `index.html`을 더블클릭해도 모든 기능이 동작한다. 콘솔에 CORS 오류가 없어야 한다.
- **인터넷 차단**: 개발자도구 Network 탭에서 Offline으로 설정하고 새로고침 → 정상 동작한다. **외부 요청이 0건**이어야 한다.
- **저장소 차단**: 시크릿 모드 또는 브라우저 설정에서 사이트 데이터를 차단한 상태로 열어도 **앱이 흰 화면이 되지 않는다** (`DB.read`/`DB.write`의 try/catch가 처리). 저장은 안 되지만 화면은 모두 보여야 한다.
- **콘솔 오류 0건**: 전체 흐름을 한 바퀴 돌았을 때 빨간 오류가 없어야 한다.

- [ ] **Step 6: 성능 점검**

개발자도구 Performance 탭에서 10초 녹화한다.

- HOME에서 **가만히 두었을 때 rAF 프레임이 계속 돌지 않는다** (오로라는 CSS 애니메이션이므로 컴포지터에서 처리된다).
- 클릭 스파크가 사라진 뒤 **JS 실행이 0에 수렴**한다.
- 달력 42칸 등장 시 프레임 드롭(긴 노란 막대)이 없다.

- [ ] **Step 7: 커밋**

```bash
git add index.html && git commit -m "chore: 최종 점검 - 접근성, 반응형, 오프라인 동작 확인"
```

---

## 7. 요구 정의서 커버리지

| 요구 정의서 항목 | 대응 |
|---|---|
| html 형태, 어느 환경에서도 작동 | 단일 `index.html`, 외부 의존성 0, `file://` 동작 — Task 1, Task 13 Step 5 |
| 흰색 + 초록색 UI | §3 색 팔레트, Task 1 토큰, Task 3 컴포넌트 |
| 네잎클로버 로고 | Task 1 `#logo-clover` 심볼 (앱바·히어로·상담 아바타에 재사용) |
| 4-① 간편 상담 | Task 6 규칙 엔진, Task 7 화면 |
| 4-① 전문 상담을 대체하지 않음 명시 | Task 5·7의 `.disclaimer` |
| 4-② 위클래스 상담 신청·예약 | Task 8 로직, Task 9 3단계 화면 |
| 4-② 「앱 실행 → 신청 → 날짜 선택 → 완료」 | Task 9 (탭 진입 즉시 1단계) |
| 4-③ 감정달력 5단계 + 메모 | Task 2 `MOODS`, Task 11 시트 |
| 4-③ 시간에 따른 변화 확인 | Task 11 월 이동, Task 12 월별 분포 |
| 5. HOME 3개 진입점 | Task 5 메뉴 카드 |
| 6. 전체 사용자 흐름 | Task 13 Step 2에서 통째로 검증 |
| 8. 상담 전 → 신청 → 상담 후 연결 | 간편 상담 결과 → 상담 신청 버튼, 신청 완료 → 감정 기록 버튼 |

## 8. 의도적으로 넣지 않은 것

요구 정의서에 없는 기능은 만들지 않았다. 나중에 논의할 만한 것만 적어 둔다.

| 항목 | 왜 뺐는가 |
|---|---|
| **익명 신청** | 「진입장벽 낮추기」라는 목적에는 잘 맞지만 요구 정의서 5번의 「신청 정보 입력」에 없다. 추가하려면 위클래스 운영 방식(익명 상담이 실제로 가능한지)부터 확인해야 한다. |
| **실제 신청 전송 / 백엔드** | 「어느 환경에서도 작동하는 HTML」과 충돌한다. 실서비스로 가려면 별도 논의가 필요하다. |
| **AI 응답** | 단일 HTML에서는 API 키가 노출되고 인터넷이 필요하다. 규칙 기반으로 확정했다. |
| **로그인 · 알림 · 데이터 내보내기 · 다크 모드 · PWA 설치** | 요구 정의서에 없다. |

## 9. 실행 방법

```bash
open index.html          # macOS
start index.html         # Windows
```

빌드도 서버도 필요 없다. 브라우저 콘솔에서 `selfTest()`로 로직 검증, `localStorage.clear()`로 초기화한다.

---

## 10. 최종 검토에서 나온 것 (2026-08-30)

구현 완료 후 전체 코드 검토에서 결함이 나왔다. 재현 확인 후 아래를 수정했고, 계획서 코드 블록도 함께 고쳤다.

### 수정 완료

| # | 문제 | 왜 중요한가 |
|---|---|---|
| C1 | 자존감 규칙의 키워드 `'살'`이 **살다·살고·살아를 전부 삼켰다.** 「살고 싶지 않아요」가 위기가 아니라 자존감으로 분류되어 "SNS를 하루 쉬어 보기" 조언과 함께 **전화번호 없이** 응답됐다. 「유서」·「손목을 그었어요」·「다 끝내고 싶어요」 등도 위기 목록에 없어 기본 응답으로 빠졌다. | 이 앱이 절대 해서는 안 되는 실패. 위기 표현이 무관한 규칙에 가로채여 도움 연결이 끊긴다. |
| C2 | 신청번호를 `list.length + 1`로 매겨서, **취소 후 번호가 재사용**됐다. 같은 번호가 두 건이 되고, 그중 하나를 취소하면 `filter`가 **둘 다 지웠다.** | 학생이 건드리지 않은 예약이 조용히 사라진다. |
| I1 | 감정 기록 시트가 `body`에 붙어 있어 **라우팅해도 남았다.** 뒤로가기 시 화면만 바뀌고 시트가 떠 있어 상태가 어긋났다. | 안드로이드 하드웨어 뒤로가기에서 재현된다. |
| I2 | 제자리 재렌더(이야기 나누기·다음·이전으로 등)에서 **스크롤이 복귀되지 않았다.** 간편 상담 결과가 중간부터 보여 **위기 안내 카드가 화면 밖으로 밀릴 수 있었다.** | 급한 정보가 스크롤 위로 사라진다. `rerender()` 헬퍼로 통일. |
| I5 | 저장 데이터가 손상되면 `MOOD_BY_KEY[...].emoji`에서 예외가 나 **홈이 백지**가 되고 새로고침으로도 복구되지 않았다. | 앱 내 경로로는 발생하지 않지만, 공용 PC에서 복구 불가 상태가 된다. |
| I7 | 109·1388이 일반 텍스트여서 **누를 수 없었다.** | 가장 힘든 순간에 번호를 외워 다시 입력해야 한다. `tel:` 링크로 변경. |

C1·C2는 `selfTest()`에 회귀 어서션 9건을 추가해 고정했다 (총 **49건**).

### 판단이 필요한 미결 항목

아래는 임의로 고치지 않았다. 제품 판단이 필요하거나 범위를 넘는다.

| # | 내용 | 논점 |
|---|---|---|
| I3 | 상담 신청 2단계에서 **「이전으로」를 누르면 입력한 내용이 전부 사라진다.** 학년·반·이름·주제·하고 싶은 말이 DOM에만 있고 `bookState`에 없다. | 실제로 학생이 신청을 포기하는 지점일 가능성이 가장 높다. `bookState`에 폼 값을 올리는 작은 리팩터가 필요하다. |
| I4 | `localStorage` 저장이 실패해도 **「상담 신청이 접수됐어요」와 신청번호를 그대로 보여준다.** (Safari는 `file://`에서 `localStorage`를 막을 수 있다 — 미확인) | 저장 안 된 걸 접수됐다고 말하는 건 이 앱의 전제와 충돌한다. 시작 시 저장 가능 여부를 탐지해 배너를 띄우는 방안. |
| I6 | 공용 PC에서 **내 신청 내역이 모두에게 보이고 취소도 가능**하다. 간편 상담에 쓴 글이 신청 메시지로 조용히 복사되어 학년·반·이름과 함께 저장된다. | 「이 기기에만 저장」은 사실이지만, 공용 기기에서는 그게 위험 요소다. 최소한 "이 기기에서 내 기록 지우기" 동작이 필요하다. |
| 기타 | `fx.typeText`의 건너뛰기 반환값 미사용, 시트 포커스 트랩 부재, 입력 3개에 접근 가능한 이름 없음, 탭에 `aria-current` 없음, 두 탭 간 슬롯 표시 지연, 날짜 배지 마크업 3곳 중복 | 개별로는 작지만 접근성 항목은 함께 처리하는 편이 낫다. |

---

## 11. 보완 및 모바일(PWA) 버전 (2026-08-30)

### §10 미결 항목 처리

| # | 조치 |
|---|---|
| I3 | 신청 폼 값(학년·반·이름·주제·하고 싶은 말)을 `bookState.form`으로 올렸다. 「이전으로」나 탭 이동 후에도 남는다. 제출 성공 시에만 비운다. |
| I4 | 시작 시 `STORAGE_OK`로 저장 가능 여부를 탐지한다. 불가하면 상단에 빨간 띠를 띄우고, 완료 화면 제목을 「상담 신청이 접수됐어요」 대신 **「신청 내용을 적어 두세요」** 로 바꿔 저장되지 않았음을 알린다. |
| I6 | 홈에 **「이 기기에서 내 기록 모두 지우기」** 를 추가했다 (감정·신청·간편 상담 글까지 정리). 간편 상담 글이 신청서로 옮겨질 때 그 사실을 문구로 알린다. |
| 기타 | 타이핑 건너뛰기 연결, 시트 닫을 때 포커스 복귀, 입력 3개 `aria-label`, 탭 `aria-current`, 완료 화면 잔류 해제, 인라인 오류 + 빈 칸 포커스, 날짜 배지 `dateBadge()`로 통합 |

### 모바일 최적화

- 본문 `font-size:16px` 고정 — 그보다 작으면 iOS가 입력 포커스 시 화면을 확대한다
- `touch-action:manipulation` — 더블탭 확대와 300ms 탭 지연 제거
- 앱바에 `env(safe-area-inset-top)` — 노치·다이내믹 아일랜드 아래로
- 취소 버튼 최소 44×56px, 360px 이하 화면 전용 레이아웃
- `-webkit-text-size-adjust:100%`, `overscroll-behavior-y:contain`

### PWA 구성

```
manifest.webmanifest   standalone 표시, 세로 고정, 바로가기 2개
sw.js                  화면은 network-first, 아이콘은 cache-first
icons/                 순수 Python으로 SDF 래스터화해 생성 (외부 도구 없음)
.nojekyll              GitHub Pages 파일 필터링 방지
```

- 서비스워커는 `location.protocol.startsWith('http')`일 때만 등록한다. `file://`로 열면 조용히 건너뛰고 앱은 그대로 동작한다.
- 모든 경로가 상대 경로라 GitHub Pages 하위 경로(`/저장소명/`)에서도 깨지지 않는다.
- **앱 수정 후에는 `sw.js`의 `CACHE` 버전을 올려야** 폰에 반영된다.

배포 절차는 `README.md` 참조.
