// M3-styled IconButton wrapper supporting optional tooltip feedback when disabled
import IconButton, { type IconButtonProps } from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { M3Icon, type M3IconWeight } from '@shared/ui/M3Icon';

export interface M3IconButtonProps extends IconButtonProps {
  icon: string;
  label: string;
  iconSize?: number | undefined;
  filled?: boolean | undefined;
  weight?: M3IconWeight | undefined;
  tooltip?: string | undefined;
}

export function M3IconButton({
  icon,
  label,
  iconSize = 24,
  filled = false,
  weight = 400,
  tooltip,
  disabled,
  sx,
  ...rest
}: M3IconButtonProps) {
  const button = (
    <IconButton
      aria-label={label}
      {...(disabled !== undefined ? { disabled } : {})}
      sx={[
        {
          color: 'var(--md-sys-color-on-surface-variant)',
          borderRadius: '9999px',
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
      {...rest}
    >
      <M3Icon name={icon} size={iconSize} filled={filled} weight={weight} />
    </IconButton>
  );

  if (!tooltip) {
    return button;
  }

  return (
    <Tooltip title={tooltip}>
      <span>{button}</span>
    </Tooltip>
  );
}
