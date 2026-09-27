"""Bộ kiểm thử API FTalentHub — chỉ dùng unittest + thư viện chuẩn (không pytest).

`base` được import ở đây TRƯỚC mọi thứ: nó đặt `DATABASE_URL` trỏ tới bản sao
DB tạm và dựng server test ở cổng riêng. Nhờ vậy test không bao giờ đụng tới
`backend/talenthub.db` hay server đang chạy ở 8001.
"""
from . import base  # noqa: F401  - phải nạp trước, xem base.py

__all__ = ["base"]
