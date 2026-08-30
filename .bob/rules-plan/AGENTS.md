# Project Architecture Rules (Non-Obvious Only)

## 핵심 제약

- **단일 파일 아키텍처** — 어떤 기능을 추가해도 별도 JS/CSS 파일로 분리하지 않는다. 빌드 도구 도입 금지.
- LOGIC과 VIEWS의 결합 금지는 의도적 설계: 순수 함수만 콘솔에서 `selfTest()`로 검증 가능.
- 라우터는 hash 기반 SPA. `pushState` 사용 금지 — `file://`에서 동작 불가.

## 데이터 흐름

```
사용자 입력 → render 함수(DOM 이벤트) → STORE(Moods/Bookings) → DB(localStorage)
                                      → LOGIC 함수(순수, 부수효과 없음)
```

## 기능 확장 시 고려할 점

- 새 저장 항목을 추가하면 `localStorage.clear()` 대신 개별 키 삭제를 지원해야 한다 (공용 PC 프라이버시 요건).
- `STORAGE_OK === false`일 때 저장 실패를 사용자에게 알리는 경로가 이미 있다 — 새 저장 로직도 이 분기를 따른다.
- 위기 감지(`CRISIS_WORDS` 매칭)는 어떤 규칙보다 우선하는 early-return이다. 로직 순서를 바꿀 때 이 우선순위가 깨지지 않도록 한다.
- PWA 오프라인 캐시는 `sw.js`가 담당. ASSETS 배열에 새 정적 파일을 추가해야 오프라인에서도 동작한다.
