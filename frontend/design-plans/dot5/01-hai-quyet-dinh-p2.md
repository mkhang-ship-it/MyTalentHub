# 01 — HAI QUYẾT ĐỊNH P2 NHƯỜNG LẠI (29/9)

> P2 hỏi: **(1)** radar 11,6px ở 1024 — sửa số trong `dot4/01` hay chấp nhận? **(2)** `gap-8`
> chân thẻ lịch sử mobile — sửa đặc tả thành khít hay giữ? Đều **đã đo**, chốt ở đây,
> file đặc tả **đã sửa** (xem mục 3/4).

---

## QUYẾT ĐỊNH 1 — RADAR: 11,6px KHÔNG CHẤP NHẬN, ĐỔI `SIZE 288 → 272`

### 1.1 Cách đo

Playwright + Chromium, trang `/school/analysis` (tài khoản `bgh@ftalenthub.edu.vn`), script
`/tmp/fth-dot5/measureA.mjs`, số thô `resultsA.json` → `resultsA.json["radar@{vw}"]`:

- `svg = document.querySelector('svg[aria-label*="Bản đồ radar"]')`
- `scale = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width`
- **font hiển thị = `getComputedStyle(text[0]).fontSize × scale`** (độ phủ nhận: `text[0].getBoundingClientRect().width`
  = `text[0].getBBox().width × scale` → 43,078 = 44,628 × 0,9653 ✓ hai cách khớp nhau).

### 1.2 Số đo thật (viewBox **288** — đặc tả cũ, code hiện tại)

| viewport | innerWidth = clientWidth | gridW (pad 32×2) | cột 2 cột, gap 24 | card | **svg** | scale | **font hiển thị** | Kết luận |
|---|---|---|---|---|---|---|---|---|
| **1024** | 1024 | **680** | **328 / 328** | 328 (pad 24×2, viền 1×2) | **278** | 0,9653 | **11,58px** | ❌ <12 (−0,42px / −3,5%) |
| 1440 | 1440 | 1096 | 536 / 536 | 536 | 340 (cap `max-w-[340px]`) | 1,1806 | 14,17px | ✅ |
| 768 | 768 | 720 | 1 cột | 720 | 340 (cap) | 1,1806 | 14,17px | ✅ |
| 390 | 390 | 350 | 1 cột | 350 | 300 | 1,0417 | 12,50px | ✅ |

→ **P2 báo 11,6 đúng tuyệt đối** (11,58 làm tròn). Ảnh đối chiếu: `shots/radar-1024.png`.

### 1.3 Tại sao đặc tả cũ sai (đúng chỗ nào, sai chỗ nào)

| Khâu tính của đặc tả cũ (`dot4/01` B2a-1, câu “696/2 − 48 = 288”) | Thực tế (đo 29/9) | Lệch |
|---|---|---|
| giả định padding nội dung **24** → 1024 − 280 (sidebar) − 48 = **696** | Layout pad **32** → gridW = **680** (main 744 − 64) | −16 |
| cột = 696/2 − 48 (chỉ trừ padding card) | cột = (680 − 24)/2 = **328** → inner = 328 − 48 − **2 (viền 1×2)** = **278** | −10 |
| → 288, scale 1,00, font 12,0 | → 278, scale 0,9653, font **11,58** | **−0,42px** |

Lỗi cộng dồn của 2 khâu: **giả định padding 24 (thực tế 32) + bỏ 2px viền card**.
Lưu ý: scrollbar = overlay trong Chrome đo được (`innerWidth = clientWidth = 1024`) — nếu
Windows scrollbar kẹp 15px thì media `<1024` → 1 cột → svg cap 340 → 14,17px ✅, nên **278 là
trường hợp xấu nhất và cố định**, không phụ thuộc màn hình.

### 1.4 Chốt (đã sửa `dot4/01`)

| Số | Cũ (SIZE 288) | **Mới (SIZE 272)** | Nơi sửa trong `dot4/01` |
|---|---|---|---|
| `SIZE` | 288 | **272** | B2a-1 (dòng 69), AN7 (237), mục G (254) |
| `RADIUS` | 88 | **83** (≈88×272/288 = 83,1) | như trên |
| clamp nhãn x | `[64, 224]` = `[64, SIZE−64]` | **`[64, 208]`** | B2a-8 (dòng 76) |
| clamp nhãn y | `[16, 272]` = `[16, SIZE−16]` | **`[16, 256]`** | như trên |
| offset | `r+30` | **giữ nguyên** `r+30` | — |
| AN16 | “đo, ≥12” | **đã đo 29/9: 11,58 ❌ → chốt 272** | AN16·kết quả (dòng 246+1) |
| bảng responsive (dòng 162) | 302 → 12,6 · 340 → 14,2 · **288 → 12,0** · 340 → 14,2 | **300 → 13,2 · 340 → 15,0 · 278 → 12,3 · 340 → 15,0** | dòng 162 |

**Font hiển thị sau sửa** = `12 × svgW/272` (svgW đo được: 278/340/340/300):

| 1024 | 1440 | 768 | 390 |
|---|---|---|---|
| **12,27 ✅** (dự kiến, P2 đo lại) | 15,00 ✅ | 15,00 ✅ | 13,24 ✅ |

- **Tại sao chọn đổi SIZE thay vì chấp nhận 11,6**: 00/7.1 là quy tắc cứng (chữ <18px phải hiện
  ≥12) — ghi nhận 11,6 = ghi nhận một lỗi vi phạm vào đặc tả, không phải thiết kế xong.
- **Tại sao chọn SIZE chứ không tăng fontSize 12→13**: 13 × 0,9653 = 12,55 cũng qua nhưng rời
  khỏi “12” của 00/6.1; SIZE 272 giữ nguyên 12/600 của nhãn, chỉ co khung — mọi tỉ lệ trong
  radar (vòng, nhãn, clamp) cùng co → không đổi bố cục tương đối.
- **Cách P2 kiểm sau khi sửa** (AN16 số 2): chạy lại `measureA.mjs` → `fontScreen ≥ 12` ở cả 4
  viewport, `getBBox` mọi `<text>` nằm trong viewBox `[0,272]²`.

---

## QUYẾT ĐỊNH 2 — `GAP-8` MOBILE: SỬA THÀNH `GAP-2` (8px)

### 2.1 Cách đo

- **DOM** (`measureA.mjs`): `document.querySelectorAll('[class*="gap-8"]').length` @390.
- **Nguồn**: `grep -rn "gap-8" frontend/src` .
- **Số thật**: `getComputedStyle(group).gap` + `getBoundingClientRect()` nút/thẻ
  (`measureA.mjs` + `measureB/shotB.mjs`, số thô `resultsA/B.json`).
- **Ảnh**: `shots/checkin-390-full.png`, `shots/sponsor-history-item-390.png`.

### 2.2 Bằng chứng

| Đường dẫn | `gap-8` có không? | Bằng chứng | Kết luận |
|---|---|---|---|
| **`/student/checkin` @390** (P2 nêu) | **KHÔNG** | DOM: **0 phần tử** chứa `gap-8`; `grep -n "gap-8" Checkin.tsx` = **0 dòng**; ảnh full-page: card “Lịch sử check-in” chỉ có danh sách `space-y-2`, **không có chân thẻ nút nào** | **Không có gì để sửa ở trang này** — P2 ghi nhầm tọa độ. (Chỉ có `py-8` ở **trạng thái đang tải QR** dòng 181 — là chiều cao skeleton, không liên quan lịch sử.) |
| **`/enterprise/sponsorships` @390 — chân thẻ “Lịch sử tài trợ”** (đúng chỗ P2 tả) | **CÓ** (`Sponsorships.tsx:673`) | `getComputedStyle(group).gap = 32px` với **2 nút 44×44** (Sửa/Xóa, `aria-label` đầy đủ); thẻ 300, nội dung **268** → 32/268 = **11,9%**; ảnh `sponsor-history-item-390.png` thấy rõ 2 nút rời nhau | **Sửa đặc tả `dot4/03` D1: `gap-8` → `gap-2`** |
| Cột so sánh cùng trang / trang kề | bảng ≥768 cùng trang: `gap-2` (`Sponsorships.tsx:617`, 8px) · thẻ talents mobile: `oThaoTac` **`gap-2`** (8px, `Talents.tsx` — code đã khác đặc tả `dot4/02` D1 `gap-8`) | 2 chỗ thật đều **8px** | 32px là outlier, làm 3 nơi lệch nhau |

### 2.3 Chốt (đã sửa 2 file)

1. **`dot4/03-enterprise-sponsorships.md` D1** (dòng 204): `justify-end gap-8` → **`justify-end gap-2`**,
   thêm ghi chú số đo (32px/11,9%; bảng md cùng trang 8px).
2. **`dot4/02-enterprise-talents.md` D1** (dòng ~172): `flex gap-8` → **`flex gap-2`** để **khớp code
   thật** (code đang `gap-2` = 8px — đặc tả cũ 32px sai so với hiện trạng), ghi lý do: 2 nút đã
   `flex-1` full bề rộng, gap 32 sẽ cướp 32px của cả 2 nút trong thẻ 390.

- **Tại sao 8px là đủ**: 2 nút 44×44 (≥24 → ngoại lệ `FixedSize` của WCAG 2.5.8, không cần
  khoảng cách lớn); 8px vẫn tách rõ 2 vùng chạm; 32px = 11,9% bề rộng thẻ làm chân thẻ “rỗng giữa”.
- **Cách P2 kiểm sau khi sửa**: `getComputedStyle(group).gap === "8px"` ở 2 thẻ lịch sử @390;
  tổng bề rộng 2 nút + gap = 96px (trước: 120px), tổng bằng đúng như hàng bảng ≥768.
- **Giữ nguyên**: bố cục `justify-end`, cỡ nút 44, tone Xóa (B7-11) — không đổi gì khác.

---

## 3. TÓM TẮT FILE ĐÃ SỬA (tại chỗ này, không sửa `src/**`)

| File | Sửa gì |
|---|---|
| `dot4/01-school-analysis.md` | 5 chỗ: B2a-1 (SIZE/RADIUS + số đo), B2a-8 (clamp), bảng responsive dòng 162, AN7, mục G; +1 dòng AN16·kết quả |
| `dot4/03-enterprise-sponsorships.md` | D1 `gap-8` → `gap-2` + ghi chú số đo |
| `dot4/02-enterprise-talents.md` | D1 `gap-8` → `gap-2` + ghi chú; E10 → “ĐÃ XONG 29/9” + số đo 493,81px; B6-6 → “ĐÃ ÁP”; header mục E → chỉ sang `dot5/04`; 2 dòng “full-width” → max-w 560 |
