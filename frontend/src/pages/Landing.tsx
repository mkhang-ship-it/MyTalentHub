import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { TalentConstellation } from "../components/three/TalentConstellation";
import { PortalCard3D } from "../components/three/PortalCard3D";
import { LogoMark, LogoWordmark } from "../components/Logo";
import {
  Sparkles,
  Compass,
  ShieldCheck,
  BrainCircuit,
  ArrowRight,
} from "lucide-react";

export default function Landing() {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Simple scroll-triggered reveal using IntersectionObserver
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
          to   { opacity: 1; }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
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

      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b border-line/60 bg-canvas/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            to="/"
            aria-label="FTalentHub — Discover Talent · Develop Skills · Create Future"
            className="flex items-center gap-2.5"
          >
            <LogoMark size={40} />
            <LogoWordmark compact />
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-ink-soft">
            <a href="#vai-tro" className="hover:text-portal transition-colors">Vai trò</a>
            <a href="#tinh-nang" className="hover:text-portal transition-colors">Tính năng</a>
            <a href="#gia-tri" className="hover:text-portal transition-colors">Giá trị</a>
          </div>

          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-lg transition hover:brightness-110 sm:px-5"
            style={{ background: "linear-gradient(135deg, #A1458F 0%, #7E2F73 100%)" }}
          >
            Đăng nhập
            <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section
          ref={heroRef}
          className="relative overflow-hidden bg-gradient-to-br from-[#1B2A5E] via-[#27308E] to-[#C44296] text-white"
        >
          {/* Decorative blobs */}
          <div className="pointer-events-none absolute -top-32 -left-32 h-[28rem] w-[28rem] rounded-full opacity-30 blur-3xl bg-[#F97316]" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-[24rem] w-[24rem] rounded-full opacity-30 blur-3xl bg-[#FFC107]" aria-hidden="true" />
          <div className="pointer-events-none absolute top-1/3 right-10 h-32 w-32 rounded-full opacity-20 bg-white" aria-hidden="true" />

          <div className="relative mx-auto max-w-6xl px-6 pt-28 pb-20 md:pt-36 md:pb-28">
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
              <div className="max-w-3xl flex-1">
              <div className="anim-fade-up inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-sm mb-6 border border-white/10">
                <Sparkles size={14} /> Hệ sinh thái tài năng đa lĩnh vực
              </div>
              <h1 className="anim-fade-up anim-fade-up-delay-1 text-5xl md:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6 drop-shadow-sm">
                Discover Talent <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FFC107] to-[#F97316]">Develop Skills</span> <br />
                Create Future
              </h1>
              <p className="anim-fade-up anim-fade-up-delay-2 text-lg md:text-xl text-white/80 leading-relaxed max-w-2xl mb-8">
                FTalentHub kết nối học sinh — giáo viên — nhà trường — doanh nghiệp trong một nền tảng duy nhất: từ khám phá năng khiếu đến chứng chỉ số và kết nối nghề nghiệp.
              </p>
              <div className="anim-fade-up anim-fade-up-delay-3 flex flex-wrap gap-4">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-base font-extrabold text-[#1B2A5E] bg-white shadow-2xl hover:scale-[1.03] transition-transform"
                >
                  Bắt đầu ngay <ArrowRight size={18} />
                </Link>
                <a
                  href="#vai-tro"
                  className="inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-base font-extrabold text-white border border-white/30 bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
                >
                  Khám phá vai trò
                </a>
              </div>
            </div>
            <div className="w-full lg:w-[380px] flex-shrink-0 hidden lg:block" aria-label="3D scene preview">
              <div className="rounded-2xl overflow-hidden border border-white/20 bg-white/5 backdrop-blur-md shadow-2xl h-[420px] md:h-[480px]">
                <TalentConstellation className="w-full h-full" />
              </div>
            </div>
          </div>
        </div>
        </section>

        {/* Role Cards — Holographic 3D */}
        <section id="vai-tro" className="mx-auto max-w-6xl px-6 -mt-8 relative z-10">
          <PortalCard3D />
        </section>

        {/* Product Showcase */}
        <section id="tinh-nang" className="mx-auto max-w-6xl px-6 pt-28 pb-4">
          <div className="text-center mb-16 reveal">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-ink mb-3">Nền tảng đa cổng</h2>
            <p className="text-muted max-w-xl mx-auto">Tích hợp từ khám phá năng khiếu đến hồ sơ năng lực số và kết nối doanh nghiệp.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <div key={item.title} className="reveal rounded-3xl overflow-hidden bg-surface border border-line shadow-soft hover:shadow-lift transition-all hover:-translate-y-1">
                <div
                  className="h-48 flex items-center justify-center relative overflow-hidden"
                  style={{ background: item.gradient }}
                >
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_60%_30%,_white_0%,_transparent_60%)]" aria-hidden="true" />
                  <item.icon size={56} className="text-white drop-shadow-lg" />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-extrabold text-ink mb-2">{item.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Value Propositions */}
        <section id="gia-tri" className="mx-auto max-w-6xl px-6 pt-28 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div className="reveal">
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-ink mb-6">Tại sao FTalentHub?</h2>
              <div className="space-y-6">
                {[
                  { title: "Đa lĩnh vực — một nền tảng", body: "Từ học thuật, nghệ thuật, kỹ thuật đến thể thao và doanh nghiệp — mọi năng lực đều có chỗ đứng." },
                  { title: "Chứng chỉ số xác thực", body: "Talent Passport với mã QR tích hợp giúp xác thực hồ sơ nhanh chóng khi xin học bổng hoặc thực tập." },
                  { title: "AI cá nhân hóa", body: "Không phải một lộ trình chung — AI phân tích dữ liệu cá nhân để gợi ý đúng người, đúng thời điểm." },
                ].map((v) => (
                  <div key={v.title} className="rounded-2xl border border-line bg-canvas-soft/60 p-5 shadow-soft">
                    <h4 className="font-extrabold text-ink mb-1">{v.title}</h4>
                    <p className="text-sm text-muted leading-relaxed">{v.body}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="reveal rounded-3xl bg-gradient-to-tr from-[#1B2A5E] via-[#27308E] to-[#C44296] text-white p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-white/5 blur-2xl -translate-y-1/3 translate-x-1/4" aria-hidden="true" />
              <h3 className="text-2xl font-extrabold mb-4">Số liệu nổi bật</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Vai trò", value: "4 cổng" },
                  { label: "Bài test", value: "4 bộ" },
                  { label: "Lĩnh vực", value: "6+" },
                  { label: "Hồ sơ số", value: "QR tích hợp" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-white/10 backdrop-blur-sm p-4 border border-white/10">
                    <div className="text-2xl font-extrabold">{s.value}</div>
                    <div className="text-xs text-white/70 font-medium">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t border-white/10 text-sm text-white/80 leading-relaxed">
                FTalentHub được xây dựng dựa trên 35 slide thiết kế và tiêu chuẩn Awwwards — kết hợp giữa thẩm mỹ và khả năng sử dụng.
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-6 pt-16 pb-28">
          <div className="reveal relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#A1458F] via-[#9B6AB5] to-[#27308E] p-10 md:p-14 text-white shadow-2xl">
            <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
            <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">Sẵn sàng khám phá năng lực?</h2>
                <p className="text-white/80 max-w-lg">Đăng nhập để bắt đầu hành trình: từ bài test năng khiếu đến hồ sơ số và kết nối nghề nghiệp.</p>
              </div>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-base font-extrabold text-[#1B2A5E] bg-white shadow-xl hover:scale-[1.03] transition-transform shrink-0"
              >
                Đăng nhập ngay <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-line bg-canvas-soft/40">
        <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted">Team FPI Cần Thơ · Hệ sinh thái tài năng đa lĩnh vực</p>
        </div>
      </footer>
    </div>
  );
}
