import { useEffect } from 'react';

// Populated once you have a real AdSense account — see client/.env.example.
// Until then this renders a plain placeholder box so the layout can be built
// and reviewed without loading anything from Google or shipping a broken ad
// script tag.
const CLIENT_ID = import.meta.env.VITE_ADSENSE_CLIENT_ID;
const DEFAULT_SLOT = import.meta.env.VITE_ADSENSE_SLOT_RAIL;

let scriptLoadPromise = null;

function loadAdSenseScript(clientId) {
  if (!scriptLoadPromise) {
    scriptLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  return scriptLoadPromise;
}

export default function AdSlot({ slot = DEFAULT_SLOT, format = 'auto', className = '' }) {
  const configured = Boolean(CLIENT_ID && slot);

  useEffect(() => {
    if (!configured) return;
    loadAdSenseScript(CLIENT_ID)
      .then(() => {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      })
      .catch((err) => console.error('AdSense failed to load', err));
  }, [configured]);

  if (!configured) {
    return (
      <div className={`ad-slot ad-placeholder ${className}`}>
        <span>Ad space</span>
      </div>
    );
  }

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
