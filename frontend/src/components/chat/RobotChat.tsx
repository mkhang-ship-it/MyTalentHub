import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type {
  KeyboardEvent,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { post } from "../../api/client";
import { ErrorBox } from "../ui";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

const LOI_CHAO: ChatMessage = {
  role: "assistant",
  content: "Chào bạn! Mình là F, trợ lý robot của FTalentHub. Bạn muốn hỏi gì?",
};

/** Giới hạn hiển thị ~20 tin mới nhất. */
const TOI_DA_HIEN_THI = 20;

/* ── Kích thước khung chat ──────────────────────────────────────────────
   Khung neo ĐÁY (container cao cố định + justify-end) nên kéo góc trên bên
   phải sẽ nới rộng sang phải và nới cao lên trên — đáy giữ nguyên chỗ.
   Mặc định bung HẾT CỠ về phải và lên trên, chỉ chừa GIOI_HAN.le chống tràn.
   Trần thật đo bằng mép section hero (đo thật: đáy khung = 511, mép trên hero
   = 65 ⇒ cao tối đa 430; mép phải hero = 1440, mép trái khung = 912 ⇒ 512).
   GIOI_HAN.rongMax/caoMax chỉ là CHỐN AN TOÀN; mép hero mới là giới hạn thật. */
const GIOI_HAN = { rongMin: 300, rongMax: 620, caoMin: 220, caoMax: 430, le: 16 };
/** Lưới 8px cho dễ kéo và dễ đoán kích thước sau khi bung. */
const LUOI = 8;
const KHOA_LUU = "ftalenthub.chat.size";

function chot(a: number, nho: number, lon: number): number {
  return Math.min(Math.max(a, nho), lon);
}

/**
 * Kích thước lớn nhất khung được phép — tức là "bung hết sang phải và lên trên".
 * Đo bằng getBoundingClientRect vì hero có overflow-hidden: tràn là bị CẮT MẤT,
 * nên phải chừa GIOI_HAN.le tính từ mép hero thật chứ không đoán bằng số cứng.
 * Độc lập với kích thước hiện tại: mép trái và mép dưới của khung là cố định.
 */
/** Tổng phần dịch chuyển dọc của các thẻ cha (tính cả transform của hero). */
function tongDayXuong(el: HTMLElement | null): number {
  let tong = 0;
  let n = el?.parentElement ?? null;
  while (n) {
    const tf = getComputedStyle(n).transform;
    if (tf && tf !== "none") {
      try {
        tong += new DOMMatrixReadOnly(tf).m42;
      } catch {
        // Chuỗi transform lạ (ví dụ "none") — coi như không dịch.
      }
    }
    n = n.parentElement;
  }
  return tong;
}

function gioiHanThucTe(
  panel: HTMLElement | null,
  bongBop: HTMLElement | null,
  dayXuong: number,
): { rong: number; cao: number } | null {
  if (!panel) return null;
  const goc = panel.getBoundingClientRect();
  const hero = panel.closest("section")?.getBoundingClientRect();
  const benPhai = hero ? hero.right : window.innerWidth;
  const tren = hero ? hero.top : GIOI_HAN.le;
  // Đáy khung neo theo robot, mà robot đang TRƯỢT xuống. Đáy hiện tại cộng
  // phần còn trượt chưa tới = đáy chốt được sau khi chuyển động xong.
  const day = bongBop
    ? bongBop.getBoundingClientRect().bottom + (dayXuong - tongDayXuong(bongBop))
    : goc.bottom;
  return {
    rong: chot(benPhai - goc.left - GIOI_HAN.le, GIOI_HAN.rongMin, GIOI_HAN.rongMax),
    cao: chot(day - tren - GIOI_HAN.le, GIOI_HAN.caoMin, GIOI_HAN.caoMax),
  };
}

/** Đọc kích thước người dùng đã kéo lưu lại. Chưa kéo thì trả null. */
function docKichThu(): { rong: number; cao: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KHOA_LUU);
    if (!raw) return null;
    const p = JSON.parse(raw) as { rong?: unknown; cao?: unknown };
    if (!Number(p.rong) || !Number(p.cao)) return null;
    return {
      rong: chot(Number(p.rong), GIOI_HAN.rongMin, GIOI_HAN.rongMax),
      cao: chot(Number(p.cao), GIOI_HAN.caoMin, GIOI_HAN.caoMax),
    };
  } catch {
    return null;
  }
}

function luuKichThu(rong: number, cao: number) {
  try {
    window.localStorage.setItem(KHOA_LUU, JSON.stringify({ rong, cao }));
  } catch {
    // Khoá lưu bị chặn (riêng tư) — co giãn vẫn chạy trong phiên này.
  }
}

/** Props điều khiển từ cha — cả hai đều tuỳ chọn. */
type RobotChatProps = {
  /** true = mở khung chat. Bỏ trống thì RobotChat tự quản lý. */
  mo?: boolean;
  /** Gọi khi trạng thái mở/đóng thay đổi. */
  doiMo?: (mo: boolean) => void;
  /**
   * Robot sẽ trượt xuống bao nhiêu px khi mở chat. RobotChat dùng để tính vị trí
   * ĐÁY khung sau khi trượt xong, vì lúc nó vừa mở thì robot còn đang chuyển động
   * và đáy khung chưa tới chỗ — đo lúc đó sẽ ra chiều cao nhỏ hơn thật.
   */
  dayXuong?: number;
};

/**
 * Hiển thị câu trả lời của AI, tôn trọng hai kiểu định dạng model hay dùng:
 * **đậm** và *nghiêng*.
 *
 * Cố tình KHÔNG dùng dangerouslySetInnerHTML: nội dung do AI sinh ra, đưa thẳng
 * vào innerHTML là mở đường XSS. Ở đây tách chuỗi rồi dựng phần tử React nên
 * mọi ký tự đều được React escape như bình thường.
 */
function hienThiRich(text: string) {
  const doan = text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g);
  return doan.map((phan, i) => {
    if (phan.length > 4 && phan.startsWith("**") && phan.endsWith("**")) {
      return <strong key={i} className="font-semibold text-ink">{phan.slice(2, -2)}</strong>;
    }
    if (phan.length > 2 && phan.startsWith("*") && phan.endsWith("*")) {
      return <em key={i}>{phan.slice(1, -1)}</em>;
    }
    return <Fragment key={i}>{phan}</Fragment>;
  });
}

function tachLoiApi(err: unknown): { status: number | null; detail: string } {
  const raw = err instanceof Error ? err.message : String(err);
  const khop = raw.match(/→\s*(\d{3})\s*:\s*([\s\S]*)$/);
  if (!khop) return { status: null, detail: "" };
  const status = Number(khop[1]);
  let detail = (khop[2] ?? "").trim();
  try {
    const body = JSON.parse(detail) as { detail?: unknown };
    if (typeof body.detail === "string" && body.detail.trim()) detail = body.detail.trim();
  } catch {
    // Giữ nguyên detail dạng text thô.
  }
  return { status, detail };
}

function loiThanThien(status: number | null, detail: string): string {
  if (status === 429) {
    return detail
      ? `Bạn hỏi quá nhiều, chờ một chút nhé. (${detail})`
      : "Bạn hỏi quá nhiều, chờ một chút nhé.";
  }
  if (status === 503) return "AI tạm không sẵn sàng, thử lại sau.";
  if (detail) return detail;
  if (status === 400) return "Tin nhắn chưa hợp lệ, bạn thử viết lại nhé.";
  return "Không kết nối được máy chủ, bạn kiểm tra mạng rồi thử lại nhé.";
}

/**
 * Khung chat với trợ lý robot F trên Landing.
 * Mặc định đóng; nằm BÊ TRONG khung robot nên tự ẩn theo robot trên màn hình nhỏ.
 *
 * `mo` + `doiMo` cho phép cha điều khiển — Landing dùng để mở chat khi người
 * dùng BẤM vào con robot. Bỏ trống thì component tự quản lý như cũ.
 */
export function RobotChat({ mo: moDieuKhien, doiMo, dayXuong = 0 }: RobotChatProps = {}) {
  const [moNoiBo, setMoNoiBo] = useState(false);
  // Hỗ trợ cả hai kiểu: cha điều khiển (mở bằng cách bấm robot) hoặc tự quản lý.
  const mo = moDieuKhien ?? moNoiBo;
  const setMo = useCallback(
    (v: boolean) => {
      setMoNoiBo(v);
      doiMo?.(v);
    },
    [doiMo],
  );
  const [tinNhan, setTinNhan] = useState<ChatMessage[]>([LOI_CHAO]);
  const [nhap, setNhap] = useState("");
  const [dangCho, setDangCho] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [nhay, setNhay] = useState(false);
  // null = chưa đo được (lần vẽ đầu) hoặc người dùng chưa từng kéo.
  const [kichThu, setKichThu] = useState<{ rong: number; cao: number } | null>(docKichThu);
  const [keo, setKeo] = useState(false);
  const khungRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const bongBopRef = useRef<HTMLDivElement>(null);
  const nhayTimer = useRef<number | null>(null);

  /**
   * Mặc định bung hết cỡ sang phải và lên trên. Dùng useLayoutEffect (không phải
   * useEffect) để chỉnh xong TRƯỚC khi trình duyệt vẽ — nếu dùng useEffect người
   * dùng sẽ thấy khung nhảy từ 360×305 lên cỡ đầy trong một nhịp.
   * Người dùng đã kéo trước đó thì giữ đúng kích thước họ chọn.
   */
  useLayoutEffect(() => {
    if (!mo || kichThu) return;
    const toiDa = gioiHanThucTe(panelRef.current, bongBopRef.current, dayXuong);
    if (toiDa) setKichThu(toiDa);
  }, [mo, kichThu, dayXuong]);

  // Đổi kích thước cửa sổ thì mép hero đổi theo — co lại khung cho vừa, không để nó tràn.
  useLayoutEffect(() => {
    if (!mo) return;
    const coLai = () => {
      const toiDa = gioiHanThucTe(panelRef.current, bongBopRef.current, dayXuong);
      if (!toiDa) return;
      setKichThu((cu) => {
        if (!cu) return cu;
        const moi = {
          rong: chot(cu.rong, GIOI_HAN.rongMin, toiDa.rong),
          cao: chot(cu.cao, GIOI_HAN.caoMin, toiDa.cao),
        };
        return moi.rong === cu.rong && moi.cao === cu.cao ? cu : moi;
      });
    };
    window.addEventListener("resize", coLai);
    return () => window.removeEventListener("resize", coLai);
  }, [mo]);

  function batDauKeo(e: ReactPointerEvent<HTMLDivElement>) {
    const el = panelRef.current;
    const gioi = gioiHanThucTe(el, bongBopRef.current, dayXuong);
    if (!el || !gioi) return;
    e.preventDefault();
    const goc = el.getBoundingClientRect();
    const tu = { x: e.clientX, y: e.clientY, rong: goc.width, cao: goc.height };
    setKeo(true);

    const diChuyen = (ev: PointerEvent) => {
      setKichThu({
        rong: chot(
          Math.round((tu.rong + ev.clientX - tu.x) / LUOI) * LUOI,
          GIOI_HAN.rongMin,
          gioi.rong,
        ),
        cao: chot(
          Math.round((tu.cao - (ev.clientY - tu.y)) / LUOI) * LUOI,
          GIOI_HAN.caoMin,
          gioi.cao,
        ),
      });
    };
    const ketThuc = () => {
      window.removeEventListener("pointermove", diChuyen);
      window.removeEventListener("pointerup", ketThuc);
      window.removeEventListener("pointercancel", ketThuc);
      setKeo(false);
      const h = el.getBoundingClientRect();
      luuKichThu(h.width, h.height);
    };
    window.addEventListener("pointermove", diChuyen);
    window.addEventListener("pointerup", ketThuc);
    window.addEventListener("pointercancel", ketThuc);
  }

  /** Bàn phím: Shift+phím mũi tên nới/co nhanh, Home/Escape bung hết cỡ. */
  function doiKichThu(e: ReactKeyboardEvent<HTMLDivElement>) {
    const gioi = gioiHanThucTe(panelRef.current, bongBopRef.current, dayXuong);
    if (!gioi) return;
    const buoc = e.shiftKey ? 40 : LUOI;
    let rong = kichThu?.rong ?? gioi.rong;
    let cao = kichThu?.cao ?? gioi.cao;
    if (e.key === "ArrowRight") rong += buoc;
    else if (e.key === "ArrowLeft") rong -= buoc;
    else if (e.key === "ArrowUp") cao += buoc;
    else if (e.key === "ArrowDown") cao -= buoc;
    else if (e.key === "Home" || e.key === "Escape") {
      rong = gioi.rong;
      cao = gioi.cao;
    } else return;
    e.preventDefault();
    const moi = {
      rong: chot(rong, GIOI_HAN.rongMin, gioi.rong),
      cao: chot(cao, GIOI_HAN.caoMin, gioi.cao),
    };
    setKichThu(moi);
    luuKichThu(moi.rong, moi.cao);
  }

  // Robot "nhảy" (animate-bounce có sẵn của Tailwind) khi F trả lời tin mới.
  useEffect(() => {
    if (tinNhan.length <= 1) return;
    const cuoi = tinNhan[tinNhan.length - 1];
    if (cuoi.role !== "assistant") return;
    setNhay(true);
    if (nhayTimer.current) window.clearTimeout(nhayTimer.current);
    nhayTimer.current = window.setTimeout(() => setNhay(false), 700);
    return () => {
      if (nhayTimer.current) window.clearTimeout(nhayTimer.current);
    };
  }, [tinNhan]);

  // Tự cuộn xuống cuối khi có tin mới hoặc mở khung.
  useEffect(() => {
    khungRef.current?.scrollTo({ top: khungRef.current.scrollHeight });
  }, [tinNhan, dangCho, mo]);

  async function gui() {
    const noiDung = nhap.trim();
    if (!noiDung || dangCho) return;
    setLoi(null);
    const moi: ChatMessage = { role: "user", content: noiDung };
    const lichSu = [...tinNhan, moi].slice(-TOI_DA_HIEN_THI);
    setTinNhan((cu) => [...cu, moi]);
    setNhap("");
    setDangCho(true);
    try {
      const data = await post<{ reply: string }>("/ai/chat/public", {
        message: noiDung,
        history: lichSu.map((t) => ({ role: t.role, content: t.content })),
      });
      const traLoi =
        typeof data?.reply === "string" && data.reply.trim()
          ? data.reply.trim()
          : "AI tạm không sẵn sàng, thử lại sau.";
      setTinNhan((cu) => [...cu, { role: "assistant", content: traLoi }]);
    } catch (err) {
      const { status, detail } = tachLoiApi(err);
      setLoi(loiThanThien(status, detail));
    } finally {
      setDangCho(false);
    }
  }

  function xuLyPhim(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void gui();
    }
  }

  const hienThi = tinNhan.slice(-TOI_DA_HIEN_THI);
  const khongGuiDuoc = dangCho || !nhap.trim();

  return (
    // Bong bóng neo ở GÓC TRÁI, NGANG TRÊN ĐẦU robot; bấm thì bung LÊN.
    // Cách neo tự co giãn: container cao H với justify-end => nút luôn nằm sát đáy
    // container (y=H), còn bong bóng chat TRÀN LÊN. Đổi kích thước bong bóng/nút
    // sau này không phải chỉnh offset.
    // H=130: nút tròn nằm ngay trên đầu robot; bong bóng chat tràn lên trên nó.
    // pointer-events-none ở gốc để không chặn kéo xoay robot; con bật lại pointer-events.
    <div ref={bongBopRef} className="pointer-events-none absolute left-[80px] top-0 z-20 flex h-[130px] flex-col items-start justify-end">
      {mo && (
        <>
          <div
            id="dock-chat"
            role="dialog"
            aria-label="Chat với trợ lý F"
            // shrink-0: container cao cố định nên mặc định flex-shrink sẽ BÓP panel
            // lại (101px thay vì 175px) và cắt mất ô nhập. Giữ chiều cao thật,
            // cho panel tràn ra phía trên container như thiết kế.
            // rộng/cao do kéo góc trên-phải quyết định (xem GIOI_HAN ở trên). Lần vẽ đầu
            // chưa đo được nên để class w-[360px] h-[305px] bên dưới giữ; ngay sau đó
            // useLayoutEffect bung hết cỡ sang phải và lên trên, trước khi vẽ.
            ref={panelRef}
            style={kichThu ? { width: kichThu.rong, height: kichThu.cao } : undefined}
            className="pointer-events-auto relative mb-1.5 flex h-[305px] w-[360px] max-w-[calc(100vw-2.5rem)] shrink-0 select-none flex-col overflow-hidden rounded-[26px] border border-line bg-surface text-ink shadow-lift"
          >
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <p className="text-sm font-bold">F — trợ lý robot</p>
            <button
              type="button"
              onClick={() => setMo(false)}
              aria-label="Đóng khung chat"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-strong transition-colors hover:bg-canvas-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          {/* min-h-0: bắt buộc để khung này co lại được trong flex column. Thiếu nó,
              flex-1 có min-height:auto nên đẩy ô nhập ra khỏi khung và bị cắt mất. */}
          <div ref={khungRef} role="log" aria-live="polite" className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2">
            {hienThi.map((t, i) =>
              t.role === "user" ? (
                <p
                  key={i}
                  className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap break-words rounded-xl rounded-br-sm bg-portal px-3 py-2 text-[13px] leading-relaxed text-white"
                >
                  {t.content}
                </p>
              ) : (
                <p
                  key={i}
                  className="mr-auto w-fit max-w-[85%] whitespace-pre-wrap break-words rounded-xl rounded-bl-sm border border-line bg-canvas-soft px-3 py-2 text-[13px] leading-relaxed text-ink"
                >
                  {hienThiRich(t.content)}
                </p>
              )
            )}
            {dangCho && <p className="animate-pulse text-xs font-medium text-muted-strong">F đang trả lời…</p>}
          </div>

          {loi && (
            <div className="px-3 pb-2">
              <ErrorBox message={loi} />
            </div>
          )}

          <div className="flex items-end gap-2 border-t border-line p-2">
            <label htmlFor="dock-nhap" className="sr-only">
              Nhập tin nhắn cho F
            </label>
            <textarea
              id="dock-nhap"
              rows={2}
              value={nhap}
              disabled={dangCho}
              onChange={(e) => setNhap(e.target.value)}
              onKeyDown={xuLyPhim}
              placeholder="Hỏi F điều gì đó… (Enter để gửi)"
              className="input-control h-auto min-h-[44px] flex-1 resize-none py-2 text-[13px] disabled:cursor-not-allowed disabled:opacity-55"
            />
            <button
              type="button"
              onClick={() => void gui()}
              disabled={khongGuiDuoc}
              aria-label="Gửi tin nhắn"
              className="btn-primary h-11 shrink-0 px-3.5 text-[13px]"
            >
              <Send size={16} aria-hidden="true" />
              Gửi
            </button>
          </div>

          {/* Tay cầm co giãn ở GÓC TRÊN BÊN PHẢI. Khung neo đáy nên kéo
              phải = nới rộng, kéo lên = nới cao. Vùng bấm rộng 22px cho dễ
              trúng trên máy tính cảm ứng; có phím mũi tên để không bắt buộc phải kéo.
              Đặt SAU nội dung trong DOM (không phải trước) để không che bất kỳ ô nào. */}
          <div
            role="separator"
            aria-label="Co giãn khung chat. Dùng phím mũi tên, giữ Shift để nhanh hơn, Home để về mặc định."
            aria-orientation="horizontal"
            tabIndex={0}
            onPointerDown={batDauKeo}
            onKeyDown={doiKichThu}
            onDoubleClick={() => {
              const toiDa = gioiHanThucTe(panelRef.current, bongBopRef.current, dayXuong);
              if (!toiDa) return;
              setKichThu(toiDa);
              luuKichThu(toiDa.rong, toiDa.cao);
            }}
            // KHÔNG bo góc cho tay cầm: bo 26px trên ô 24×24 làm mất gần hết vùng bấm
            // ở đúng góc trên-phải (chỗ người dùng nhắm vào). Thẻ cha đã bo sẵn
            // và có overflow-hidden nên hình vẫn được cắt đúng bo góc.
            className={`absolute right-0 top-0 z-10 h-6 w-6 cursor-nwse-resize touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal ${
              keo ? "bg-portal/25" : "hover:bg-portal/12"
            }`}
          >
            {/* Ba nét chéo gợi hình kéo góc. */}
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="absolute right-1 top-1 h-3.5 w-3.5 text-muted-strong"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M20 4 4 20M20 10l-10 10" />
            </svg>
          </div>
          </div>

          {/* Chấm tròn nhỏ dần nối bong bóng xuống nút, kiểu bóng đèn ý tưởng. */}
          <div className="mb-1.5 flex items-center gap-1.5 pl-3" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full border border-line bg-surface" />
            <span className="h-2 w-2 rounded-full border border-line bg-surface" />
            <span className="h-1.5 w-1.5 rounded-full bg-surface" />
          </div>
        </>
      )}

      {/* Nút tròn + dòng gợi ý nằm NGANG nhau (một hàng), không xếp dọc.
          Bọc trong hàng riêng để khi chat mở, hàng này vẫn là phần tử cuối cùng,
          tức sát đầu robot nhất. */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMo(!mo)}
          aria-expanded={mo}
          aria-controls="dock-chat"
          aria-label={mo ? "Đóng chat với F" : "Hỏi trợ lý F"}
          className={`pointer-events-auto inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-lift transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 ${
            nhay ? "animate-bounce" : ""
          }`}
        >
          {mo ? <X size={20} aria-hidden="true" /> : <MessageCircle size={20} aria-hidden="true" />}
        </button>

        {/* Gợi ý cho người lạ: chỉ hiện khi chat đang đóng, nằm ngang cạnh nút. */}
        {!mo && (
          <p className="pointer-events-none whitespace-nowrap rounded-full border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink shadow-soft">
            Bấm vào Robot để hỏi
          </p>
        )}
      </div>
    </div>
  );
}
