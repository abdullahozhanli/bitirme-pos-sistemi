/**
 * ViewportProbe — dev-only width/overflow indicator
 * Shows current width; renders red OVERFLOW badge when horizontal scroll would appear.
 */
import React, { useEffect, useState } from 'react';

export default function ViewportProbe() {
  const [width, setWidth] = useState<number>(window.innerWidth);
  const [overflow, setOverflow] = useState<boolean>(false);

  useEffect(() => {
    const check = () => {
      setWidth(window.innerWidth);
      const doc = document.documentElement;
      setOverflow(doc.scrollWidth > window.innerWidth + 1);
    };
    check();
    window.addEventListener('resize', check);
    const ro = new ResizeObserver(check);
    ro.observe(document.documentElement);
    return () => {
      window.removeEventListener('resize', check);
      ro.disconnect();
    };
  }, []);

  if (!import.meta.env.DEV) return null;

  return (
    <div style={{ position: 'fixed', bottom: 12, right: 12, zIndex: 2000, display: 'flex', gap: 8 }} aria-live="polite">
      <span style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 12 }}>
        {width}px
      </span>
      {overflow && (
        <span style={{ padding: '6px 10px', borderRadius: 8, background: '#d32f2f', color: '#fff', fontWeight: 700 }}>
          OVERFLOW
        </span>
      )}
    </div>
  );
}








