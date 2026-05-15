'use client';

/**
 * RIX Logo — Uses the custom RIX wordmark image.
 * Supports dark (white logo) and light (black logo) variants.
 */

import Image from 'next/image';

interface RixLogoProps {
  size?: number;
  variant?: 'dark' | 'light'; // dark = white logo (for dark bg), light = black logo (for light bg)
}

export function RixLogo({ size = 32, variant = 'dark' }: RixLogoProps) {
  const height = size;
  const width = Math.round(size * 2.8);
  const src = variant === 'dark' ? '/rix-logo-white.png' : '/rix-logo-black.png';

  return (
    <Image
      src={src}
      alt="RIX"
      width={width}
      height={height}
      className="object-contain"
      priority
    />
  );
}

export function RixLogoText({ size = 32, variant = 'dark' }: RixLogoProps) {
  return (
    <div className="flex items-center gap-2">
      <RixLogo size={size} variant={variant} />
    </div>
  );
}
