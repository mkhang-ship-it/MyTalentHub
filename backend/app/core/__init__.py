"""Module dùng chung phía backend: xử lý lỗi, logging, phân trang.

KHÔNG import router/model ở đây để tránh vòng lặp import — các router
import từ core, không bao giờ ngược lại.
"""
