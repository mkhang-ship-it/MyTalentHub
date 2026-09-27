"""Ghi và đọc nhật ký thao tác nhạy cảm.

Cách dùng:
    from ..core.audit import record_audit
    record_audit(db, "activity.update", user=user, target=("activity", aid),
                 detail={"field": "title"})

VÌ SAO GHI THỦ CÔNG, KHÔNG TỰ ĐỘNG BẮT MỌI TRUY VẤN
----------------------------------------------------
Có thể đăng ký listener SQLAlchemy để ghi mọi INSERT/UPDATE. Cách đó hấp dẫn
vì "không sót gì", nhưng ở đây nó tệ hơn:

- Sẽ ghi cả những thay đổi không ai cần tra (đọc bảng, cập nhật timestamp nội bộ).
- Dễ nhầm với nhật ký truy cập ở tầng hệ thống — hai thứ khác nhau, khi tra cứu
  sẽ ra kết luận sai.
- Rủi ro về hiệu năng và transaction phức tạp hơn lợi ích ở quy mô này.

Nên ta ghi ở đúng những chỗ cần trả lời câu hỏi "ai đã làm gì": đăng nhập, đổi
mật khẩu, xác minh email, và các thao tác ghi theo vai trò. Chỗ nào CHƯA ghi thì
ghi rõ trong PRODUCTION-CHECKLIST, không để người đọc tưởng đã phủ hết.

QUY TẮC KHÔNG ĐƯỢC PHÁM VỠ
-------------------------
1. Tuyệt đối không ghi mật khẩu, token, mã xác minh, hay nội dung bí mật vào
   `detail`. Nhật ký thường bị đọc bởi nhiều người hơn cả DB chính.
2. `record_audit` không được làm hỏng request: nếu ghi log lỗi thì nuốt lỗi và
   ghi cảnh báo, vì mất một dòng nhật ký còn hơn làm sập chức năng chính.
"""
from __future__ import annotations

import json
import logging
from typing import Any, Optional

from .logging_conf import request_id_ctx

log = logging.getLogger("ftalenthub.audit")

#: Trường không bao giờ được ghi vào `detail`, kể cả khi người gọi truyền vào.
#: So khớp theo tên trường, không phân biệt hoa thường.
FORBIDDEN_DETAIL_KEYS = {
    "password", "new_password", "old_password", "pass", "pwd",
    "token", "access_token", "refresh_token", "secret",
    "authorization", "password_hash", "otp", "code",
}


def _scrub(detail: dict | None) -> dict | None:
    """Bỏ mọi trường có tên nhạy cảm trước khi ghi.

    Thay bằng "[ẩn]" thay vì xoá hẳn: nhờ vậy người đọc nhật ký vẫn thấy chỗ đó
    có dữ liệu, dễ phát hiện nếu sau này thêm nhầm trường mới.
    """
    if not detail:
        return detail
    return {
        k: ("[ẩn]" if k.lower() in FORBIDDEN_DETAIL_KEYS else v)
        for k, v in detail.items()
    }


def record_audit(
    db,
    action: str,
    user=None,
    target: tuple[str, Any] | None = None,
    detail: dict | None = None,
    request=None,
) -> None:
    """Ghi một dòng nhật ký. Không ném lỗi ra ngoài.

    `user` nhận cả model `User` lẫn id int (trường hợp đăng nhập sai thì chưa có
    user nào). `request` là object `fastapi.Request` để lấy IP và user-agent.
    """
    from ..models import AuditLog

    try:
        user_id = getattr(user, "id", user if isinstance(user, int) else None)
        role = getattr(user, "role", None)
        ip = ua = None
        if request is not None:
            ip = _client_ip(request)
            ua = (request.headers.get("user-agent") or "")[:200] or None

        db.add(AuditLog(
            user_id=user_id,
            role=role,
            action=action[:60],
            target_type=(target[0][:40] if target else None),
            target_id=(str(target[1])[:60] if target else None),
            detail=(json.dumps(_scrub(detail), ensure_ascii=False)
                    if detail else None),
            ip=ip,
            user_agent=ua,
            request_id=request_id_ctx.get(),
        ))
        db.commit()
    except Exception:  # noqa: BLE001
        # Nuốt lỗi có chủ đích: mất một dòng nhật ký không được phép làm hỏng
        # chức năng người dùng đang gọi. Ghi cảnh báo để còn điều tra được.
        db.rollback()
        log.warning(
            "không ghi được nhật ký '%s' (coi như chưa ghi): %s", action, exc_info=True
        )


def _client_ip(request) -> str | None:
    """Lấy IP thật của người gọi.

    Ưu tiên X-Forwarded-For vì production chạy sau reverse proxy: `request.client`
    lúc đó luôn là IP của proxy. Chỉ khi proxy KHÔNG được cấu hình thì mới rơi
    về IP kết nối thật — và trường hợp đó được đánh dấu để không ai tưởng đó là
    IP thật của người dùng.
    """
    try:
        xff = request.headers.get("x-forwarded-for")
        if xff:
            return xff.split(",")[0].strip()[:45]
        host = request.client.host if request.client else None
        if host and host in ("127.0.0.1", "::1", "testclient"):
            # Không qua proxy: đây là loopback của chính server, không phải IP
            # người dùng. Ghi rõ thay vì lưu 127.0.0.1 gây hiểu nhầm.
            return f"loopback({host})"
        return (host or None)
    except Exception:  # noqa: BLE001
        return None


def purge_old_audit_logs(db=None, keep_days: int = 180) -> int:
    """Dọn nhật ký cũ hơn `keep_days`. Trả về số dòng đã xoá.

    Giữ mặc định 180 ngày: đủ để tra khiếu nại nội bộ, không để bảng phình vô hạn.
    Đặt `AUDIT_RETENTION_DAYS` nếu quy định pháp lý của bạn yêu cầu khác.
    """
    import os
    from datetime import timedelta

    from ..database import SessionLocal
    from ..models import AuditLog
    from ..security import _utcnow

    try:
        keep_days = int(os.environ.get("AUDIT_RETENTION_DAYS", keep_days))
    except ValueError:
        pass

    own = db is None
    session = db or SessionLocal()
    try:
        cutoff = _utcnow() - timedelta(days=keep_days)
        n = session.query(AuditLog).filter(AuditLog.created_at < cutoff).delete(
            synchronize_session=False
        )
        if own:
            session.commit()
        return n
    finally:
        if own:
            session.close()
