"""Xác thực mã QR check-in dùng chung cho học sinh và ban tổ chức.

LÝ DO FILE NÀY NẰM Ở core (theo yêu cầu nêu rõ):
- Cùng một logic phải chạy ở HAI router: `student.checkin` (học sinh tự điểm
  danh bằng token) và `student.checkin/scan` (ban tổ chức quét, KHÔNG token).
- Nếu mỗi router tự viết lại phép tính cửa sổ thời gian / chống tái sử dụng,
  hai nơi sẽ lệch nhau (ví dụ chu kỳ 120s đổi một bên mà quên bên kia) và mã
  vừa quét được ở máy này lại bị từ chối ở máy kia. Gom vào đây thì một định
  nghĩa duy nhất cho cả backend; phía frontend đã có bản đối chiếu trong
  `components/qr/maCheckin.ts` (cùng chu kỳ, cùng regex).
"""

from __future__ import annotations

import re
import time

from sqlalchemy.orm import Session

from ..models import CheckIn, Student, TalentPassport

# Chu kỳ đổi mã (giây) — PHẢI khớp CHU_KY_MA_GIAY bên frontend.
CHU_KY_MA_GIAY = 120

# Mã check-in thô: FTH:<mã nguồn>:<cửa sổ>. Mã nguồn tối đa 12 ký tự ASCII.
MA_CHECKIN_RE = re.compile(r"^FTH:([A-Za-z0-9-]{1,12}):(\d{1,10})$")

# Mã định danh in trên thẻ (ví dụ TP-1001, HS-27).
MA_NGUON_RE = re.compile(r"^[A-Za-z0-9-]{1,12}$")


def tach_ma_tho(dau_vao: str | None) -> str:
    """Tách mã thô `FTH:...` từ dữ liệu quét được (mã thô hoặc URL đầy đủ).

    Máy quét có thể trả về nguyên URL công khai (ví dụ
    `https://truong.edu.vn/checkin?code=FTH%3ATP-1001%3A42`) khi người dùng
    dán tay đường dẫn thay vì quét. Hàm này chuẩn hoá cả hai về mã thô để
    phần còn lại chỉ làm việc với một dạng duy nhất.
    """
    gon = (dau_vao or "").strip()
    if not gon:
        return ""
    # URL đầy đủ: ưu tiên tham số ?code=, nếu không lấy đoạn cuối của path.
    if "://" in gon:
        tu_query = re.search(r"[?&]code=([^&#]*)", gon)
        if tu_query:
            from urllib.parse import unquote

            return unquote(tu_query.group(1)).strip()
        duoi = gon.split("?")[0].rstrip("/").rsplit("/", 1)[-1]
        from urllib.parse import unquote

        return unquote(duoi).strip()
    return gon


def phan_tich_ma(ma_tho: str) -> tuple[str, int] | None:
    """Tách mã thô thành (mã nguồn, cửa sổ). None nếu sai định dạng."""
    khop = MA_CHECKIN_RE.match((ma_tho or "").strip())
    if not khop:
        return None
    return khop.group(1), int(khop.group(2))


def cua_so_hien_tai(moc_giay: float | None = None) -> int:
    """Cửa sổ thời gian hiện tại = số chu kỳ 120s đã trôi qua từ epoch."""
    return int((moc_giay if moc_giay is not None else time.time()) // CHU_KY_MA_GIAY)


def danh_gia_cua_so(cua_so: int, moc_giay: float | None = None) -> str:
    """Đánh giá hạn dùng của cửa sổ: hien_hanh | lech_mot_cua_so | het_han.

    Chấp nhận lệch đúng 1 cửa sổ để không loại oan khi đồng hồ hai máy chênh
    nhau hoặc mã vừa sang chu kỳ lúc quét.
    """
    hien_tai = cua_so_hien_tai(moc_giay)
    if cua_so == hien_tai:
        return "hien_hanh"
    if cua_so == hien_tai - 1:
        return "lech_mot_cua_so"
    return "het_han"


def tim_hoc_sinh_theo_ma(db: Session, ma_nguon: str) -> Student | None:
    """Tìm học sinh sở hữu mã nguồn: khớp mã passport, nếu không thử HS-<id>."""
    hop = (
        db.query(TalentPassport).filter(TalentPassport.qr_code == ma_nguon).first()
    )
    if hop:
        return db.query(Student).filter(Student.id == hop.student_id).first()
    if ma_nguon.startswith("HS-") and ma_nguon[3:].isdigit():
        return db.query(Student).filter(Student.id == int(ma_nguon[3:])).first()
    return None


def ma_da_dung(db: Session, ma_tho: str) -> bool:
    """Một mã thô chỉ check-in được một lần (chống chụp màn hình dùng lại)."""
    return (
        db.query(CheckIn.id).filter(CheckIn.qr_code == ma_tho).first() is not None
    )
