# Project Documentation Rules (Non-Obvious Only)

- 모든 실제 코드는 `app.html`(iPhone 전용, 2836줄)과 `index.html`(웹/PC, 2751줄) 두 파일에 있다. `docs/`는 설계·계획 문서만.
- `docs/superpowers/plans/2026-08-30-todak-plus.md`가 아키텍처 결정·TDD 방식·구현 태스크 기록을 담은 1차 참고 문서.
- **`selfTest()`는 `index.html`에만 있다. `app.html`에는 없음.** 브라우저 콘솔 전용 (Node.js/Jest 실행 불가).
- 간편 상담은 AI/LLM이 아니다. `/* == DATA: 상수 == */`의 `RULES` 배열(56개 카테고리)에 정의된 키워드 매칭 규칙 기반이며 `normalizeText()` → `pickAdvice()` 순으로 처리된다.
- 상담 신청은 실제로 어디에도 전송되지 않는다. localStorage에만 저장됨 (`todak.bookings`).
- `chatState`의 `duration` 필드 (today/days/weeks/long): 간편상담 step2a에서 수집, step3 팁카드 렌더링에 사용.
- `angry` 기분은 달력(`MOODS`)과 채팅(`CHAT_MOODS`) 둘 다에 존재하며 CSS 변수 `--mood-angry:#E8845A` 사용.
- `data/` 폴더: `.gitignore`에 추가됨 (74MB AI Hub 원본 데이터, 앱 실행에 불필요, 로컬 전용).
