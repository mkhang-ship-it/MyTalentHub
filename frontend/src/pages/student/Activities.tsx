import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Search } from "lucide-react";
import { get, post } from "../../api/client";
import { Card, Empty, ErrorBox, Loading, PageHeader } from "../../components/ui";
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
    try {
      await post(`/student/activities/${id}/register`, {});
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
    load();
  };

  // Danh sách nút lọc gồm "Tất cả" và các lĩnh vực có sẵn.
  const filters = ["", ...Object.keys(ACTIVITY_FIELD_NAMES)];

  // Khung đầu trang dùng chung cho mọi trạng thái để không lệch bố cục.
  const khungDauTrang = (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <PageHeader
          title="Đăng ký hoạt động"
          subtitle="Săn slot các lab, câu lạc bộ, cuộc thi đang mở."
        />
        {/* Nhóm nút lọc theo lĩnh vực. */}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc theo lĩnh vực">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setField(f)}
              aria-pressed={field === f}
              aria-label={f === "" ? "Tất cả lĩnh vực" : `Lĩnh vực ${ACTIVITY_FIELD_NAMES[f]}`}
              className={`text-xs px-3.5 py-1.5 rounded-full font-semibold border transition-responsive ${
                field === f
                  ? "bg-ink text-white border-ink"
                  : "bg-white text-muted border-line hover:border-portal"
              }`}
            >
              {f === "" ? "Tất cả" : ACTIVITY_FIELD_NAMES[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Ô tìm kiếm hoạt động theo tên. */}
      <div className="flex rounded-xl bg-white border border-line overflow-hidden items-center px-3 mb-6 max-w-sm">
        <label htmlFor="activity-search" className="sr-only">
          Tìm hoạt động
        </label>
        <Search size={15} className="text-muted-light" aria-hidden="true" />
        <input
          id="activity-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm hoạt động..."
          className="px-2 py-2 text-sm outline-none w-full bg-transparent"
          autoComplete="off"
        />
      </div>
    </>
  );

  // Trạng thái đang tải: giữ đầu trang, hiển thị con quay ở giữa.
  if (!data && !error) {
    return (
      <div>
        {khungDauTrang}
        <Loading label="Đang tải danh sách hoạt động..." />
      </div>
    );
  }

  return (
    <div className="min-w-0">
      {khungDauTrang}

      {/* Hộp lỗi nằm ngay dưới bộ lọc, có nút thử lại, không che bố cục lưới. */}
      {error && (
        <div className="mb-4">
          <ErrorBox message={error} />
          <button
            type="button"
            onClick={thuLai}
            className="mt-2 text-sm px-4 h-9 rounded-full font-semibold bg-white border border-line text-ink hover:border-portal"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Trạng thái rỗng đặt đúng chỗ dưới bộ lọc, không làm lệch lưới. */}
      {data && data.length === 0 ? (
        <Empty text="Chưa có hoạt động nào, bạn thử đổi từ khóa hoặc lĩnh vực khác nhé." />
      ) : (
        // Lưới co giãn đều chiều cao, mỗi thẻ tự cao bằng nhau nhờ h-full bên trong.
        <div
          data-testid="activity-grid"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch"
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

      {/* Banner tham gia đặt cuối trang, tách khỏi lưới thẻ. */}
      <Card interactive reveal revealDelay={0.15} className="mt-6 transition-responsive">
        <div className="flex items-center gap-4">
          <span className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 text-white flex items-center justify-center">
            <CalendarDays size={22} />
          </span>
          <div className="min-w-0">
            <div className="font-bold text-ink">Tham gia – Trải nghiệm – Phát triển</div>
            <p className="text-sm text-muted">
              Tham gia các hoạt động phù hợp với sở thích để nâng cao kỹ năng mỗi ngày.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
