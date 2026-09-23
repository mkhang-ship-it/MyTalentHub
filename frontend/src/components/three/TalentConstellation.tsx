import { RobotMascot, type RobotMascotProps } from "./RobotMascot";

/** Re-export for backward compatibility */
export type TalentConstellationProps = RobotMascotProps;

/**
 * TalentConstellation now renders the Robot Mascot.
 * The original procedural constellation has been replaced by the GLTF robot model.
 * Kept the same prop interface for backward compatibility.
 */
export function TalentConstellation({
  className = "",
  fallback,
  ariaLabel = "Robot mascot — F Talent Hub",
  onError,
  onReady,
  ...rest
}: TalentConstellationProps) {
  return (
    <RobotMascot
      className={className}
      fallback={fallback}
      ariaLabel={ariaLabel}
      onError={onError}
      onReady={onReady}
      rotationSpeed={0.25}
      bobAmplitude={0.08}
      bobFrequency={0.6}
      {...rest}
    />
  );
}