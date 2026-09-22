/** Logo FTalentHub bám slide: chữ F navy + cánh cam + sao vàng, wordmark navy một màu. */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-label="FTalentHub logo"
    >
      {/* cánh navy */}
      <path
        d="M5 37 C5 21 11 9 29 5 L29 11 C18 13 11 21 11 37 Z"
        fill="#1B2A5E"
      />
      {/* cánh cam */}
      <path
        d="M9 31 C13 23 19 19 27 18 L25 24 C19 25 15 27 13 32 Z"
        fill="#F5A623"
      />
      {/* sao vàng */}
      <polygon
        points="31,0 33.1,4.6 38,4.9 34.2,7.9 35.5,12.6 31,10 26.5,12.6 27.8,7.9 24,4.9 28.9,4.6"
        fill="#FFC107"
      />
    </svg>
  );
}

export function LogoWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div>
      <div
        className="font-extrabold leading-tight"
        style={{ color: "#1B2A5E", fontSize: compact ? 15 : 19 }}
      >
        FTalentHub
      </div>
      <div
        className="leading-tight text-muted whitespace-nowrap"
        style={{ fontSize: compact ? 8 : 10 }}
      >
        Discover Talent · Develop Skills · Create Future
      </div>
    </div>
  );
}
