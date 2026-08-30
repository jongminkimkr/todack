# 배포 가이드

이 앱은 빌드 도구 없이 **GitHub Pages**로 배포합니다.
배포하면 두 가지 버전이 공개됩니다.

| 버전 | 주소 |
|---|---|
| 웹/PC 버전 | `https://<사용자명>.github.io/<저장소명>/` |
| iPhone 설치 버전 | `https://<사용자명>.github.io/<저장소명>/app.html` |

---

## 1. 사전 준비

### GitHub Personal Access Token (PAT) 발급

GitHub은 비밀번호 대신 PAT를 사용해 인증합니다.

1. GitHub 로그인 → **Settings → Developer settings → Personal access tokens → Tokens (classic)**
2. **Generate new token (classic)** 클릭
3. 권한 체크: `repo` (전체)
4. **Generate token** → 토큰 복사 (`ghp_` 로 시작하는 문자열)

> ⚠️ 토큰은 한 번만 표시됩니다. 반드시 복사해 두세요.
> ⚠️ 토큰은 비밀번호와 동일하게 취급하세요. 채팅·코드에 절대 노출하지 마세요.

---

## 2. 최초 배포 (처음 한 번만)

### 2-1. 로컬에서 git 초기화 및 원격 저장소 연결

```bash
# 저장소 루트 디렉터리에서 실행
git init
git add .
git commit -m "first commit"

# GitHub에서 새 저장소를 만든 뒤 연결
git remote add origin https://github.com/<사용자명>/<저장소명>.git
```

### 2-2. main 브랜치에 push

```bash
git checkout -b main
git push https://<토큰>@github.com/<사용자명>/<저장소명>.git main
```

### 2-3. GitHub Pages 활성화

**방법 A — GitHub 웹 UI (권장)**

1. 저장소 페이지 → **Settings → Pages**
2. Source: `Deploy from a branch`
3. Branch: **`main`** / **`/ (root)`**
4. **Save** 클릭
5. 1~2분 후 Actions 탭에서 배포 완료 확인

**방법 B — API (터미널)**

```bash
curl -X POST \
  -H "Authorization: token <토큰>" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/<사용자명>/<저장소명>/pages \
  -d '{"source":{"branch":"main","path":"/"}}'
```

응답에 `"html_url"` 이 포함되면 성공입니다. 배포 완료까지 1~2분 기다린 뒤 접속하세요.

---

## 3. 코드 수정 후 재배포

```bash
# 변경된 파일 스테이징
git add <파일명>         # 특정 파일만
# 또는
git add .               # 전체

# 커밋
git commit -m "변경 내용 설명"

# push (토큰 포함)
git push https://<토큰>@github.com/<사용자명>/<저장소명>.git main
```

push가 완료되면 GitHub Actions가 자동으로 Pages를 재빌드합니다 (약 1분 소요).

### ⚠️ 반드시 함께 해야 할 일

앱 코드를 수정했다면 `sw.js`의 캐시 버전을 올려야 합니다.
그렇지 않으면 이미 설치된 기기에서 **이전 버전이 계속 표시됩니다.**

```js
// sw.js
const CACHE = 'todak-v3';  // v3 → v4 처럼 숫자를 올린다
```

---

## 4. 이 프로젝트의 실제 배포 기록

| 단계 | 명령 / 내용 |
|---|---|
| 원격 저장소 연결 | `git remote add origin https://github.com/jongminkimkr/todack.git` |
| 최초 push | `git push https://<토큰>@github.com/jongminkimkr/todack.git main` |
| Pages 활성화 | GitHub API POST 로 자동 활성화 |
| 현재 배포 주소 | https://jongminkimkr.github.io/todack/ |
| iPhone 전용 주소 | https://jongminkimkr.github.io/todack/app.html |
| 현재 캐시 버전 | `todak-v3` |

---

## 5. iPhone 홈 화면에 설치하기

1. iPhone **Safari** 로 `https://jongminkimkr.github.io/todack/app.html` 접속
   - Chrome for iOS는 홈 화면 추가 기능이 없으므로 반드시 Safari 사용
2. 하단 **공유 버튼(□↑) → 홈 화면에 추가**
3. 이름 확인 후 **추가** 탭
4. 홈 화면 아이콘을 탭하면 주소창 없이 전체화면으로 실행

---

## 6. 배포 확인 방법

```bash
# 200이 나오면 정상
curl -s -o /dev/null -w "%{http_code}" https://jongminkimkr.github.io/todack/
curl -s -o /dev/null -w "%{http_code}" https://jongminkimkr.github.io/todack/app.html
```

---

## 7. 문제 해결

| 증상 | 원인 | 해결 |
|---|---|---|
| 404 오류 | Pages 미활성화 또는 비공개 저장소 | Settings → Pages 설정 확인. 비공개라면 Public으로 변경 |
| 이전 버전이 계속 표시됨 | 서비스워커 캐시 | `sw.js`의 `CACHE` 값을 올리고 재배포 |
| push 인증 실패 | 토큰 만료 또는 권한 부족 | PAT 재발급 후 `repo` 권한 포함 |
| iPhone에서 설치 안 됨 | Chrome for iOS 사용 중 | Safari 로 접속 |
