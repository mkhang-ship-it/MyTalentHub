"""
Public AI chat endpoint — POST /api/v1/ai/chat/public

Dành cho khách CHƯA đăng nhập (trang chủ công khai). KHÔNG xác thực token.
Vì mở công khai nên có các biện pháp chống lạm dụng: giới hạn độ dài tin nhắn,
giới hạn số lượt lịch sử, và giới hạn tần suất gọi theo địa chỉ IP.
"""

import logging
import time
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from ..ai.service import AIUnavailableError, chat_public

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai-chat"])


# ============================================================
# GIỚI HẠN CHỐNG LẠM DỤNG
# ============================================================

MAX_MESSAGE_LEN = 800          # độ dài tối đa của 1 tin nhắn
MAX_HISTORY_TURNS = 10         # số lượt hội thoại tối đa gửi kèm
RATE_LIMIT_MAX = 20            # số lần gọi tối đa...
RATE_LIMIT_WINDOW_SECONDS = 600  # ...trong 10 phút, tính theo 1 địa chỉ IP

# ---------------------------------------------------------------------------
# BỘ ĐẾM TẦN SUẤT TRONG BỘ NHỚ — BẢN ĐƠN GIẢN, CHỈ DÙNG CHO DEV
# ---------------------------------------------------------------------------
# Đây là cách đếm thô sơ, đủ cho môi trường phát triển 1 tiến trình:
#   * Dữ liệu nằm trong RAM nên mất khi restart, và KHÔNG chia sẻ giữa nhiều
#     worker/instance (mỗi tiến trình đếm riêng → giới hạn bị nhân lên).
#   * Không có cơ chế dọn định kỳ, chỉ dọn lười mỗi lần có request.
# KHI LÊN PRODUCTION PHẢI THAY bằng kho lưu chia sẻ (Redis) + giới hạn theo
# tài khoản/token, nếu không kẻ tấn công chỉ cần đổi IP hoặc gọi vào instance
# khác là vượt được giới hạn.
# ---------------------------------------------------------------------------
_rate_limit_store: Dict[str, List[float]] = {}


def reset_rate_limits() -> None:
    """Xoá toàn bộ bộ đếm tần suất (dùng cho test / thao tác vận hành)."""
    _rate_limit_store.clear()


def _client_ip(request: Request) -> str:
    """Lấy địa chỉ IP của client để tính giới hạn tần suất."""
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def _allow_request(ip: str) -> bool:
    """Trả True nếu IP còn lượt gọi; False nếu đã vượt giới hạn.

    Dùng cửa sổ trượt đơn giản: chỉ giữ các mốc thời gian trong 10 phút gần nhất.
    """
    now = time.time()
    cutoff = now - RATE_LIMIT_WINDOW_SECONDS
    timestamps = [t for t in _rate_limit_store.get(ip, []) if t > cutoff]

    if len(timestamps) >= RATE_LIMIT_MAX:
        _rate_limit_store[ip] = timestamps
        return False

    timestamps.append(now)
    _rate_limit_store[ip] = timestamps
    return True


# ============================================================
# SCHEMA
# ============================================================

class ChatPublicIn(BaseModel):
    """Body của POST /api/v1/ai/chat/public.

    `message` để Optional và tự kiểm tra thủ công, mục đích là trả 400 (đúng
    hợp đồng API) thay vì 422 mặc định của FastAPI khi thiếu trường.
    """
    message: Optional[str] = None
    history: Optional[List[Dict[str, Any]]] = None


# ============================================================
# ENDPOINT
# ============================================================

@router.post("/chat/public")
async def chat_public_endpoint(payload: ChatPublicIn, request: Request):
    """Trả lời câu hỏi của khách chưa đăng nhập bằng Gemini.

    - 400: message rỗng / quá 800 ký tự / lịch sử quá 10 lượt.
    - 429: vượt giới hạn tần suất (20 lần / 10 phút / IP).
    - 503: chưa cấu hình key hoặc AI gặp lỗi.
    """
    # --- 1. Kiểm tra đầu vào (rẻ, chạy trước để không tốn lượt gọi AI) ---
    message = (payload.message or "").strip()
    if not message:
        raise HTTPException(400, "Nội dung tin nhắn không được để trống.")
    if len(message) > MAX_MESSAGE_LEN:
        raise HTTPException(
            400, f"Tin nhắn quá dài, vui lòng rút gọn dưới {MAX_MESSAGE_LEN} ký tự."
        )

    history = payload.history or []
    if len(history) > MAX_HISTORY_TURNS:
        raise HTTPException(
            400, f"Lịch sử hội thoại quá dài, tối đa {MAX_HISTORY_TURNS} lượt."
        )

    # Chuẩn hoá lịch sử: chỉ giữ role + content dạng chuỗi, bỏ lượt rỗng.
    clean_history: List[Dict[str, str]] = []
    for turn in history:
        if not isinstance(turn, dict):
            continue
        content = str(turn.get("content") or "").strip()
        if not content:
            continue
        role = "user" if turn.get("role") == "user" else "assistant"
        clean_history.append({"role": role, "content": content})

    # --- 2. Giới hạn tần suất theo IP ---
    ip = _client_ip(request)
    if not _allow_request(ip):
        raise HTTPException(
            429, "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau ít phút."
        )

    # --- 3. Gọi AI. Mọi lỗi đều quy về 503, KHÔNG để lộ key/stack trace. ---
    try:
        reply = await chat_public(message, clean_history)
    except AIUnavailableError as exc:
        # Thông báo đã được viết an toàn ở tầng service.
        raise HTTPException(503, str(exc))
    except Exception:
        # Log đầy đủ ở server để còn điều tra; client chỉ thấy câu chung.
        logger.exception("Lỗi không mong đợi ở endpoint chat công khai")
        raise HTTPException(503, "Trợ lý AI đang bận, vui lòng thử lại sau.")

    return {"reply": reply}
