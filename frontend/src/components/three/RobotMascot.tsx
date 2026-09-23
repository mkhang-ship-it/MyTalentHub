import { useEffect, useRef, useState, useCallback } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { SceneCanvas } from "./SceneCanvas";
import type { SceneBuilder, SceneCanvasProps } from "./types";

const MODEL_PATH = "/models/robot-mascot.glb";

type RobotMotion = {
  pointerX: number;
  pointerY: number;
  wave: number;
  rotationY: number;
  currentYaw: number;
  dragging: boolean;
  moved: boolean;
  activePointerId: number | null;
  startX: number;
  lastX: number;
};

export interface RobotMascotProps extends Omit<SceneCanvasProps, "buildScene"> {
  fallback?: ReactNode;
  /** Rotation speed in radians per second. Default: 0.25 */
  rotationSpeed?: number;
  /** Bob amplitude in units. Default: 0.08 */
  bobAmplitude?: number;
  /** Bob frequency in Hz. Default: 0.6 */
  bobFrequency?: number;
}

function RobotFallback() {
  return (
    <svg
      width="150"
      height="150"
      viewBox="0 0 150 150"
      fill="none"
      aria-hidden="true"
    >
      <rect x="45" y="30" width="60" height="70" rx="8" stroke="#A1458F" strokeWidth="2" opacity="0.6" />
      <circle cx="60" cy="50" r="6" fill="#A1458F" opacity="0.8" />
      <circle cx="90" cy="50" r="6" fill="#A1458F" opacity="0.8" />
      <rect x="55" y="70" width="40" height="4" rx="2" fill="#A1458F" opacity="0.6" />
      <rect x="30" y="100" width="90" height="4" rx="2" stroke="#27308E" strokeWidth="2" opacity="0.5" />
      <circle cx="45" cy="102" r="3" fill="#9B6AB5" />
      <circle cx="105" cy="102" r="3" fill="#C44296" />
      <rect x="50" y="40" width="50" height="1.5" fill="#FFC107" opacity="0.5" />
    </svg>
  );
}

function createRobotScene(
  three: typeof import("three"),
  model: import("three").Group,
  options: { rotationSpeed: number; bobAmplitude: number; bobFrequency: number },
  motion: RobotMotion
): ReturnType<SceneBuilder> {
  const root = new three.Group();
  root.add(model);

  // Center and scale model to fit in a ~2 unit box
  const box = new three.Box3().setFromObject(model);
  const size = new three.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = maxDim > 0 ? 2.65 / maxDim : 1;
  model.scale.setScalar(scale);

  const center = new three.Vector3();
  box.getCenter(center);
  model.position.sub(center.clone().multiplyScalar(scale));
  return {
    root,
    update: (delta, time) => {
      if (!motion.dragging) motion.rotationY += delta * options.rotationSpeed;
      const smoothing = 1 - Math.exp(-delta * 7);
      if (motion.dragging) {
        root.rotation.y = motion.rotationY;
      } else {
        root.rotation.y += (motion.rotationY - root.rotation.y) * smoothing;
      }
      motion.currentYaw = root.rotation.y;
      const targetPitch = -motion.pointerY * 0.18;
      root.rotation.x += (targetPitch - root.rotation.x) * smoothing;
      root.rotation.z += (Math.sin(time * 0.7) * 0.018 - root.rotation.z) * smoothing;

      if (motion.wave > 0) {
        root.rotation.y += delta * motion.wave * 2.8;
        root.position.y = Math.sin((1 - motion.wave) * Math.PI) * 0.14;
        motion.wave = Math.max(0, motion.wave - delta * 0.85);
      } else if (options.bobAmplitude && options.bobFrequency) {
        root.position.y = Math.sin(time * options.bobFrequency * Math.PI * 2) * options.bobAmplitude;
      }
    },
  };
}

export function RobotMascot({
  className = "",
  fallback = <RobotFallback />,
  ariaLabel = "Robot mascot — F Talent Hub",
  onError,
  onReady,
  rotationSpeed = 0.25,
  bobAmplitude = 0.08,
  bobFrequency = 0.6,
  config,
  ...rest
}: RobotMascotProps) {
  const [canRender3D, setCanRender3D] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const modelRef = useRef<import("three").Group | null>(null);
  const cancelledRef = useRef(false);
  const handleError = useCallback((error: Error) => {
    setLoadError(error);
    onError?.(error);
  }, [onError]);
  const motionRef = useRef<RobotMotion>({
    pointerX: 0,
    pointerY: 0,
    wave: 0,
    rotationY: 0,
    currentYaw: 0,
    dragging: false,
    moved: false,
    activePointerId: null,
    startX: 0,
    lastX: 0,
  });
  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const motion = motionRef.current;
    const bounds = event.currentTarget.getBoundingClientRect();
    motion.pointerX = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / Math.max(bounds.width, 1) - 0.5) * 2));
    motion.pointerY = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / Math.max(bounds.height, 1) - 0.5) * 2));
    if (!motion.dragging || motion.activePointerId !== event.pointerId) return;
    const deltaX = event.clientX - motion.lastX;
    if (Math.abs(event.clientX - motion.startX) > 4) motion.moved = true;
    motion.rotationY += deltaX * 0.012;
    motion.lastX = event.clientX;
  }, []);
  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const motion = motionRef.current;
    motion.dragging = true;
    motion.moved = false;
    motion.activePointerId = event.pointerId;
    motion.startX = event.clientX;
    motion.lastX = event.clientX;
    motion.rotationY = motion.currentYaw;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, []);
  const handlePointerLeave = useCallback(() => {
    if (!motionRef.current.dragging) {
      motionRef.current.pointerX = 0;
      motionRef.current.pointerY = 0;
    }
  }, []);
  const handleWave = useCallback(() => {
    motionRef.current.wave = 1;
  }, []);
  const handlePointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const motion = motionRef.current;
    if (motion.activePointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    motion.dragging = false;
    motion.activePointerId = null;
    if (!motion.moved) handleWave();
  }, [handleWave]);
  const handlePointerCancel = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const motion = motionRef.current;
    if (motion.activePointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    motion.dragging = false;
    motion.activePointerId = null;
  }, []);
  const handleKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleWave();
    }
  }, [handleWave]);

  useEffect(() => {
    const media = window.matchMedia?.("(min-width: 1024px)");
    if (!media) return;
    const update = () => setCanRender3D(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    if (!canRender3D) return;
    cancelledRef.current = false;
    setLoadError(null);
    setModelLoaded(false);

    async function loadModel() {
      try {
        const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(MODEL_PATH);
        if (cancelledRef.current) return;

        modelRef.current = gltf.scene;
        setModelLoaded(true);
      } catch (err) {
        if (cancelledRef.current) return;
        const error = err instanceof Error ? err : new Error(String(err));
        handleError(error);
      }
    }

    void loadModel();

    return () => {
      cancelledRef.current = true;
    };
  }, [canRender3D, handleError]);

  const buildScene = useCallback<SceneBuilder>(
    (three) => {
      if (!modelRef.current) {
        // Return a minimal placeholder scene while model loads
        const root = new three.Group();
        return {
          root,
          update: () => {},
        };
      }
      return createRobotScene(three, modelRef.current, { rotationSpeed, bobAmplitude, bobFrequency }, motionRef.current);
    },
    [rotationSpeed, bobAmplitude, bobFrequency]
  );

  const showFallback = !canRender3D || !modelLoaded || loadError !== null;

  return (
    <div
      className={`${className} cursor-grab active:cursor-grabbing`}
      style={{ position: "relative", width: "100%", height: "100%", minHeight: 260, touchAction: "pan-y" }}
      data-robot-state={showFallback ? "fallback" : "ready"}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onKeyDown={handleKeyDown}
      role={showFallback ? undefined : "button"}
      tabIndex={showFallback ? undefined : 0}
      aria-label={showFallback ? ariaLabel : `${ariaLabel}. Kéo để xoay 360 độ, nhấn để robot đánh chào`}
    >
      {showFallback ? (
        <div className="absolute inset-0 flex items-center justify-center" aria-label={ariaLabel} role="img">
          {fallback}
        </div>
      ) : (
        <SceneCanvas
          className="absolute inset-0"
          config={{
            sceneId: "robot-mascot",
            dprCap: 1.5,
            failIfMajorPerformanceCaveat: true,
            prefersReducedMotion: true,
            ...config,
          }}
          buildScene={buildScene}
          fallback={fallback}
          ariaLabel={ariaLabel}
          decorative={false}
          onError={handleError}
          onReady={onReady}
          {...rest}
        />
      )}
    </div>
  );
}