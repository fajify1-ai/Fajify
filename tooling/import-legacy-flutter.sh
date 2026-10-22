#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

DEST_URL="${FAJIFY_DEST_URL:-https://github.com/fajify1-ai/Fajify.git}"
SOURCE_URL="${FAJIFY_SOURCE_URL:-https://github.com/Faith-loves/Faji.git}"
PIN="${FAJIFY_SOURCE_SHA:-b96cc1f294095627b8d2047647505de881fa2e4e}"
BRANCH="feat/m1-import-customer-flutter"
DIR="${FAJIFY_WORKDIR:-$PWD/Fajify-flutter-import}"

fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
[[ "${FAJIFY_SOURCE_REUSE_AUTHORIZED:-}" == confirmed ]] || fail 'Source code and asset reuse authorization not confirmed.'
[[ ! -e "$DIR" ]] || fail 'Work directory already exists; provide a fresh FAJIFY_WORKDIR.'
command -v git >/dev/null || fail 'Git is required.'
git var GIT_AUTHOR_IDENT >/dev/null 2>&1 || fail 'Configure git user.name and user.email first.'
git var GIT_COMMITTER_IDENT >/dev/null 2>&1 || fail 'Configure git user.name and user.email first.'

git clone --branch "$BRANCH" --single-branch "$DEST_URL" "$DIR"
cd "$DIR"
[[ -z "$(git status --porcelain)" ]] || fail 'Dirty clone.'
ORIGINAL_HEAD="$(git rev-parse HEAD)"
[[ ! -e apps/customer_mobile ]] || fail 'apps/customer_mobile already exists. Verify whether import happened previously.'

git remote add upstream_faji "$SOURCE_URL"
git fetch --no-tags upstream_faji main
[[ "$(git rev-parse FETCH_HEAD^{commit})" == "$PIN" ]] || fail 'Source main changed since the reviewed snapshot.'

git subtree add --prefix=apps/customer_mobile "$PIN" -m "feat: import Faji Flutter customer app at ${PIN} (retain source ancestry)"
git remote remove upstream_faji

EXPECTED_TREE="$(git rev-parse "${PIN}^{tree}")"
ACTUAL_TREE="$(git rev-parse HEAD:apps/customer_mobile)"
[[ "$ACTUAL_TREE" == "$EXPECTED_TREE" ]] || fail 'Imported Flutter tree differs from source.'
git merge-base --is-ancestor "$PIN" HEAD || fail 'Original source commit is missing from ancestry.'
[[ -z "$(git status --porcelain)" ]] || fail 'Worktree dirty after import.'

printf 'Original source: %s\nOriginal tree:   %s\nImported tree:   %s\nResult commit:   %s\n' "$PIN" "$EXPECTED_TREE" "$ACTUAL_TREE" "$(git rev-parse HEAD)"

if command -v flutter >/dev/null 2>&1; then
  printf '\nRunning Flutter checks...\n'
  (cd apps/customer_mobile && flutter pub get && flutter analyze && flutter test) || fail 'Flutter checks failed; review locally before publication.'
else
  printf '\nFlutter is unavailable. Validate with flutter pub get / flutter analyze / flutter test before merging.\n'
fi

if [[ "${FAJIFY_PUSH_ACK:-}" == push-migration-branch ]]; then
  REMOTE_HEAD="$(git ls-remote origin "refs/heads/${BRANCH}" | awk '{print $1}')"
  [[ "$REMOTE_HEAD" == "$ORIGINAL_HEAD" ]] || fail 'Remote migration branch changed; refusing to push.'
  git push --porcelain origin "HEAD:refs/heads/$BRANCH"
  printf 'Published migration to branch: %s\n' "$BRANCH"
else
  printf 'Changes are local only. Review worktree and run: git push origin HEAD:refs/heads/%s\n' "$BRANCH"
fi
