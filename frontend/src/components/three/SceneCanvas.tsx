import { useCallback, useRef } from "react";
import type { SceneAPI, SceneCanvasProps } from "./types";
import { useSceneRuntime } from "./useSceneRuntime";
import { SceneFallback } from "./SceneFallback";

/**
 * Lazy Three.js scene host. Each host owns one renderer and one animation
 * loop; the runtime pauses it offscreen, when the tab is hidden, or for
 * reduced-motion users. Consumers provide a static fallback for unsupported
 * devices and context loss.
 */
export function SceneCanvas({
  config,
  onReady,
  onError,
  className = "",
  fallback,
  children,
  buildScene,
  ariaLabel,
  decorative = true,
}: SceneCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const handleReady = useCallback(
    (api: SceneAPI | null, error?: Error) => {
      if (error) onError?.(error);
      onReady?.(api, error);
    },
    [onError, onReady]
  );

  const state = useSceneRuntime(config, canvasRef, buildScene, handleReady);
  const fallbackContent = fallback ?? children;
  const showFallback = state === "idle" || state === "loading" || state === "failed" || state === "unsupported" || state === "lost";

  return (
    <div
      className={className}
      data-scene-state={state}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 220,
        overflow: "hidden",
        isolation: "isolate",
      }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden={decorative ? true : undefined}
        aria-label={decorative ? undefined : ariaLabel}
        role={decorative ? undefined : "img"}
        style={{ display: "block", width: "100%", height: "100%", pointerEvents: "none" }}
      />
      {showFallback && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          {fallbackContent ?? <SceneFallback label={ariaLabel} />}
        </div>
      )}
    </div>
  );
}
