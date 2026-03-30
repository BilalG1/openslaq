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

tmp_file="$(mktemp)"
trap 'rm -f "$tmp_file"' EXIT

rg --files -0 | xargs -0 awk '
function ext(path, n, parts, base) {
  n = split(path, parts, "/")
  base = parts[n]
  if (match(base, /\.[^.]+$/)) return substr(base, RSTART + 1)
  return "[no_ext]"
}
FNR == 1 { current_ext = ext(FILENAME) }
{ total++; lines_by_ext[current_ext]++ }
END {
  print "__TOTAL__\t" total
  for (ext_name in lines_by_ext) print ext_name "\t" lines_by_ext[ext_name]
}' > "$tmp_file"

total_lines="$(awk -F '\t' '$1 == "__TOTAL__" { print $2; exit }' "$tmp_file")"

printf '+------+----------------------+--------+\n'
printf '| Rank | Extension            |  Lines |\n'
printf '+------+----------------------+--------+\n'
printf '| %4s | %-20s | %6s |\n' '-' 'total' "$(humanize "$total_lines")"

rank=1
while IFS=$'\t' read -r extension line_count; do
  printf '| %4d | %-20s | %6s |\n' "$rank" "$extension" "$(humanize "$line_count")"
  rank=$((rank + 1))
done < <(awk -F '\t' '$1 != "__TOTAL__" { print $0 }' "$tmp_file" | sort -t $'\t' -k 2,2nr | head -5)

printf '+------+----------------------+--------+\n'
