import { useEffect } from 'react';
import { useLocation } from 'wouter';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  type?: string;
  canonicalUrl?: string;
  keywords?: string[];
  structuredData?: any;
}

const DEFAULT_SEO = {
  title: 'Battle Rap AI - Epic Voice-Powered Rap Battles Against AI',
  description: 'Face off against AI in epic rap battles with real-time voice scoring and authentic TTS. Master your flow and climb the ranks.',
  image: '/social-card.png',
  type: 'website',
  keywords: ['rap battle', 'AI', 'voice recognition', 'hip hop', 'battle rap', 'freestyle', 'TTS', 'real-time', 'competitive']
};

export function SEO({
  title,
  description,
  image,
  type = 'website',
  canonicalUrl,
  keywords,
  structuredData
}: SEOProps) {
  const [location] = useLocation();
  
  // Construct full URL for canonical and Open Graph
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://rapbots.online';
  const fullUrl = canonicalUrl || `${baseUrl}${location}`;
  
  const seoTitle = title || DEFAULT_SEO.title;
  const seoDescription = description || DEFAULT_SEO.description;
  const seoImage = image || DEFAULT_SEO.image;
  const seoImageUrl = seoImage.startsWith('http') ? seoImage : `${baseUrl}${seoImage}`;
  const seoKeywords = keywords || DEFAULT_SEO.keywords;

  useEffect(() => {
    // Update document title
    document.title = seoTitle;

    // Update or create meta tags
    const updateMetaTag = (name: string, content: string, property = false) => {
      const attribute = property ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${name}"]`);
      
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      
      element.setAttribute('content', content);
    };

    // Standard meta tags
    updateMetaTag('description', seoDescription);
    updateMetaTag('keywords', seoKeywords.join(', '));

    // Open Graph tags
    updateMetaTag('og:type', type, true);
    updateMetaTag('og:title', seoTitle, true);
    updateMetaTag('og:description', seoDescription, true);
    updateMetaTag('og:image', seoImageUrl, true);
    updateMetaTag('og:url', fullUrl, true);

    // Twitter tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', seoTitle);
    updateMetaTag('twitter:description', seoDescription);
    updateMetaTag('twitter:image', seoImageUrl);

    // Canonical URL
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = fullUrl;

    // Structured Data (JSON-LD)
    if (structuredData) {
      let scriptTag = document.querySelector('script[type="application/ld+json"][data-dynamic]') as HTMLScriptElement;
      
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.type = 'application/ld+json';
        scriptTag.setAttribute('data-dynamic', 'true');
        document.head.appendChild(scriptTag);
      }
      
      scriptTag.textContent = JSON.stringify(structuredData);
    }
  }, [seoTitle, seoDescription, seoImageUrl, fullUrl, type, seoKeywords, structuredData]);

  return null;
}

// Page-specific structured data generators
export const generateWebPageStructuredData = (
  title: string,
  description: string,
  url: string
) => ({
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": title,
  "description": description,
  "url": url,
  "isPartOf": {
    "@type": "WebSite",
    "name": "Battle Rap AI",
    "url": "https://rapbots.online"
  }
});

export const generateBattleArenaStructuredData = () => ({
  "@context": "https://schema.org",
  "@type": "Game",
  "name": "Battle Rap AI Arena",
  "description": "Voice-powered rap battle arena where you face off against AI opponents",
  "gameItem": {
    "@type": "Thing",
    "name": "Voice Battle System"
  },
  "numberOfPlayers": {
    "@type": "QuantitativeValue",
    "value": 2
  }
});

export const generateTournamentStructuredData = (
  tournamentName: string,
  status: string,
  rounds: number
) => ({
  "@context": "https://schema.org",
  "@type": "SportsEvent",
  "name": tournamentName,
  "eventStatus": status === 'active' ? 'EventScheduled' : 'EventCompleted',
  "sport": "Rap Battle",
  "numberOfGames": rounds
});

export const generateBreadcrumbStructuredData = (items: Array<{ name: string; url: string }>) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": items.map((item, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "name": item.name,
    "item": item.url
  }))
});
