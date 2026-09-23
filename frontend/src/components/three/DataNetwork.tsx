import { useEffect, useMemo, useRef, useState } from "react";

export interface DataNode {
  id: string | number;
  label: string;
  group?: string;
  color?: string;
  size?: number;
}

export interface DataLink {
  source: string | number;
  target: string | number;
  value?: number;
}

export interface DataNetworkProps {
  nodes: DataNode[];
  links: DataLink[];
  mode?: "school" | "enterprise";
  reducedMotion?: boolean;
  height?: number;
  ariaLabel?: string;
}

type Point = { x: number; y: number; color: string; label: string; group?: string };

const GROUP_COLORS: Record<string, string> = {
  class: "#C44296",
  grade: "#8B5CF6",
  skill: "#F97316",
  talent: "#C44296",
  project: "#EC4899",
  default: "#8A87A3",
};

function getPoints(nodes: DataNode[]): Map<string | number, Point> {
  const points = new Map<string | number, Point>();
  const center = 150;
  const radius = Math.min(120, Math.max(60, nodes.length * 8));
  nodes.forEach((node, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(1, nodes.length) - Math.PI / 2;
    points.set(node.id, {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
      color: node.color || GROUP_COLORS[node.group || "default"] || GROUP_COLORS.default,
      label: node.label,
      group: node.group || "node",
    });
  });
  return points;
}

function NetworkSvg({ nodes, links, ariaLabel }: { nodes: DataNode[]; links: DataLink[]; ariaLabel: string }) {
  const points = useMemo(() => getPoints(nodes.slice(0, 28)), [nodes]);
  const limitedLinks = useMemo(() => links.slice(0, 72), [links]);
  return (
    <svg viewBox="0 0 300 300" className="h-full w-full" role="img" aria-label={ariaLabel} tabIndex={0}>
      <title>{ariaLabel}</title>
      <desc>{nodes.length} nút dữ liệu, {links.length} liên kết.</desc>
      <g aria-label="Liên kết dữ liệu">
        {limitedLinks.map((link, index) => {
          const from = points.get(link.source);
          const to = points.get(link.target);
          if (!from || !to) return null;
          return (
            <line
              key={`${String(link.source)}-${String(link.target)}-${index}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="var(--line-strong)"
              strokeOpacity="0.35"
              strokeWidth={Math.max(0.5, Math.min(2, (link.value || 1) * 0.4))}
              strokeLinecap="round"
            />
          );
        })}
      </g>
      <g aria-label="Nút dữ liệu">
        {nodes.slice(0, 28).map((node) => {
          const point = points.get(node.id);
          if (!point) return null;
          return (
            <g key={node.id} role="group" aria-label={`${point.label} — ${point.group || "node"}`} tabIndex={0}>
              <circle
                cx={point.x}
                cy={point.y}
                r={4 + Math.min(7, (node.size || 1) * 2)}
                fill={point.color}
                stroke="var(--surface)"
                strokeWidth="1.5"
              />
              <text
                x={point.x}
                y={point.y - 10}
                textAnchor="middle"
                fontSize="9"
                fontWeight="600"
                fill="var(--ink)"
              >
                {point.label.length > 11 ? `${point.label.slice(0, 10)}…` : point.label}
              </text>
              <text x={point.x} y={point.y + 13} textAnchor="middle" fontSize="7" fill="var(--muted)">
                {point.group || "node"}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

export default function DataNetwork({ nodes, links, mode = "school", reducedMotion, height = 300, ariaLabel }: DataNetworkProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [prefersReduced, setPrefersReduced] = useState(false);
  const isReduced = reducedMotion ?? prefersReduced;
  const label = ariaLabel || (mode === "school" ? "Mạng dữ liệu lớp — kỹ năng" : "Mạng dữ liệu nhân tài — dự án — kỹ năng");

  useEffect(() => {
    const target = containerRef.current;
    if (!target || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.05 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReduced(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  const nodesLimit = useMemo(() => nodes.slice(0, 28), [nodes]);
  const linksLimit = useMemo(() => links.slice(0, 72), [links]);

  return (
    <figure
      ref={containerRef}
      className="relative overflow-hidden rounded-2xl border border-line bg-canvas-soft/30 text-ink"
      style={{ height }}
      aria-label={label}
    >
      <figcaption className="sr-only">{label}</figcaption>
      {!visible && (
        <div className="flex h-full items-center justify-center text-xs text-muted" aria-busy="true">Đang tải dữ liệu mạng…</div>
      )}
      {visible && isReduced && (
        <div className="h-full overflow-auto p-4 text-sm text-ink leading-relaxed">
          <h3 className="font-semibold mb-2 text-ink">{mode === "school" ? "Liên kết lớp — kỹ năng" : "Liên kết nhân tài — dự án — kỹ năng"}</h3>
          <ul className="space-y-1 text-xs text-muted" aria-label="Danh sách nút dữ liệu">
            {nodes.map((n) => (
              <li key={n.id} className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ background: n.color || GROUP_COLORS[n.group || "default"] || GROUP_COLORS.default }}
                  aria-hidden="true"
                />
                <span className="font-medium text-ink truncate">{n.label}</span>
                <span className="text-[10px] text-muted-light ml-auto">{n.group || "node"}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 text-[11px] text-muted-light">{links.length} liên kết dữ liệu</div>
        </div>
      )}
      {visible && !isReduced && (
        <div className="h-full w-full">
          <NetworkSvg nodes={nodesLimit} links={linksLimit} ariaLabel={label} />
        </div>
      )}
      {visible && !isReduced && nodes.length === 0 && (
        <div className="flex h-full items-center justify-center text-sm text-muted">Chưa có dữ liệu để hiển thị.</div>
      )}
    </figure>
  );
}
