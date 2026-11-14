// Material Symbols Outlined variable icon wrapper following M3 icon tokens
export type M3IconWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700;

export interface M3IconProps {
  name: string;
  size?: number | undefined;
  filled?: boolean | undefined;
  weight?: M3IconWeight | undefined;
  className?: string | undefined;
  ariaLabel?: string | undefined;
}

export function M3Icon({
  name,
  size = 24,
  filled = false,
  weight = 400,
  className,
  ariaLabel,
}: M3IconProps) {
  const fillValue = filled ? 1 : 0;
  const opsz = Math.min(48, Math.max(20, size));

  return (
    <span
      className={className ? `material-symbols-outlined ${className}` : 'material-symbols-outlined'}
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
      style={{
        fontSize: `${size}px`,
        width: `${size}px`,
        height: `${size}px`,
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        userSelect: 'none',
        fontVariationSettings: `'FILL' ${fillValue}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${opsz}`,
      }}
    >
      {name}
    </span>
  );
}
