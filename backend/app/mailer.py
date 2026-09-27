"""Gửi thư: link xác minh email và đặt lại mật khẩu.

Hai chế độ, chọn theo cấu hình:

1. Có SMTP_HOST → gửi mail thật qua SMTP.
2. Không có SMTP và MAIL_TO_OUTBOX=true (mặc định khi dev/test) → ghi thư vào
   `backend/outbox/*.html`. Đủ để chạy và kiểm thử toàn bộ luồng mà không cần
   dựng hạ tầng mail.

Cảnh báo thật sự liên quan tới bảo mật: link đặt lại mật khẩu là bí mật, ai có
link là đổi được mật khẩu. Vì vậy ở production phải đặt SMTP thật và
MAIL_TO_OUTBOX=false, nếu không link sẽ nằm trong thư mục bị đọc lỗi.
"""
from __future__ import annotations

import logging
import os
import smtplib
import ssl
from datetime import datetime
from email.message import EmailMessage

from .config import (
    MAIL_OUTBOX,
    MAIL_TO_OUTBOX,
    SMTP_FROM,
    SMTP_HOST,
    SMTP_PASSWORD,
    SMTP_PORT,
    SMTP_USER,
)

log = logging.getLogger("ftalenthub")

#: Đuôi file thư trong outbox, phân biệt với file tạm.
SUBJECTS = {
    "verify": "Xác minh địa chỉ email FTalentHub",
    "reset": "Đặt lại mật khẩu FTalentHub",
}


def mail_transport() -> str:
    """'smtp' nếu có cấu hình SMTP, còn không thì 'outbox'."""
    return "smtp" if SMTP_HOST else "outbox"


def _send_via_smtp(to: str, subject: str, html: str) -> None:
    msg = EmailMessage()
    msg["From"] = SMTP_FROM
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(
        "Trình duyệt của bạn không hiển thị HTML. Mở liên kết sau:\n\n"
        + _extract_link(html),
    )
    msg.add_alternative(html, subtype="html")

    ctx = ssl.create_default_context()
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as smtp:
        smtp.starttls(context=ctx)
        if SMTP_USER:
            smtp.login(SMTP_USER, SMTP_PASSWORD)
        smtp.send_message(msg)
    log.info("Đã gửi thư %s qua SMTP tới %s", SUBJECTS.get(subject, subject), to)


def _write_to_outbox(to: str, kind: str, subject: str, html: str) -> str:
    MAIL_OUTBOX.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S-%f")
    safe = "".join(c for c in to if c.isalnum() or c in "._-@")[:60]
    path = MAIL_OUTBOX / f"{stamp}-{kind}-{safe}.html"
    # 0600: file này chứa link đặt lại mật khẩu, không ai ngoài chủ sở hữu được đọc.
    path.write_text(
        f"<!-- Gửi tới: {to} · {datetime.now().isoformat(timespec='seconds')} -->\n"
        f"{html}\n",
        encoding="utf-8",
    )
    os.chmod(path, 0o600)
    log.warning(
        "MAIL_TO_OUTBOX=true — thư '%s' ghi ra %s thay vì gửi đi. "
        "Đặt SMTP_HOST và MAIL_TO_OUTBOX=false ở production.",
        kind, path,
    )
    return str(path)


def _extract_link(html: str) -> str:
    """Lấy URL đầu tiên trong thư để nhét vào phần bản chữ."""
    import re
    m = re.search(r'href="(http[^"]+)"', html)
    return m.group(1) if m else ""


def _template(title: str, intro: str, link: str, cta: str, note: str) -> str:
    """Khuôn thư HTML. Dùng table + inline CSS vì nhiều ứng dụng thư chặn CSS."""
    return f"""<!doctype html>
<html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title></head>
<body style="margin:0;padding:24px;background:#f4f6fb;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#1f2937">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:14px;padding:32px;border:1px solid #e5e7eb">
  <tr><td style="font-size:20px;font-weight:700;padding-bottom:8px">FTalentHub</td></tr>
  <tr><td style="font-size:16px;font-weight:600;padding-bottom:12px">{title}</td></tr>
  <tr><td style="font-size:14px;line-height:1.6;padding-bottom:20px">{intro}</td></tr>
  <tr><td style="padding-bottom:20px">
    <a href="{link}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;
       padding:12px 22px;border-radius:10px;font-size:15px;font-weight:600">{cta}</a>
  </td></tr>
  <tr><td style="font-size:12px;line-height:1.6;color:#6b7280;word-break:break-all">
    Nếu nút không bấm được, dán liên kết sau vào trình duyệt:<br>{link}
  </td></tr>
  <tr><td style="font-size:12px;line-height:1.6;color:#9ca3af;padding-top:20px;border-top:1px solid #f3f4f6">{note}</td></tr>
</table></td></tr></table>
</body></html>"""


def send_verify_email(to: str, link: str) -> str:
    html = _template(
        SUBJECTS["verify"],
        "Cảm ơn bạn đã đăng ký tài khoản FTalentHub. Xác minh địa chỉ email này "
        "để hoàn tất việc đăng ký và kích hoạt đầy đủ các tính năng.",
        link,
        "Xác minh email",
        "Bạn nhận được thư này mà không tự đăng ký? Hãy bỏ qua — không cần làm gì.",
    )
    if SMTP_HOST:
        _send_via_smtp(to, "verify", html)
        return "smtp"
    return _write_to_outbox(to, "verify", "verify", html)


def send_reset_email(to: str, link: str) -> str:
    html = _template(
        SUBJECTS["reset"],
        "Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản này. "
        "Bấm nút bên dưới để chọn mật khẩu mới.",
        link,
        "Đặt lại mật khẩu",
        "Link chỉ dùng được một lần và có thời hạn ngắn. Nếu bạn không tự yêu cầu, "
        "hãy bỏ qua thư này — mật khẩu của bạn vẫn không thay đổi.",
    )
    if SMTP_HOST:
        _send_via_smtp(to, "reset", html)
        return "smtp"
    return _write_to_outbox(to, "reset", "reset", html)
