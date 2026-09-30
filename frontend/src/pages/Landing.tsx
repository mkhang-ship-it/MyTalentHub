import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { LogoMark, LogoWordmark } from "../components/Logo";
import {
  Sparkles,
  Compass,
  ShieldCheck,
  BrainCircuit,
  ArrowRight,
  Building2,
  GraduationCap,
  School,
  Users,
} from "lucide-react";

// 4 cổng vai trò — bản 2D tĩnh (thay PortalCard3D: bỏ perspective + nghiêng 3D
// theo chuột, giữ nguyên nội dung/link để không thêm khối mới).
const VAI_TRO = [
  { key: "student", label: "Học sinh", icon: GraduationCap, color: "#A1458F", soft: "#F9EEF7", link: "/login?role=student", description: "Khám phá năng khiếu, tích lũy trải nghiệm và xây dựng hồ sơ năng lực số." },
  { key: "teacher", label: "Giáo viên", icon: Users, color: "#27308E", soft: "#ECEFF9", link: "/login?role=teacher", description: "Quản lý sân chơi, chấm điểm rubric và đồng hành cùng học viên phát triển." },
  { key: "school", label: "Nhà trường", icon: School, color: "#9B6AB5", soft: "#F4EEF8", link: "/login?role=school", description: "Theo dõi KPI, phân tích năng lực và tạo báo cáo minh bạch cho phụ huynh." },
  { key: "enterprise", label: "Doanh nghiệp", icon: Building2, color: "#C44296", soft: "#FBEFF7", link: "/login?role=enterprise", description: "Tìm kiếm nhân tài, tuyển thực tập và tài trợ dự án phát triển kỹ năng." },
] as const;

export default function Landing() {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Giữ nguyên cơ chế hiện dần khi cuộn bằng IntersectionObserver (đặc tả 01 phần A).
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-ink selection:bg-portal/20">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-24px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes pulseSlow {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }

        .anim-fade-up {
          animation: fadeUp 0.9s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .anim-fade-up-delay-1 { animation-delay: 0.1s; }
        .anim-fade-up-delay-2 { animation-delay: 0.2s; }
        .anim-fade-up-delay-3 { animation-delay: 0.3s; }
        .anim-fade-up-delay-4 { animation-delay: 0.4s; }

        .reveal {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        .reveal.reveal-visible {
          opacity: 1;
          transform: translateY(0);
        }

        @media (prefers-reduced-motion: reduce) {
          .anim-fade-up, .anim-fade-up-delay-1, .anim-fade-up-delay-2, .anim-fade-up-delay-3, .anim-fade-up-delay-4 {
            animation: fadeIn 0.3s ease both;
          }
          .reveal { transition: opacity 0.2s ease; }
        }
      `}</style>

      {/* Thanh điều hướng sticky: cao 64 desktop / 56 mobile (đặc tả 01 B1) */}
      <nav className="sticky top-0 z-50 border-b border-line bg-[color-mix(in_srgb,var(--canvas)_92%,transparent)] backdrop-blur-[12px] shadow-[0_1px_3px_rgba(51,50,77,.06)]">
        <div className="mx-auto flex h-14 md:h-16 max-w-6xl items-center justify-between px-5 md:px-6">
          <Link
            to="/"
            className="group inline-flex items-center gap-2 rounded-[10px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 transition-transform duration-150 ease-out hover:scale-[1.01]"
            aria-label="FTalentHub home"
          >
            {/* Logo 32px mobile / 40px desktop mà không sửa Logo.tsx */}
            <span className="[&>svg]:h-8 [&>svg]:w-8 md:[&>svg]:h-10 md:[&>svg]:w-10 [&>svg]:shrink-0">
              <LogoMark size={40} />
            </span>
            <LogoWordmark compact />
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-ink-soft">
            <a
              href="#vai-tro"
              className="relative py-2 rounded-md transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 after:absolute after:bottom-1 after:left-0 after:h-0.5 after:w-0 after:rounded-full after:bg-portal after:transition-all after:duration-150 after:ease-out hover:after:w-full"
            >
              Vai trò
            </a>
            <a
              href="#tinh-nang"
              className="relative py-2 rounded-md transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 after:absolute after:bottom-1 after:left-0 after:h-0.5 after:w-0 after:rounded-full after:bg-portal after:transition-all after:duration-150 after:ease-out hover:after:w-full"
            >
              Tính năng
            </a>
            <a
              href="#gia-tri"
              className="relative py-2 rounded-md transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 after:absolute after:bottom-1 after:left-0 after:h-0.5 after:w-0 after:rounded-full after:bg-portal after:transition-all after:duration-150 after:ease-out hover:after:w-full"
            >
              Giá trị
            </a>
          </div>
          {/* D1: mobile chỉ giữ nút Đăng nhập (bản cũ không có CTA nào) */}
          <div className="flex items-center gap-2">
            <Link
              to="/register"
              className="hidden md:inline-flex items-center gap-1.5 rounded-xl border border-line-control bg-transparent h-10 px-4 text-sm font-semibold text-ink transition-all duration-150 ease-out hover:border-portal hover:text-portal active:scale-[0.995] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
            >
              Đăng ký
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 rounded-xl bg-portal h-9 px-3.5 text-[13px] md:h-10 md:px-4 md:text-sm font-semibold text-white shadow-sm ring-1 ring-inset ring-white/10 transition-all duration-150 ease-out hover:bg-portal-dark active:scale-[0.995] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
            >
              Đăng nhập
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero: gradient giữ nguyên dải màu + scrim bắt buộc (01 B2, 00 mục 7.3) */}
        <section
          ref={heroRef}
          className="relative overflow-hidden bg-[linear-gradient(105deg,#1B2A5E_0%,#27308E_46%,#C44296_100%)] text-white"
        >
          {/* Lớp scrim navy để chữ 14–18px đạt tương phản trên điểm sáng nhất */}
          <div className="scrim-navy pointer-events-none absolute inset-0" aria-hidden="true" />
          {/* Đốm trang trí */}
          <div className="pointer-events-none absolute -top-32 -left-32 h-[28rem] w-[28rem] rounded-full opacity-30 blur-3xl bg-[#F97316]" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-[24rem] w-[24rem] rounded-full opacity-30 blur-3xl bg-[#FFC107]" aria-hidden="true" />
          <div className="pointer-events-none absolute top-1/3 right-10 h-32 w-32 rounded-full opacity-20 bg-white" aria-hidden="true" />

          <div className="relative mx-auto max-w-6xl px-5 md:px-6 pt-14 pb-[72px] md:pt-[72px] md:pb-[88px] lg:pt-24 lg:pb-28">
            {/* Hero 1 cột 2D — đã bỏ TalentConstellation (canvas 378×458).
                Không thêm khối mới lấp chỗ; trang ngắn lại là tốt. */}
            <div className="max-w-3xl">
              <div className="anim-fade-up inline-flex h-8 items-center gap-2 rounded-full bg-[rgba(255,255,255,.12)] px-3.5 text-xs font-bold text-white backdrop-blur-sm mb-6 border border-[rgba(255,255,255,.28)]">
                <Sparkles size={14} /> Hệ sinh thái tài năng đa lĩnh vực
              </div>
              <h1 className="anim-fade-up anim-fade-up-delay-1 text-4xl md:text-[44px] lg:text-[56px] font-extrabold leading-[1.05] tracking-[-0.02em] mb-6">
                Discover Talent <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FFC107] to-[#F97316]">Develop Skills</span> <br />
                Create Future
              </h1>
              <p className="anim-fade-up anim-fade-up-delay-2 text-lg text-white leading-[1.65] max-w-2xl mb-8">
                FTalentHub kết nối học sinh — giáo viên — nhà trường — doanh nghiệp trong một nền tảng duy nhất: từ khám phá năng khiếu đến chứng chỉ số và kết nối nghề nghiệp.
              </p>
              <div className="anim-fade-up anim-fade-up-delay-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
                <Link
                  to="/login"
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl h-[52px] px-8 text-[15px] font-bold text-[#1B2A5E] bg-white shadow-[0_12px_28px_rgba(0,0,0,.22)] hover:-translate-y-0.5 transition-transform focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                >
                  Bắt đầu ngay <ArrowRight size={18} />
                </Link>
                <Link
                  to="/register"
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl h-[52px] px-8 text-[15px] font-bold text-white bg-[rgba(27,42,94,.45)] backdrop-blur-sm border border-[rgba(255,255,255,.4)] hover:bg-[rgba(27,42,94,.62)] transition-colors focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                >
                  Đăng ký tài khoản
                </Link>
                <a
                  href="#vai-tro"
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl h-[52px] px-8 text-[15px] font-bold text-white border border-[rgba(255,255,255,.4)] bg-transparent backdrop-blur-sm hover:bg-[rgba(27,42,94,.62)] transition-colors focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                >
                  Khám phá vai trò
                </a>
              </div>
            </div>
        </div>
        </section>

        {/* 4 thẻ cổng — tràn lên hero 72px (01 B3). Bản 2D tĩnh, không nghiêng 3D. */}
        <section id="vai-tro" className="mx-auto max-w-6xl px-5 md:px-6 -mt-10 md:-mt-[72px] relative z-10 scroll-mt-[88px]">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {VAI_TRO.map((role) => {
              const Icon = role.icon;
              return (
                <Link
                  key={role.key}
                  to={role.link}
                  className="group relative rounded-2xl border border-line bg-surface p-6 shadow-soft transition-[box-shadow,border-color] duration-300 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
                  style={{ borderTopWidth: 4, borderTopColor: role.color }}
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl shadow-md transition-transform duration-300 group-hover:scale-110" style={{ background: role.soft }}>
                    <Icon size={24} style={{ color: role.color }} aria-hidden="true" />
                  </div>
                  <h3 className="mb-1 text-lg font-extrabold text-ink">{role.label}</h3>
                  <p className="text-sm leading-relaxed text-muted-strong">{role.description}</p>
                  <div className="mt-4 flex items-center gap-1.5 text-sm font-bold" style={{ color: role.color }}>
                    Đăng nhập <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Khối tính năng */}
        <section id="tinh-nang" className="mx-auto max-w-6xl px-5 md:px-6 pt-16 md:pt-24 scroll-mt-[88px]">
          <div className="text-center mb-12 reveal">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-portal-dark mb-3">Tính năng nổi bật</p>
            <h2 className="text-[26px] md:text-[32px] font-extrabold leading-[1.2] tracking-[-0.02em] text-ink mb-3">Nền tảng đa cổng</h2>
            <p className="text-[15px] leading-relaxed text-muted-strong max-w-xl mx-auto">Tích hợp từ khám phá năng khiếu đến hồ sơ năng lực số và kết nối doanh nghiệp.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {[
              {
                title: "Khám phá năng khiếu",
                desc: "Bộ test khoa học Holland, MBTI, DISC, MI giúp học sinh hiểu chính mình và nhận lộ trình 3 tháng từ AI.",
                icon: Compass,
                color: "#A1458F",
                gradient: "linear-gradient(135deg, #FF5A4E 0%, #EF4580 48%, #844BD2 100%)",
              },
              {
                title: "Talent Passport",
                desc: "Hồ sơ năng lực số tích hợp QR xác thực, chứng chỉ, dự án cá nhân và kỹ năng năng lực — sẵn sàng cho tuyển dụng và học bổng.",
                icon: ShieldCheck,
                color: "#27308E",
                gradient: "linear-gradient(135deg, #FBBF24 0%, #F97316 55%, #EA580C 100%)",
              },
              {
                title: "AI phân tích & gợi ý",
                desc: "Phân tích năng lực cá nhân, gợi ý lộ trình phát triển và tạo phản hồi thông minh cho học sinh — giáo viên — nhà trường.",
                icon: BrainCircuit,
                color: "#C44296",
                gradient: "linear-gradient(100deg, #F4417E 0%, #C345A9 50%, #7C57DB 100%)",
              },
            ].map((item) => (
              <div key={item.title} className="reveal group rounded-[20px] overflow-hidden bg-surface border border-line shadow-soft hover:shadow-[0_16px_36px_rgba(51,50,77,.12)] transition-all hover:-translate-y-1">
                <div
                  className="h-40 md:h-48 flex items-center justify-center relative overflow-hidden"
                  style={{ background: item.gradient }}
                >
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_60%_30%,_white_0%,_transparent_60%)]" aria-hidden="true" />
                  <item.icon size={56} className="text-white drop-shadow-lg transition-transform duration-200 group-hover:scale-[1.03]" />
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold tracking-[-0.01em] text-ink mb-2">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-ink-soft">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Khối giá trị */}
        <section id="gia-tri" className="mx-auto max-w-6xl px-5 md:px-6 pt-16 md:pt-24 scroll-mt-[88px]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            <div className="reveal">
              <h2 className="text-[26px] md:text-[32px] font-extrabold leading-[1.2] tracking-[-0.02em] text-ink mb-6">Tại sao FTalentHub?</h2>
              <div className="space-y-4">
                {[
                  { title: "Đa lĩnh vực — một nền tảng", body: "Từ học thuật, nghệ thuật, kỹ thuật đến thể thao và doanh nghiệp — mọi năng lực đều có chỗ đứng." },
                  { title: "Chứng chỉ số xác thực", body: "Talent Passport với mã QR tích hợp giúp xác thực hồ sơ nhanh chóng khi xin học bổng hoặc thực tập." },
                  { title: "AI cá nhân hóa", body: "Không phải một lộ trình chung — AI phân tích dữ liệu cá nhân để gợi ý đúng người, đúng thời điểm." },
                ].map((v) => (
                  <div key={v.title} className="rounded-2xl border border-line bg-[color-mix(in_srgb,var(--canvas-soft)_60%,transparent)] p-5 shadow-soft">
                    <h3 className="text-base font-bold text-ink mb-1">{v.title}</h3>
                    <p className="text-sm leading-relaxed text-ink-soft">{v.body}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="reveal rounded-3xl text-white p-8 shadow-[0_24px_60px_rgba(51,50,77,.25)] relative overflow-hidden bg-[linear-gradient(45deg,#A1458F_0%,#9B6AB5_52%,#27308E_100%)]">
              <div className="scrim-navy pointer-events-none absolute inset-0" aria-hidden="true" />
              <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-white/5 blur-2xl -translate-y-1/3 translate-x-1/4" aria-hidden="true" />
              <div className="relative">
                <h3 className="text-xl font-extrabold mb-5">Số liệu nổi bật</h3>
                <div className="grid grid-cols-2 gap-4 max-md:gap-3">
                  {[
                    { label: "Vai trò", value: "4 cổng" },
                    { label: "Bài test", value: "4 bộ" },
                    { label: "Lĩnh vực", value: "6+" },
                    { label: "Hồ sơ số", value: "QR tích hợp" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-2xl bg-[rgba(27,42,94,.50)] backdrop-blur-sm p-4 border border-[rgba(255,255,255,.22)]">
                      <div className="text-2xl font-extrabold tabular-nums">{s.value}</div>
                      <div className="text-xs font-semibold text-white">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-6 border-t border-[rgba(255,255,255,.22)] text-sm leading-relaxed text-white">
                  FTalentHub được xây dựng dựa trên 35 slide thiết kế và tiêu chuẩn Awwwards — kết hợp giữa thẩm mỹ và khả năng sử dụng.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA cuối */}
        <section className="mx-auto max-w-6xl px-5 md:px-6 pt-12 md:pt-16 pb-16 md:pb-24">
          <div className="reveal relative overflow-hidden rounded-[2rem] text-white shadow-[0_24px_60px_rgba(51,50,77,.22)] p-6 md:p-10 lg:p-14 bg-[linear-gradient(120deg,#A1458F_0%,#9B6AB5_50%,#27308E_100%)]">
            <div className="scrim-navy pointer-events-none absolute inset-0" aria-hidden="true" />
            <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
            <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-[1.4fr_1fr] md:items-end gap-8">
              <div>
                <h2 className="text-[26px] md:text-[32px] font-extrabold leading-[1.2] tracking-[-0.02em] mb-3">Sẵn sàng khám phá năng lực?</h2>
                <p className="text-base leading-relaxed text-white max-w-[520px]">Đăng ký để bắt đầu hành trình: từ bài test năng khiếu đến hồ sơ số và kết nối nghề nghiệp.</p>
              </div>
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4">
                <Link
                  to="/login"
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl h-[52px] px-8 text-[15px] font-bold text-[#1B2A5E] bg-white shadow-[0_12px_28px_rgba(0,0,0,.22)] hover:-translate-y-0.5 transition-transform shrink-0 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                >
                  Đăng nhập ngay <ArrowRight size={18} />
                </Link>
                <Link
                  to="/register"
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl h-[52px] px-8 text-[15px] font-bold text-white bg-[rgba(27,42,94,.45)] backdrop-blur-sm border border-[rgba(255,255,255,.4)] hover:bg-[rgba(27,42,94,.62)] transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                >
                  Đăng ký tài khoản
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer: 1 dòng + 3 link giữ chỗ (01 B7) */}
      <footer className="border-t border-line bg-[color-mix(in_srgb,var(--canvas-soft)_40%,transparent)]">
        <div className="mx-auto max-w-6xl px-5 md:px-6 py-10 flex flex-col md:flex-row items-center justify-center md:justify-between gap-4">
          <p className="text-xs font-medium text-muted-strong text-center">Team FPI Cần Thơ · Hệ sinh thái tài năng đa lĩnh vực</p>
          <nav className="hidden md:flex items-center gap-6" aria-label="Liên kết pháp lý">
            <a href="#" className="text-xs font-semibold text-ink-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 rounded">Điều khoản</a>
            <a href="#" className="text-xs font-semibold text-ink-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 rounded">Quyền riêng tư</a>
            <a href="#" className="text-xs font-semibold text-ink-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 rounded">Liên hệ</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
