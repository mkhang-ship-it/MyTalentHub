import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, GraduationCap, School, Users } from "lucide-react";

const ROLES = [
  { key: "student", label: "Học sinh", icon: GraduationCap, color: "#A1458F", soft: "#F9EEF7", link: "/login?role=student", description: "Khám phá năng khiếu, tích lũy trải nghiệm và xây dựng hồ sơ năng lực số." },
  { key: "teacher", label: "Giáo viên", icon: Users, color: "#27308E", soft: "#ECEFF9", link: "/login?role=teacher", description: "Quản lý sân chơi, chấm điểm rubric và đồng hành cùng học viên phát triển." },
  { key: "school", label: "Nhà trường", icon: School, color: "#9B6AB5", soft: "#F4EEF8", link: "/login?role=school", description: "Theo dõi KPI, phân tích năng lực và tạo báo cáo minh bạch cho phụ huynh." },
  { key: "enterprise", label: "Doanh nghiệp", icon: Building2, color: "#C44296", soft: "#FBEFF7", link: "/login?role=enterprise", description: "Tìm kiếm nhân tài, tuyển thực tập và tài trợ dự án phát triển kỹ năng." },
] as const;

export function PortalCard3D() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!media) return;
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  return (
    <div
      className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
      style={{ perspective: reduced ? "none" : "1000px" }}
    >
      {ROLES.map((role) => {
        const Icon = role.icon;
        return (
          <Link
            key={role.key}
            to={role.link}
            className="group relative rounded-2xl border border-line bg-surface p-6 shadow-soft transition-[box-shadow,border-color] duration-300 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
            style={{
              borderTopWidth: 4,
              borderTopColor: role.color,
              transformStyle: reduced ? "flat" : "preserve-3d",
            }}
            onPointerMove={(event) => {
              if (reduced) return;
              const bounds = event.currentTarget.getBoundingClientRect();
              const x = (event.clientX - bounds.left) / Math.max(bounds.width, 1) - 0.5;
              const y = (event.clientY - bounds.top) / Math.max(bounds.height, 1) - 0.5;
              event.currentTarget.style.transform = `rotateY(${x * 7}deg) rotateX(${-y * 7}deg) translateY(-4px)`;
            }}
            onPointerLeave={(event) => {
              if (!reduced) event.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl shadow-md transition-transform duration-300 group-hover:scale-110" style={{ background: role.soft }}>
              <Icon size={24} style={{ color: role.color }} aria-hidden="true" />
            </div>
            <h3 className="mb-1 text-lg font-extrabold text-ink">{role.label}</h3>
            <p className="text-sm leading-relaxed text-muted">{role.description}</p>
            <div className="mt-4 flex items-center gap-1.5 text-sm font-bold" style={{ color: role.color }}>
              Đăng nhập <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
