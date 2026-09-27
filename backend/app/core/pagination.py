"""Phân trang dùng chung cho endpoint danh sách dài.

Giữ hành vi cũ khi không truyền `limit` (trả về TẤT CẢ) để không phá test và
client hiện có — chỉ cắt trang khi caller truyền limit rõ ràng.
"""
from __future__ import annotations

from typing import Sequence

#: Trần cứng cho tham số `limit` của mọi endpoint phân trang.
MAX_LIMIT = 200


def paginate(query, limit: int | None, offset: int = 0, max_limit: int = MAX_LIMIT,
             default_limit: int = 50) -> tuple[list, int]:
    """Cắt trang truy vấn/danh sách. Trả về (danh sách trang này, tổng số).

    - `query`: SQLAlchemy Query (có .count/.offset/.limit/.all) hoặc Sequence
      đã materialize (dùng khi tổng hợp trong Python như /teacher/my-students).
    - `limit=None` → trả TẤT CẢ, bỏ qua offset (hành vi cũ).
    - `limit` số → kẹp về tối đa `max_limit` (limit=9999 chỉ trả 200).
    - `offset` âm được coi như 0. `default_limit` dành cho caller muốn kích
      thước trang mặc định khi tự diễn giải limit=None (endpoint hiện tại
      không dùng — vẫn trả tất cả).
    """
    if offset is None or offset < 0:
        offset = 0
    if hasattr(query, "offset") and hasattr(query, "all"):
        total = query.order_by(None).count()
        if limit is None:
            return query.all(), total
        return query.offset(offset).limit(min(limit, max_limit)).all(), total
    seq = list(query) if not isinstance(query, list) else query
    total = len(seq)
    if limit is None:
        return seq, total
    return seq[offset:offset + min(limit, max_limit)], total
