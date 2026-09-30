import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Trophy } from "lucide-react";
import BieuDoCot from "../../components/chart/BieuDoCot";
import ThanhXepHang from "../../components/chart/ThanhXepHang";
import { get } from "../../api/client";
import { Card, Empty, ErrorBox, PageHeader } from "../../components/ui";

interface Analysis {
  skill_map: { name: string; code: string; avg_score: number }[];
  grade_ranking: { grade: number; avg_score: number; count: number; hours: number }[];
  top_students: {
    id: number;
    full_name: string;
    class_name: string;
    grade: number;
    talent_score: number;
    hours: number;
  }[];
}

// viewBox radar 272 = cột hẹp nhất render 278px, font 12 hiện 12,27px (quyết định dot5/01).
const SIZE = 272;
const CENTER = SIZE / 2;
const RADIUS = 83;

function polar(i: number, n: number, r: number): [number, number] {
  const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
  return [CENTER + r * Math.cos(angle), CENTER + r * Math.sin(angle)];
}

/** Dịch lỗi API sang tiếng Việt (giữ cách làm của Dashboard). */
function loiTiengViet(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("→ 401")) return "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại để xem phân tích.";
  if (msg.includes("→ 403")) return "Bạn cần đăng nhập bằng tài khoản nhà trường để xem phân tích.";
  return "Không tải được phân tích, bạn thử lại sau nhé.";
}

export default function Analysis() {
  const [data, setData] = useState<Analysis | null>(null);
  const [error, setError] = useState("");

  // Tải phân tích (tách riêng để nút "Thử lại" gọi lại được).
  const load = useCallback(() => {
    setError("");
    get<Analysis>("/school/analysis").then(setData).catch((e) => setError(loiTiengViet(e)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const khungTrang = (noiDung: React.ReactNode) => (
    <div>
      <PageHeader
        title="Phân tích năng lực học sinh"
        subtitle="So sánh năng khiếu theo khối, lớp và các nhóm ngành."
      />
      {noiDung}
    </div>
  );

  if (error) {
    return khungTrang(
      <ErrorBox message={error} retryLabel="Thử lại" onRetry={load} />
    );
  }

  if (!data) {
    return khungTrang(
      <div aria-busy="true" aria-label="Đang tải phân tích">
        <div className="skeleton mx-auto h-7 w-[260px] rounded" aria-hidden="true" />
        <div className="skeleton mx-auto mt-2 h-3.5 w-full rounded" aria-hidden="true" />
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className="skeleton h-[400px] rounded-[20px]" aria-hidden="true" />
          <div className="skeleton h-[400px] rounded-[20px]" aria-hidden="true" />
        </div>
        <div className="skeleton mt-8 h-[280px] rounded-[20px]" aria-hidden="true" />
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className="skeleton h-[340px] rounded-[20px]" aria-hidden="true" />
          <div className="skeleton h-[340px] rounded-[20px]" aria-hidden="true" />
        </div>
        <p className="mt-4 text-center text-sm text-muted-strong">Đang tải phân tích…</p>
      </div>
    );
  }

  const n = Math.max(data.skill_map.length, 3);
  const rings = [0.25, 0.5, 0.75, 1];
  const valuePts = data.skill_map
    .map((s, i) => polar(i, n, (Math.min(100, s.avg_score) / 100) * RADIUS).join(","))
    .join(" ");

  // Mô tả radar cho trình đọc màn hình (giữ role=img + aria-label + desc + tabIndex).
  const radarAriaLabel = `Bản đồ radar năng khiếu toàn trường: ${data.skill_map.map(s => `${s.name} ${s.avg_score} điểm`).join(", ")}`;

  // Tóm tắt bằng chữ từ số liệu API thật: tổng HS, điểm TB có trọng số, kỹ năng cao nhất.
  const tongHS = data.grade_ranking.reduce((tong, g) => tong + g.count, 0);
  const diemTB = tongHS > 0
    ? data.grade_ranking.reduce((tong, g) => tong + g.avg_score * g.count, 0) / tongHS
    : 0;
  const sapXepKyNang = [...data.skill_map].sort((a, b) => b.avg_score - a.avg_score);
  const kyNangCaoNhat = sapXepKyNang[0];
  const kyNangThapNhat = [...data.skill_map].sort((a, b) => a.avg_score - b.avg_score)[0];
  const khoiChinh = data.grade_ranking.filter((g) => g.grade >= 10 && g.grade <= 12).map((g) => g.grade).sort((a, b) => a - b);
  // Khối ngoài 10–12 (ví dụ "Khối 6" 1 HS điểm 0) là dấu hiệu dữ liệu lỗi: phơi bày, không giấu.
  const khoiLa = data.grade_ranking.filter((g) => g.grade < 10 || g.grade > 12);
  const tomTatTruong = tongHS === 0
    ? "Chưa có dữ liệu học sinh để tóm tắt."
    : `${tongHS} học sinh${khoiChinh.length > 0 ? ` (Khối ${khoiChinh.join(", ")})` : ""}, ` +
      `điểm năng lực trung bình ${diemTB.toFixed(1)}; kỹ năng trung bình cao nhất toàn trường: ` +
      `${kyNangCaoNhat ? `${kyNangCaoNhat.name} (${kyNangCaoNhat.avg_score} điểm)` : "chưa đủ dữ liệu"}.`;

  // Dòng "rồi sao?" cho từng khối (chỉ khi đủ dữ liệu).
  const xepHangSapXep = [...data.grade_ranking].sort((a, b) => b.avg_score - a.avg_score);
  const dongRoiSaoXepHang = xepHangSapXep.length >= 2
    ? `Khối ${xepHangSapXep[0].grade} cao nhất ${xepHangSapXep[0].avg_score} điểm · Khối ${xepHangSapXep[xepHangSapXep.length - 1].grade} thấp nhất ${xepHangSapXep[xepHangSapXep.length - 1].avg_score} điểm · chênh ${(xepHangSapXep[0].avg_score - xepHangSapXep[xepHangSapXep.length - 1].avg_score).toFixed(1)} điểm.`
    : null;
  const dongRoiSaoRadar = data.skill_map.length >= 2 && kyNangCaoNhat && kyNangThapNhat
    ? `Ưu tiên bồi dưỡng: ${kyNangThapNhat.name} (${kyNangThapNhat.avg_score} điểm) — thấp hơn ${kyNangCaoNhat.name} ${(kyNangCaoNhat.avg_score - kyNangThapNhat.avg_score).toFixed(1)} điểm.`
    : data.skill_map.length === 1
      ? "Chưa đủ dữ liệu để so sánh kỹ năng."
      : null;
  const topDiemCao = data.top_students.length > 0 ? Math.max(...data.top_students.map((s) => s.talent_score)) : 0;
  const topDiemThap = data.top_students.length > 0 ? Math.min(...data.top_students.map((s) => s.talent_score)) : 0;
  const topTongGio = data.top_students.reduce((tong, s) => tong + s.hours, 0);
  const dongRoiSaoTop = data.top_students.length > 0
    ? `${data.top_students.length} em điểm cao nhất — điểm cao ${topDiemCao} · thấp nhất trong danh sách ${topDiemThap} · tổng ${topTongGio} giờ trải nghiệm.`
    : null;

  return khungTrang(
    <div className="space-y-8">
      {/* Animation vẽ radar: tắt hẳn khi reduced-motion, đa giác luôn thấy (offset 0). */}
      <style>{`
        @keyframes drawRadar {
          from { stroke-dashoffset: 200; opacity: 0; }
          to { stroke-dashoffset: 0; opacity: 1; }
        }
        .radar-ve {
          animation: drawRadar 1.2s ease-out 0.3s both;
        }
        @media (prefers-reduced-motion: reduce) {
          .radar-ve {
            animation: none;
          }
        }
      `}</style>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-portal" aria-hidden="true" />
            <h2 className="text-lg font-bold text-ink">Bản đồ năng khiếu toàn trường</h2>
          </div>
          {data.skill_map.length === 0 ? (
            <Empty text="Chưa có dữ liệu kỹ năng của toàn trường." icon={<BarChart3 size={32} aria-hidden="true" />} />
          ) : (
            <>
              <svg
                viewBox={`0 0 ${SIZE} ${SIZE}`}
                className="w-full max-w-[340px] mx-auto"
                role="img"
                aria-label={radarAriaLabel}
                aria-describedby="radar-chart-desc"
                tabIndex={0}
              >
                <title>Bản đồ radar năng khiếu toàn trường</title>
                <desc id="radar-chart-desc">{radarAriaLabel}</desc>
                {rings.map((r) => (
                  <polygon
                    key={r}
                    points={data.skill_map.map((_, i) => polar(i, n, RADIUS * r).join(",")).join(" ")}
                    fill="none"
                    stroke="#ede7e1"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                ))}
                {data.skill_map.map((s, i) => {
                  const [x, y] = polar(i, n, RADIUS);
                  let [lx, ly] = polar(i, n, RADIUS + 30);
                  const align = lx < CENTER - 20 ? "end" : lx > CENTER + 20 ? "start" : "middle";
                  lx = Math.max(64, Math.min(SIZE - 64, lx));
                  ly = Math.max(16, Math.min(SIZE - 16, ly));
                  // Nhãn dài (2 từ trở lên) tách 2 dòng, không cắt chữ.
                  const nameParts = s.name.split(" ");
                  return (
                    <g key={s.code}>
                      <line x1={CENTER} y1={CENTER} x2={x} y2={y} stroke="#cfc6bc" strokeWidth="1" />
                      <circle cx={x} cy={y} r="4" fill="#1B2A5E" />
                      {nameParts.length > 1 ? (
                        <>
                          <text x={lx} y={ly - 6} textAnchor={align} fontSize="12" fontWeight="600" fill="var(--ink-soft)">{nameParts[0]}</text>
                          <text x={lx} y={ly + 5} textAnchor={align} fontSize="12" fontWeight="600" fill="var(--ink-soft)">{nameParts.slice(1).join(" ")}</text>
                        </>
                      ) : (
                        <text x={lx} y={ly - 2} textAnchor={align} fontSize="12" fontWeight="600" fill="var(--ink-soft)">{s.name}</text>
                      )}
                      <text x={lx} y={ly + (nameParts.length > 1 ? 17 : 11)} textAnchor={align} fontSize="12" fontWeight="700" fill="var(--ink)">{s.avg_score}</text>
                    </g>
                  );
                })}
                <polygon
                  points={valuePts}
                  fill="rgba(27,42,94,.15)"
                  stroke="#1B2A5E"
                  strokeWidth="2.5"
                  strokeDasharray="200"
                  strokeDashoffset="0"
                  className="radar-ve"
                />
              </svg>
              <p className="text-xs text-muted-strong text-center mt-1">Điểm trung bình thang 100 từ dữ liệu kỹ năng học sinh.</p>
              {dongRoiSaoRadar && (
                <p className="mt-2 text-sm leading-relaxed text-ink-soft text-center">{dongRoiSaoRadar}</p>
              )}
            </>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-ink mb-1">Bảng xếp hạng khối</h2>
          {dongRoiSaoXepHang && (
            <p className="mb-3 text-sm leading-relaxed text-ink-soft">{dongRoiSaoXepHang}</p>
          )}
          {data.grade_ranking.length === 0 ? (
            <Empty text="Chưa có dữ liệu điểm theo khối." icon={<BarChart3 size={32} aria-hidden="true" />} />
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto" role="region" aria-label="Bảng xếp hạng khối" tabIndex={0}>
                <table className="w-full text-sm tabular-nums">
                  <thead>
                    <tr className="text-left text-xs font-bold uppercase tracking-[0.06em] text-muted-strong border-b border-line-strong">
                      <th scope="col" className="px-3 py-2.5 rounded-l-lg">#</th>
                      <th scope="col" className="px-3 py-2.5">Khối</th>
                      <th scope="col" className="px-3 py-2.5">Hoạt động & HS</th>
                      <th scope="col" className="px-3 py-2.5 text-right rounded-r-lg">Điểm TB</th>
                    </tr>
                  </thead>
                  <tbody>
                    {xepHangSapXep.map((g, i) => (
                      <tr key={g.grade} className="border-b border-line min-h-[44px] hover:bg-portal-soft/40 transition-colors duration-150 ease-out">
                        <td className="px-3 py-3">
                          <span
                            className={`h-6 w-6 rounded-full inline-flex items-center justify-center text-xs font-semibold ${
                              i === 0 ? "bg-portal-soft text-portal-dark" : "bg-canvas-soft border border-line-strong text-ink-soft"
                            }`}
                            aria-label={`Hạng ${i + 1}`}
                          >
                            {i + 1}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-semibold text-ink">Khối {g.grade}</td>
                        <td className="px-3 py-3 text-sm text-ink">{g.hours}h hoạt động · {g.count} học sinh</td>
                        <td className="px-3 py-3 text-right">
                          <div className="text-sm font-bold tabular-nums text-ink">
                            {g.avg_score}
                          </div>
                          <div className="text-xs text-muted-strong">điểm</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Danh sách thẻ dọc dưới 768px (00/4.7). */}
              <div className="space-y-3 md:hidden" role="list" aria-label="Xếp hạng khối">
                {xepHangSapXep.map((g, i) => (
                  <div key={g.grade} role="listitem" className="rounded-2xl border border-line bg-white p-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-6 w-6 rounded-full inline-flex items-center justify-center text-xs font-semibold ${
                          i === 0 ? "bg-portal-soft text-portal-dark" : "bg-canvas-soft border border-line-strong text-ink-soft"
                        }`}
                        aria-label={`Hạng ${i + 1}`}
                      >
                        {i + 1}
                      </span>
                      <span className="text-sm font-semibold text-ink">Khối {g.grade}</span>
                      <span className="ml-auto text-base font-bold tabular-nums text-ink">{g.avg_score}</span>
                      <span className="text-xs text-muted-strong">điểm</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-muted-strong">Hoạt động & HS</span>
                      <span className="text-sm font-semibold text-ink">{g.hours}h · {g.count} học sinh</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          <div className="mt-4 text-right">
            <Link to="/school/classes" className="text-sm font-semibold text-portal-dark hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 rounded">
              Xem chi tiết bảng xếp hạng →
            </Link>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-1">
          <Trophy size={18} className="text-portal-dark" aria-hidden="true" />
          <h2 className="text-lg font-bold text-ink">Top học sinh nổi bật</h2>
          <span className="text-xs font-semibold text-muted-strong ml-auto">Bấm để xem Talent Passport</span>
        </div>
        {dongRoiSaoTop && (
          <p className="mb-2 text-sm leading-relaxed text-ink-soft">{dongRoiSaoTop}</p>
        )}
        {data.top_students.length === 0 ? (
          <Empty text="Chưa có học sinh nào trong danh sách nổi bật." icon={<Trophy size={32} aria-hidden="true" />} />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto" role="region" aria-label="Top học sinh nổi bật" tabIndex={0}>
              <table className="w-full text-sm tabular-nums">
                <thead>
                  <tr className="text-left text-xs font-bold uppercase tracking-[0.06em] text-muted-strong border-b border-line-strong">
                    <th scope="col" className="px-3 py-2.5 rounded-l-lg">#</th>
                    <th scope="col" className="px-3 py-2.5">Học sinh</th>
                    <th scope="col" className="px-3 py-2.5">Lớp</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Điểm năng lực</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Giờ trải nghiệm</th>
                    <th scope="col" className="px-3 py-2.5 text-right rounded-r-lg"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_students.map((s, i) => (
                    <tr key={s.id} className="border-b border-line min-h-[44px] hover:bg-portal-soft/40 transition-colors duration-150 ease-out">
                      <td className="px-3 py-3">
                        <span className="text-xs font-bold text-muted-strong tabular-nums w-4" aria-label={`Hạng ${i + 1}`}>{i + 1}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-portal-dark text-white flex items-center justify-center text-xs font-bold" aria-hidden="true">
                            {s.full_name.charAt(0)}
                          </div>
                          <span className="text-sm font-semibold text-ink">{s.full_name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm text-ink">{s.class_name} · Khối {s.grade}</td>
                      <td className="px-3 py-3 text-right text-sm font-bold text-portal-dark tabular-nums">{s.talent_score}</td>
                      <td className="px-3 py-3 text-right text-sm font-semibold text-ink tabular-nums">{s.hours}h</td>
                      <td className="px-3 py-3 text-right">
                        <Link to={`/passport/${s.id}`} className="text-xs font-semibold text-portal-dark hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 rounded">
                          Xem passport →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Danh sách thẻ dọc dưới 768px (00/4.7). */}
            <div className="space-y-3 md:hidden" role="list" aria-label="Top học sinh nổi bật">
              {data.top_students.map((s) => (
                <div key={s.id} role="listitem" className="rounded-2xl border border-line bg-white p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-portal-dark text-white flex items-center justify-center text-xs font-bold" aria-hidden="true">
                      {s.full_name.charAt(0)}
                    </div>
                    <span className="text-sm font-semibold text-ink">{s.full_name}</span>
                  </div>
                  <dl className="mt-2 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-xs font-semibold text-muted-strong">Lớp</dt>
                      <dd className="text-sm font-semibold text-ink">{s.class_name} · Khối {s.grade}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-xs font-semibold text-muted-strong">Điểm năng lực</dt>
                      <dd className="text-sm font-bold tabular-nums text-portal-dark">{s.talent_score}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-xs font-semibold text-muted-strong">Giờ trải nghiệm</dt>
                      <dd className="text-sm font-semibold tabular-nums text-ink">{s.hours}h</dd>
                    </div>
                  </dl>
                  <Link
                    to={`/passport/${s.id}`}
                    className="mt-2 inline-flex min-h-[44px] items-center text-sm font-semibold text-portal-dark hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 rounded"
                  >
                    Xem passport →
                  </Link>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
      {/* Phân bố khối + xếp hạng kỹ năng: mỗi cột/thanh là một con số thật, không phải đồ thị đầy đủ vô nghĩa */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6" aria-label="Phân bố khối và kỹ năng toàn trường">
        <BieuDoCot
          tieuDe="Phân bố học sinh theo khối"
          tomTat={tomTatTruong}
          donViY="Số học sinh"
          cot={[...data.grade_ranking]
            .sort((a, b) => a.grade - b.grade)
            .map((g) => ({
              nhan: `Khối ${g.grade}`,
              giaTri: g.count,
              nhanGiaTri: `${g.count} HS`,
              phuDe: `TB ${g.avg_score} · ${g.hours}h`,
            }))}
          thongBaoRong="Chưa có dữ liệu khối để vẽ biểu đồ."
          ghiChu={
            khoiLa.length > 0
              ? `Lưu ý dữ liệu: ${khoiLa.map((g) => `Khối ${g.grade} chỉ có ${g.count} học sinh, điểm trung bình ${g.avg_score}`).join("; ")} — ` +
                `có thể thiếu dữ liệu, cần kiểm tra lại nguồn trước khi kết luận.`
              : undefined
          }
        />
        <ThanhXepHang
          tieuDe="Kỹ năng trung bình toàn trường"
          tomTat={
            kyNangCaoNhat && kyNangThapNhat
              ? `${kyNangCaoNhat.name} cao nhất (${kyNangCaoNhat.avg_score} điểm), ` +
                `${kyNangThapNhat.name} thấp nhất (${kyNangThapNhat.avg_score} điểm) — ` +
                `chênh lệch ${(kyNangCaoNhat.avg_score - kyNangThapNhat.avg_score).toFixed(1)} điểm, ` +
                `nhà trường nên ưu tiên bồi dưỡng kỹ năng còn yếu.`
              : "Chưa đủ dữ liệu kỹ năng."
          }
          hang={data.skill_map.map((s) => ({ ten: s.name, diem: s.avg_score }))}
          donVi="điểm"
          thangToiDa={100}
          thongBaoRong="Chưa có dữ liệu kỹ năng để xếp hạng."
        />
      </section>
    </div>
  );
}
