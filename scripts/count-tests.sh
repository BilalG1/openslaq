#!/usr/bin/env bash
set -euo pipefail

humanize() {
  awk -v n="$1" 'BEGIN {
    if (n >= 1000000000) { printf("%.1fb", n / 1000000000); exit }
    if (n >= 1000000) { printf("%.1fm", n / 1000000); exit }
    if (n >= 1000) { printf("%.1fk", n / 1000); exit }
    printf("%d", n)
  }'
}

classify_app() {
  local path="$1"
  if [[ "$path" =~ ^apps/([^/]+) ]]; then
    local app="${BASH_REMATCH[1]}"
    if [[ "$app" == *-e2e ]]; then
      app="${app%-e2e}"
    fi
    printf '%s\n' "$app"
    return
  fi
  if [[ "$path" =~ ^packages/([^/]+) ]]; then
    printf 'packages/%s\n' "${BASH_REMATCH[1]}"
    return
  fi
  printf 'other\n'
}

classify_type() {
  local path="$1"
  if [[ "$path" == *"/e2e/"* || "$path" == apps/*-e2e/* || "$path" == *.spec.* ]]; then
    printf 'e2e\n'
    return
  fi
  if [[ "$path" == *.integration.test.* || "$path" == *.int.test.* ]]; then
    printf 'integration\n'
    return
  fi
  printf 'unit\n'
}

tmp_file="$(mktemp)"
trap 'rm -f "$tmp_file"' EXIT

while IFS= read -r file; do
  app="$(classify_app "$file")"
  type="$(classify_type "$file")"

  test_count="$(
    rg --pcre2 -o '(?<![A-Za-z0-9_$.])(it|test)(?:\.(only|skip|todo|concurrent|serial|failing))*\s*\(' "$file" 2>/dev/null | wc -l | tr -d ' ' || true
  )"

  if [[ "$test_count" -gt 0 ]]; then
    printf '%s\t%s\t%s\n' "$app" "$type" "$test_count" >> "$tmp_file"
  fi
done < <(
  rg --files apps packages \
    | rg '(__tests__/.*\.[cm]?[jt]sx?$|\.test\.[cm]?[jt]sx?$|\.spec\.[cm]?[jt]sx?$)'
)

total_tests="$(awk -F '\t' '{ sum += $3 } END { print sum + 0 }' "$tmp_file")"

printf '+------+----------------------+--------------+--------+\n'
printf '| Rank | App                  | Type         |  Tests |\n'
printf '+------+----------------------+--------------+--------+\n'
printf '| %4s | %-20s | %-12s | %6s |\n' '-' 'total' 'all' "$(humanize "$total_tests")"

rank=1
while IFS=$'\t' read -r app_name test_type test_count; do
  printf '| %4d | %-20s | %-12s | %6s |\n' \
    "$rank" "$app_name" "$test_type" "$(humanize "$test_count")"
  rank=$((rank + 1))
done < <(
  awk -F '\t' '
    {
      key = $1 FS $2
      counts[key] += $3
    }
    END {
      for (key in counts) {
        split(key, parts, FS)
        print parts[1] FS parts[2] FS counts[key]
      }
    }
  ' "$tmp_file" | sort -t $'\t' -k 3,3nr -k 1,1 -k 2,2
)

printf '+------+----------------------+--------------+--------+\n'
