# Project Documentation Rules (Non-Obvious Only)

- 모든 실제 코드는 `index.html` 하나에 있다. `docs/`는 설계·계획 문서만.
- `docs/superpowers/plans/2026-08-30-todak-plus.md`가 아키텍처 결정·TDD 방식·구현 태스크 기록을 담은 1차 참고 문서.
- 간편 상담은 AI/LLM이 아니다. `/* == DATA: 상수 == */`의 `RULES` 배열에 정의된 키워드 매칭 규칙 기반.
- 상담 신청은 실제로 어디에도 전송되지 않는다. localStorage에만 저장.
- `selfTest()`는 브라우저 콘솔 전용. Node.js·Jest로 실행 불가.
- 테스트는 `window.selfTest`로 노출되어 있어 콘솔에서 `selfTest()` 한 줄로 실행.
