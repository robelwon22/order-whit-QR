'use client';

import React from 'react';
import { getDerivedButtonTextColor } from '../../lib/theme';

/**
 * Reusable Cafe Logo component.
 * Displays the uploaded cafe logo, or a neat circular fallback with the cafe's
 * first letter styled with the brand color and contrasting text.
 */
export function CafeLogo({
  logoUrl,
  name = 'Cafe',
  brandColor = '#6F4E37',
  size = 64,
  radius = '50%',
  border = '2px solid rgba(255, 255, 255, 0.2)',
  style = {},
  className = '',
}) {
  const initial = (name ? name.trim().charAt(0) : 'C').toUpperCase();
  const textColor = getDerivedButtonTextColor(brandColor);

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          objectFit: 'cover',
          border,
          boxShadow: 'var(--shadow-sm, 0 2px 8px rgba(0,0,0,0.08))',
          flexShrink: 0,
          ...style,
        }}
      />
    );
  }

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: radius,
        backgroundColor: brandColor,
        color: textColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-serif, serif)',
        fontWeight: 700,
        fontSize: Math.round(size * 0.44),
        border,
        boxShadow: 'var(--shadow-sm, 0 2px 8px rgba(0,0,0,0.08))',
        flexShrink: 0,
        userSelect: 'none',
        ...style,
      }}
    >
      {initial}
    </div>
  );
}

/**
 * HTML string helper for printed QR cards
 */
export function getCafeLogoHtml({ logoUrl, name = 'Cafe', brandColor = '#6F4E37', size = 44 }) {
  const initial = (name ? name.trim().charAt(0) : 'C').toUpperCase();
  const textColor = getDerivedButtonTextColor(brandColor);

  if (logoUrl) {
    return `<img src="${logoUrl}" alt="${name}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;border:1.5px solid #2B1D14;display:inline-block;vertical-align:middle;" />`;
  }

  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background-color:${brandColor};color:${textColor};display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:${Math.round(
    size * 0.46
  )}px;font-family:serif;vertical-align:middle;">${initial}</div>`;
}
