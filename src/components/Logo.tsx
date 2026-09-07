import type { ImgHTMLAttributes } from 'react';

interface LogoProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
  height?: number;
}

export function Logo({ height = 22, style, ...rest }: LogoProps) {
  return (
    <img
      src="/cirrus-logo.png"
      alt="Cirrus"
      style={{ height, width: 'auto', display: 'block', ...style }}
      {...rest}
    />
  );
}
