import { useEffect } from 'react';

// The AdSense script itself is loaded once, globally, in index.html — Auto
// ads uses that alone to place ads across the site with no markup here. This
// component only renders a manual ad unit for the dashboard right rail, once
// VITE_ADSENSE_SLOT_RAIL is set to a real ad unit ID from the AdSense
// dashboard (see client/.env.example). Until then it renders nothing.
const CLIENT_ID = import.meta.env.VITE_ADSENSE_CLIENT_ID || 'ca-pub-1940314723028167';
const DEFAULT_SLOT = import.meta.env.VITE_ADSENSE_SLOT_RAIL;

export default function AdSlot({ slot = DEFAULT_SLOT, format = 'auto', className = '' }) {
  useEffect(() => {
    if (!slot) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error('AdSense failed to render ad unit', err);
    }
  }, [slot]);

  if (!slot) return null;

  return (
    <ins
      className={`adsbygoogle ad-slot ${className}`}
      style={{ display: 'block' }}
      data-ad-client={CLIENT_ID}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  );
}
