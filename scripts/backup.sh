#!/usr/bin/env bash
# Sao lưu SQLite (FTalentHub) an toàn khi DB đang được server ghi.
#
#   ./scripts/backup.sh
#
# - Dùng `sqlite3 .backup` (API backup của SQLite), KHÔNG dùng `cp` — cp file
#   DB ngay lúc server đang ghi sẽ tạo bản hỏng (torn page).
# - Nén thành .db.gz trong backend/backups/ (đuôi .db.gz vì thực chất là FILE
#   DB NHỊ PHÂN nén lại — KHÔNG phải SQL dump, đừng nạp bằng `.read`/import SQL),
#   tên có timestamp + PID để không đụng nhau khi chạy 2 lần trong cùng 1 giây.
# - Khôi phục: bash scripts/backup.sh --restore <file.db.gz> — giải nén ra file
#   tạm, integrity_check đạt mới thay DB thật (giữ bản .bak của DB cũ để lui).
# - Tự xoá bản cũ, chỉ giữ N bản mới nhất (KEEP, mặc định 7):
#     KEEP=30 ./scripts/backup.sh
# - Đổi đường dẫn khi cần:
#     DB_PATH=/path/to/talenthub.db BACKUP_DIR=/path/to/dir ./scripts/backup.sh
# - Kiểm tra sau sao lưu: integrity_check trên bản giải nén + gunzip -t;
#   thất bại → xoá file hỏng, báo lỗi rõ ràng, exit khác 0.
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB_PATH="${DB_PATH:-$ROOT/backend/talenthub.db}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/backend/backups}"
KEEP="${KEEP:-7}"

die() { echo "backup.sh: LỖI: $*" >&2; exit 1; }

command -v sqlite3 >/dev/null 2>&1 || die "không tìm thấy lệnh sqlite3 (cần SQLite CLI)"
command -v gzip >/dev/null 2>&1 || die "không tìm thấy lệnh gzip"

# --- Chế độ khôi phục: kiểm tra kỹ rồi mới thay DB thật ---
do_restore() {
  local src="$1"
  [ -n "$src" ] || die "thiếu đường dẫn file: bash scripts/backup.sh --restore <file.db.gz>"
  [ -f "$src" ] || die "không thấy file backup: $src"
  case "$src" in
    *.db.gz) ;;
    *) die "file backup phải có đuôi .db.gz (nhận: $src). File .sql.gz bản cũ là cùng định dạng nhị phân — đổi tên thành .db.gz rồi chạy lại, đừng nạp như SQL dump" ;;
  esac
  local tmp="${TMPDIR:-/tmp}/.fth-restore-$$.db"
  rm -f "$tmp"
  gunzip -t "$src" 2>/dev/null || die "file $src nén hỏng (gunzip -t thất bại) — DB thật giữ nguyên"
  gzip -dc "$src" > "$tmp" 2>/dev/null || { rm -f "$tmp"; die "giải nén $src thất bại — DB thật giữ nguyên"; }
  if [ "$(sqlite3 "$tmp" "PRAGMA integrity_check;" 2>/dev/null)" != "ok" ]; then
    rm -f "$tmp"
    die "bản giải nén từ $src không integrity ok — TỪ CHỐI khôi phục, DB thật giữ nguyên"
  fi
  # Giữ đường lui: sao lưu DB hiện tại (nếu có) bằng .backup — KHÔNG dùng cp
  # vì DB có thể đang được server ghi.
  local bak=""
  if [ -f "$DB_PATH" ]; then
    bak="${DB_PATH}.bak"
    sqlite3 "$DB_PATH" ".backup '$bak'" 2>/dev/null || { rm -f "$tmp"; die "không sao lưu được DB hiện tại — dừng để an toàn"; }
    chmod 600 "$bak"
  fi
  mv -f "$tmp" "$DB_PATH" || { rm -f "$tmp"; die "không thay được DB thật"; }
  chmod 600 "$DB_PATH"
  echo "backup.sh: KHÔI PHỤC XONG — $DB_PATH (từ $(basename "$src"))"
  [ -n "$bak" ] && echo "backup.sh: bản DB cũ giữ tại: $bak"
  echo "backup.sh: LƯU Ý — nếu backend đang chạy, hãy restart để connection pool bỏ file DB cũ (SQLite giữ inode cũ cho kết nối đang mở)."
}

if [ "${1:-}" = "--restore" ]; then
  do_restore "${2:-}"
  exit 0
fi

[ -f "$DB_PATH" ] || die "không thấy file DB: $DB_PATH"
case "$KEEP" in
  ''|*[!0-9]*|0) die "KEEP phải là số nguyên dương (nhận: '$KEEP')" ;;
esac

mkdir -p "$BACKUP_DIR" || die "không tạo được thư mục: $BACKUP_DIR"

TS="$(date +%Y%m%d-%H%M%S)"
BASE="talenthub-${TS}-$$"
TMP_DB="$BACKUP_DIR/.tmp-${BASE}.db"
OUT="$BACKUP_DIR/${BASE}.db.gz"

# 1. Backup online bằng API của SQLite (an toàn khi server đang chạy).
if ! sqlite3 "$DB_PATH" ".backup '$TMP_DB'" 2>"$BACKUP_DIR/.tmp-${BASE}.err"; then
  cat "$BACKUP_DIR/.tmp-${BASE}.err" >&2
  rm -f "$TMP_DB" "$BACKUP_DIR/.tmp-${BASE}.err"
  die "sqlite3 .backup thất bại"
fi
rm -f "$BACKUP_DIR/.tmp-${BASE}.err"

# 2. Kiểm tra integrity TRƯỚC khi nén (bắt bản hỏng ngay tại nguồn).
if [ "$(sqlite3 "$TMP_DB" "PRAGMA integrity_check;" 2>/dev/null)" != "ok" ]; then
  rm -f "$TMP_DB"
  die "integrity_check trên bản backup thất bại — đã xoá file hỏng, DB nguồn giữ nguyên"
fi

# 3. Nén + khóa quyền (file chứa mật khẩu băm — chỉ owner được đọc).
gzip -c "$TMP_DB" > "$OUT" || { rm -f "$TMP_DB" "$OUT"; die "nén gzip thất bại"; }
rm -f "$TMP_DB"
chmod 600 "$OUT"

# 4. Kiểm tra SAU khi nén: giải nén được + nội dung vẫn integrity ok.
VERIFY_DB="$BACKUP_DIR/.verify-$$.db"
if ! gunzip -t "$OUT" 2>/dev/null; then
  rm -f "$OUT"
  die "file $OUT nén hỏng (gunzip -t thất bại) — đã xoá"
fi
rm -f "$VERIFY_DB"
# (dùng gzip -dc thay vì zcat vì zcat trên vài hệ không đọc file .gz)
if ! gzip -dc "$OUT" > "$VERIFY_DB" 2>/dev/null || \
   [ "$(sqlite3 "$VERIFY_DB" "PRAGMA integrity_check;" 2>/dev/null)" != "ok" ]; then
  rm -f "$VERIFY_DB" "$OUT"
  die "bản giải nén từ $OUT không integrity ok — đã xoá file hỏng"
fi
rm -f "$VERIFY_DB"

# 5. Xoá bản cũ, chỉ giữ KEEP bản mới nhất.
# Chụp snapshot MỘT lần (tránh lệch giữa hai lần ls) và KHÔNG BAO GIỜ xoá
# file vừa tạo ($OUT): thà giữ thừa một bản còn hơn xoá nhầm bản mới nhất.
size="$(du -h "$OUT" | cut -f1)"
SNAP="$BACKUP_DIR/.snap-$$.txt"
ls -1 "$BACKUP_DIR"/talenthub-*.db.gz 2>/dev/null | sort > "$SNAP"
total=$(wc -l < "$SNAP" | tr -d ' ')
if [ "$total" -gt "$KEEP" ]; then
  drop=$((total - KEEP))
  grep -v -x -F "$OUT" "$SNAP" | head -n "$drop" | while read -r old; do
    rm -f "$old" && echo "backup.sh: xoá bản cũ: $(basename "$old")"
  done
fi
rm -f "$SNAP"

echo "backup.sh: XONG — $(basename "$OUT") ($size), giữ tối đa $KEEP bản trong $BACKUP_DIR"
echo "backup.sh: khôi phục khi cần: bash scripts/backup.sh --restore $OUT"
