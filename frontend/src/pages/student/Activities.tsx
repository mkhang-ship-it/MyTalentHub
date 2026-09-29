import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Check, Search } from "lucide-react";
import { get, post } from "../../api/client";
import { Card, Empty, ErrorBox, PageHeader } from "../../components/ui";
import ActivityCard, { ACTIVITY_FIELD_NAMES } from "../../components/ActivityCard";
import type { StudentActivity } from "../../components/ActivityCard";

export default function Activities() {
  // Danh sách hoạt động lấy từ máy chủ, null nghĩa là đang tải.
  const [data, setData] = useState<StudentActivity[] | null>(null);
  // Lĩnh vực đang lọc và từ khóa tìm kiếm.
  const [field, setField] = useState("");
  const [q, setQ] = useState("");
  // Thông báo lỗi hiển thị tiếng Việt cho người dùng.
  const [error, setError] = useState("");
  // Phản hồi thành công sau đăng ký (đặc tả 02 B4).
  const [thanhCong, setThanhCong] = useState("");
  // Id thẻ đang gọi đăng ký để khóa nút tương ứng.
  const [registeringId, setRegisteringId] = useState<number | null>(null);

  // Tải danh sách hoạt động theo bộ lọc hiện tại.
  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (field) params.set("field", field);
    if (q) params.set("q", q);
    get<StudentActivity[]>(`/student/activities?${params.toString()}`)
      .then(setData)
      .catch(() => setError("Không tải được danh sách hoạt động, bạn thử lại sau nhé."));
  }, [field, q]);

  useEffect(() => {
    load();
  }, [load]);

  // Gửi yêu cầu đăng ký một hoạt động rồi tải lại danh sách.
  const register = async (id: number) => {
    setRegisteringId(id);
    setError("");
    setThanhCong("");
    try {
      await post(`/student/activities/${id}/register`, {});
      setThanhCong("Đăng ký thành công — bạn đã giữ chỗ.");
      load();
    } catch {
      setError("Đăng ký chưa thành công, bạn thử lại sau nhé.");
    } finally {
      setRegisteringId(null);
    }
  };

  // Thử tải lại khi người dùng bấm nút trong hộp lỗi.
  const thuLai = () => {
    setError("");
    setThanhCong("");
    load();
  };

  // Xóa bộ lọc về trạng thái rỗng (đặc tả 02 B7).
  const xoaBoLoc = () => {
    setField("");
    setQ("");
    setThanhCong("");
  };

  // Danh sách nút lọc gồm "Tất cả" và các lĩnh vực có sẵn.
  const filters = ["", ...Object.keys(ACTIVITY_FIELD_NAMES)];

  // Khung đầu trang dùng chung cho mọi trạng thái để không lệch bố cục.
  const khungDauTrang = (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        {/* PageHeader tự mb-6; bọc này triệt margin để hàng chỉ cách 24px.
            Không dùng class override mb-0 vì .mb-6 đứng sau trong stylesheet
            Tailwind nên override sẽ thua — đo computed để chắc (đặc tả 02 B1). */}
        <div className="min-w-0 flex-1 [&>div]:mb-0">
          <PageHeader
            title="Đăng ký hoạt động"
            subtitle="Săn slot các lab, câu lạc bộ, cuộc thi đang mở."
          />
        </div>
        {/* Nhóm nút lọc theo lĩnh vực: chip cao 44, mobile full width. */}
        <div
          className="flex w-full flex-wrap gap-2 md:w-auto"
          role="group"
          aria-label="Lọc theo lĩnh vực"
        >
          {filters.map((f) => {
            const dangChon = field === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setField(f)}
                aria-pressed={dangChon}
                aria-label={f === "" ? "Tất cả lĩnh vực" : `Lĩnh vực ${ACTIVITY_FIELD_NAMES[f]}`}
                className={`inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold border transition-responsive ${
                  dangChon
                    ? "bg-ink text-white border-ink"
                    : "bg-white text-ink-soft border-line-control hover:border-portal hover:text-ink"
                }`}
              >
                {dangChon && <Check size={14} aria-hidden="true" />}
                {f === "" ? "Tất cả" : ACTIVITY_FIELD_NAMES[f]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ô tìm kiếm: cao 44, viền control, focus ring toàn khối (đặc tả 02 B2). */}
      <div className="mb-6 flex h-11 w-full max-w-full items-center border border-line-control bg-white px-3 rounded-[12px] transition-responsive focus-within:border-portal focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--portal)_18%,transparent)] md:max-w-[384px]">
        <label htmlFor="activity-search" className="sr-only">Tìm hoạt động</label>
        <Search size={16} className="shrink-0 text-muted-strong" aria-hidden="true" />
        <input
          id="activity-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm hoạt động theo tên…"
          className="h-[42px] w-full min-w-0 flex-1 bg-transparent px-2 text-sm text-ink outline-none placeholder:text-muted-strong"
          autoComplete="off"
        />
      </div>
    </>
  );

  // Trạng thái đang tải: giữ khung đầu trang, skeleton khớp thẻ thật (đặc tả 02 B5).
  if (!data && !error) {
    return (
      <div>
        {khungDauTrang}
        <div aria-busy="true" aria-label="Đang tải danh sách hoạt động">
          <div
            data-testid="activity-grid"
            className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3 items-stretch"
          >
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex h-full min-w-0 flex-col overflow-hidden rounded-[20px] border border-line bg-white"
                aria-hidden="true"
              >
                {/* Banner đặc (không shimmer nhẹ) cao 84 như thẻ thật */}
                <div className="h-[84px] shrink-0 bg-[#F3ECE3]" />
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex flex-1 flex-col">
                    <div className="skeleton mt-4 h-5 w-[70%] rounded" />
                    <div className="mt-2 space-y-2">
                      <div className="skeleton h-3 w-[55%] rounded" />
                      <div className="skeleton h-3 w-[80%] rounded" />
                      <div className="skeleton h-3 w-[45%] rounded" />
                    </div>
                    <div className="skeleton mt-2 h-2 w-full rounded-full" />
                  </div>
                  <div className="mt-auto shrink-0 pt-4">
                    <div className="skeleton h-11 w-full rounded-[12px]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-sm text-muted-strong">Đang tải danh sách hoạt động…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      {khungDauTrang}

      {/* Hộp lỗi ngay dưới ô tìm kiếm + nút Thử lại secondary h44 (đặc tả 02 B3). */}
      {error && (
        <div className="mb-4">
          <ErrorBox message={error} />
          <button
            type="button"
            onClick={thuLai}
            className="btn-secondary mt-3 h-11 px-5"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Phản hồi thành công sau đăng ký (đặc tả 02 B4). */}
      {thanhCong && !error && (
        <p role="status" aria-live="polite" className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#047857]">
          <Check size={16} aria-hidden="true" />
          {thanhCong}
        </p>
      )}

      {/* Trạng thái rỗng + nút xóa bộ lọc (đặc tả 02 B7). */}
      {data && data.length === 0 ? (
        <Empty
          text="Chưa có hoạt động nào, bạn thử đổi từ khóa hoặc lĩnh vực khác nhé."
          icon={<CalendarDays size={32} aria-hidden="true" />}
          action={
            <button type="button" onClick={xoaBoLoc} className="btn-secondary h-11 px-5">
              Xóa bộ lọc
            </button>
          }
        />
      ) : (
        // Lưới co giãn đều chiều cao, mỗi thẻ tự cao bằng nhau nhờ h-full bên trong.
        <div
          data-testid="activity-grid"
          className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3 items-stretch"
        >
          {(data ?? []).map((a) => (
            <ActivityCard
              key={a.id}
              hoatDong={a}
              dangDangKy={registeringId === a.id}
              khiDangKy={register}
            />
          ))}
        </div>
      )}

      {/* Banner tham gia: bỏ interactive, icon brand-soft (đặc tả 02 B9h). */}
      <Card className="mt-8">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            <CalendarDays size={22} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="text-base font-bold text-ink">Tham gia – Trải nghiệm – Phát triển</div>
            <p className="mt-1 text-sm leading-relaxed text-muted-strong">
              Tham gia các hoạt động phù hợp với sở thích để nâng cao kỹ năng mỗi ngày.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
