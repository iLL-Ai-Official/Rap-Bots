import { useEffect, useRef } from 'react';

interface AdBannerProps {
  slot: string;
  format?: 'auto' | 'fluid' | 'rectangle' | 'vertical' | 'horizontal';
  responsive?: boolean;
  className?: string;
}

/**
 * Google AdSense Banner Component
 * Displays ads for free tier users to monetize the app
 */
export function AdBanner({ 
  slot, 
  format = 'auto', 
  responsive = true,
  className = ''
}: AdBannerProps) {
  const adRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    // Only load ads if AdSense is available and element exists
    if (adRef.current && window.adsbygoogle) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (error) {
        console.error('AdSense error:', error);
      }
    }
  }, []);

  return (
    <div className={`ad-container ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={import.meta.env.VITE_ADSENSE_CLIENT_ID || 'ca-pub-XXXXXXXXXXXXXXXX'}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
}

// Declare global types for AdSense
declare global {
  interface Window {
    adsbygoogle: any[];
  }
}
