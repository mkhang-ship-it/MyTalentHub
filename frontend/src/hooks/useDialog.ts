import { useEffect, useRef, type RefObject } from "react";

/**
 * useDialogA11y — chuẩn a11y cho hộp thoại (role="dialog" + aria-modal="true"):
 *
 * 1. Focus trap: giữ tiêu điểm (Tab / Shift+Tab) luân chuyển DẦN TRONG hộp thoại,
 *    kể cả khi tiêu điểm bị lọt ra ngoài.
 * 2. Đóng bằng phím Escape (gọi onClose).
 * 3. Lưu tiêu điểm ngay khi mở và TRẢ TIẾU ĐIỂM về phần tử đã mở hộp thoại khi đóng.
 *
 * Cách dùng:
 *   const ref = useDialogA11y(isOpen, () => setIsOpen(false));
 *   return isOpen && <div ref={ref} role="dialog" aria-modal="true">...</div>;
 *
 * `isOpen` phải trùng với điều kiện render của hộp thoại để effect kịp
 * lưu/trả tiêu điểm. Không đổi layout, không đổi nội dung hiển thị.
 */

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

export function useDialogA11y<T extends HTMLElement = HTMLDivElement>(
  isOpen: boolean,
  onClose: () => void
): RefObject<T> {
  const dialogRef = useRef<T | null>(null);
  const onCloseRef = useRef(onClose);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  // Luôn gọi callback mới nhất mà không re-run effect (tránh vòng lặp focus).
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    // Tiêu điểm đang đứng trên nút mở hộp thoại → lưu lại để trả về khi đóng.
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const dialog = dialogRef.current;

    const focusables = (): HTMLElement[] => {
      if (!dialog) return [];
      return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute("disabled") && el.getClientRects().length > 0
      );
    };

    // Đưa tiêu điểm vào ngay khi hộp thoại mở (phần tử focusable đầu tiên).
    const first = focusables()[0];
    (first ?? dialog)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const items = focusables();
      if (items.length === 0) return;

      const active = document.activeElement;
      const inside = active instanceof Node && !!dialog && dialog.contains(active);

      if (event.shiftKey) {
        // Shift+Tab ở phần tử đầu (hoặc lọt ngoài) → vòng về cuối.
        if (!inside || active === items[0]) {
          event.preventDefault();
          items[items.length - 1].focus();
        }
      } else if (!inside || active === items[items.length - 1]) {
        // Tab ở phần tử cuối (hoặc lọt ngoài) → vòng về đầu.
        event.preventDefault();
        items[0].focus();
      }
    };

    // Capture phase để bắt được cả khi tiêu điểm nằm ngoài hộp thoại.
    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      // Trả tiêu điểm về nút đã mở hộp thoại.
      const previous = restoreFocusRef.current;
      if (previous && document.contains(previous)) previous.focus();
    };
  }, [isOpen]);

  return dialogRef;
}
