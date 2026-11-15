// Reusable scaled 2D vector dieline preview component used by Dashboard cards and Templates catalog
import { type DesignElement, resolveShapeGeometry } from '@entities/design-document';
import type { Dieline } from '@entities/dieline';

export interface DielinePreviewSvgProps {
  dieline: Dieline;
  elements?: readonly DesignElement[] | undefined;
  showSheetBackdrop?: boolean | undefined;
  ariaLabel?: string | undefined;
  testId?: string | undefined;
}

/**
 * Renders a self-contained scaled millimeter SVG preview of a Dieline (cuts, folds, and optional artwork).
 */
export function DielinePreviewSvg({
  dieline,
  elements = [],
  showSheetBackdrop = false,
  ariaLabel,
  testId,
}: DielinePreviewSvgProps) {
  const width = Math.max(10, dieline.totalWidth);
  const height = Math.max(10, dieline.totalHeight);
  const maxDim = Math.max(width, height);
  const pad = Math.max(6, Math.round(maxDim * 0.03));
  const cutStrokeWidth = Math.max(0.9, Number((maxDim * 0.0042).toFixed(2)));
  const foldStrokeWidth = Math.max(0.65, Number((maxDim * 0.003).toFixed(2)));
  const dashLength = Math.max(2, Math.round(maxDim * 0.012));
  const sortedElements =
    elements.length > 0 ? [...elements].sort((a, b) => a.zIndex - b.zIndex) : [];

  return (
    <svg
      data-testid={testId}
      viewBox={`${-pad} ${-pad} ${width + pad * 2} ${height + pad * 2}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      style={{ display: 'block' }}
    >
      {showSheetBackdrop && (
        <rect
          x={0}
          y={0}
          width={dieline.totalWidth}
          height={dieline.totalHeight}
          rx={2}
          fill="#ffffff"
        />
      )}
      <g>
        {dieline.cuts.map((cut) => (
          <path
            key={cut.id}
            d={cut.path}
            fill="#ffffff"
            stroke="#1b1b1f"
            strokeWidth={cutStrokeWidth}
            strokeLinejoin="round"
          />
        ))}
      </g>
      <g>
        {dieline.folds.map((fold) => (
          <line
            key={fold.id}
            x1={fold.from.x}
            y1={fold.from.y}
            x2={fold.to.x}
            y2={fold.to.y}
            stroke="#1976d2"
            strokeWidth={foldStrokeWidth}
            strokeDasharray={`${dashLength} ${dashLength}`}
          />
        ))}
      </g>
      {sortedElements.length > 0 && (
        <g>
          {sortedElements.map((el) => {
            if (el.type === 'shape') {
              const geom = resolveShapeGeometry(el);
              const transform =
                el.transform.rotation !== 0
                  ? `rotate(${el.transform.rotation} ${geom.centerX} ${geom.centerY})`
                  : undefined;
              const stroke = el.stroke || 'none';
              const strokeWidth = stroke !== 'none' ? el.strokeWidth : 0;

              if (geom.kind === 'ellipse') {
                return (
                  <ellipse
                    key={el.id}
                    cx={geom.cx}
                    cy={geom.cy}
                    rx={geom.rx}
                    ry={geom.ry}
                    fill={el.fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    opacity={el.opacity}
                    transform={transform}
                  />
                );
              }
              if (geom.kind === 'polygon') {
                return (
                  <polygon
                    key={el.id}
                    points={geom.pointsAttr}
                    fill={el.fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    opacity={el.opacity}
                    transform={transform}
                  />
                );
              }
              return (
                <rect
                  key={el.id}
                  x={geom.x}
                  y={geom.y}
                  width={geom.width}
                  height={geom.height}
                  fill={el.fill}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  opacity={el.opacity}
                  transform={transform}
                />
              );
            }

            if (el.type === 'text') {
              const transform =
                el.transform.rotation !== 0
                  ? `rotate(${el.transform.rotation} ${el.transform.x} ${el.transform.y})`
                  : undefined;
              return (
                <text
                  key={el.id}
                  x={el.transform.x}
                  y={el.transform.y}
                  fontFamily={el.style.fontFamily}
                  fontSize={el.style.fontSize}
                  fontWeight={el.style.fontWeight}
                  fill={el.style.color}
                  opacity={el.opacity}
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={transform}
                >
                  {el.content}
                </text>
              );
            }

            if (el.type === 'image') {
              const cx = el.transform.x + el.transform.width * 0.5;
              const cy = el.transform.y + el.transform.height * 0.5;
              const transform =
                el.transform.rotation !== 0
                  ? `rotate(${el.transform.rotation} ${cx} ${cy})`
                  : undefined;
              return (
                <image
                  key={el.id}
                  href={el.src}
                  x={el.transform.x}
                  y={el.transform.y}
                  width={el.transform.width}
                  height={el.transform.height}
                  preserveAspectRatio="xMidYMid meet"
                  opacity={el.opacity}
                  transform={transform}
                />
              );
            }

            return null;
          })}
        </g>
      )}
    </svg>
  );
}
