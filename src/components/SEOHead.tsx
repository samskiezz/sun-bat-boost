import { useEffect } from 'react';

interface SEOHeadProps {
  results?: any;
  location?: string;
}

export const SEOHead = ({ results, location }: SEOHeadProps) => {
  useEffect(() => {
    // Dynamic title based on results
    const baseTitle = "Solar & Battery Rebate Calculator 2025 Australia";
    const locationTitle = location ? `${baseTitle} | ${location}` : baseTitle;
    const rebateTitle = results?.totals?.today 
      ? `$${results.totals.today.toLocaleString()} Solar Rebates Available | ${locationTitle}`
      : locationTitle;
    
    document.title = rebateTitle;

    // Meta description with dynamic content
    const description = results?.totals?.today 
      ? `Calculate your $${results.totals.today.toLocaleString()} solar & battery rebates. Get federal STCs, state rebates & VPP bonuses. CEC-approved calculator for 2025 Australian solar incentives.`
      : "Official 2025 Australian solar & battery rebate calculator. Get federal STCs, state rebates, VPP bonuses & financing options. CEC-approved data. Save $1000s on solar installation.";
    
    // Remove existing meta tags
    const existingMetas = document.querySelectorAll('meta[data-seo="dynamic"]');
    existingMetas.forEach(meta => meta.remove());

    // Add comprehensive meta tags
    const metaTags = [
      { name: "description", content: description },
      { name: "keywords", content: "solar rebates 2025, battery rebates Australia, STC calculator, solar incentives, VPP bonus, CEC approved, federal solar rebates, state solar rebates, NSW solar rebates, QLD solar rebates, VIC solar rebates, WA solar rebates, SA solar rebates, TAS solar rebates, ACT solar rebates, NT solar rebates, solar panel rebates, battery storage rebates, renewable energy incentives, solar power calculator, energy savings calculator, rooftop solar rebates, home battery rebates, solar installation rebates, green energy rebates, sustainable energy calculator, solar return on investment, energy independence calculator, climate action rebates, clean energy calculator" },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
      { name: "googlebot", content: "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" },
      { name: "bingbot", content: "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" },
      { name: "author", content: "Hilts Group Solar Experts" },
      { name: "publisher", content: "Hilts Group" },
      { name: "coverage", content: "Australia" },
      { name: "distribution", content: "global" },
      { name: "rating", content: "general" },
      { name: "revisit-after", content: "1 day" },
      { name: "language", content: "en-AU" },
      { name: "geo.region", content: "AU" },
      { name: "geo.country", content: "Australia" },
      { name: "ICBM", content: "-25.2744, 133.7751" },
      { name: "DC.title", content: document.title },
      { name: "DC.description", content: description },
      { name: "DC.subject", content: "Solar Energy Calculator, Renewable Energy Rebates" },
      { name: "DC.type", content: "Interactive Calculator" },
      { name: "DC.format", content: "text/html" },
      { name: "DC.language", content: "en-AU" },
      { name: "DC.coverage", content: "Australia" },
      
      // Open Graph tags
      { property: "og:title", content: document.title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: window.location.href },
      { property: "og:site_name", content: "Australian Solar Rebate Calculator" },
      { property: "og:locale", content: "en_AU" },
      { property: "og:country-name", content: "Australia" },
      
      // Twitter Card tags
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: document.title },
      { name: "twitter:description", content: description },
      { name: "twitter:creator", content: "@HiltsGroup" },
      { name: "twitter:site", content: "@HiltsGroup" },
      
      // Mobile optimization
      { name: "viewport", content: "width=device-width, initial-scale=1, shrink-to-fit=no" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "Solar Calculator" },
      { name: "application-name", content: "Solar Rebate Calculator" },
      { name: "msapplication-TileColor", content: "#8B5CF6" },
      { name: "theme-color", content: "#8B5CF6" },
      
      // Schema.org microdata indicators
      { name: "schema.org", content: "https://schema.org/WebApplication" },
      
      // Preconnect for performance
      { name: "dns-prefetch", content: "//fonts.googleapis.com" },
      { name: "dns-prefetch", content: "//fonts.gstatic.com" },
      { name: "preconnect", content: "https://fonts.googleapis.com" },
      { name: "preconnect", content: "https://fonts.gstatic.com" },
      
      // Security
      { "http-equiv": "Content-Security-Policy", content: "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:;" },
      { "http-equiv": "X-Content-Type-Options", content: "nosniff" },
      { "http-equiv": "X-Frame-Options", content: "DENY" },
      { "http-equiv": "Referrer-Policy", content: "strict-origin-when-cross-origin" },
      
      // Cache control
      { "http-equiv": "Cache-Control", content: "public, max-age=3600" },
      
      // AI and search engine specific
      { name: "google-site-verification", content: "pending" },
      { name: "msvalidate.01", content: "pending" },
      { name: "yandex-verification", content: "pending" },
      { name: "baidu-site-verification", content: "pending" },
      { name: "facebook-domain-verification", content: "pending" },
      { name: "google", content: "notranslate" },
      { name: "format-detection", content: "telephone=no, address=no, email=no" },
      
      // Rich snippets hints
      { name: "price", content: results?.totals?.today ? `$${results.totals.today}` : "Free Calculator" },
      { name: "priceCurrency", content: "AUD" },
      { name: "availability", content: "InStock" },
      { name: "category", content: "Solar Energy Calculator" },
      { name: "brand", content: "Hilts Group" },
      
      // Accessibility
      { name: "accessibility", content: "WCAG 2.1 AA compliant" },
      { name: "color-scheme", content: "light dark" },
      
      // Performance hints
      { name: "resource-type", content: "document" },
      { name: "cache-control", content: "public, max-age=3600, stale-while-revalidate=86400" },
    ];

    metaTags.forEach(({ name, property, content, "http-equiv": httpEquiv }) => {
      const meta = document.createElement('meta');
      if (name) meta.name = name;
      if (property) meta.setAttribute('property', property);
      if (httpEquiv) meta.setAttribute('http-equiv', httpEquiv);
      meta.content = content;
      meta.setAttribute('data-seo', 'dynamic');
      document.head.appendChild(meta);
    });

    // Add canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = window.location.href.split('?')[0];

    // Add hreflang for different regions
    const hreflangs = [
      { lang: 'en-AU', href: window.location.href },
      { lang: 'en', href: window.location.href },
      { lang: 'x-default', href: window.location.href }
    ];

    hreflangs.forEach(({ lang, href }) => {
      let hreflang = document.querySelector(`link[hreflang="${lang}"]`) as HTMLLinkElement;
      if (!hreflang) {
        hreflang = document.createElement('link');
        hreflang.rel = 'alternate';
        hreflang.setAttribute('hreflang', lang);
        document.head.appendChild(hreflang);
      }
      hreflang.href = href;
    });

    // Add JSON-LD structured data
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": ["WebApplication", "SoftwareApplication", "Calculator"],
      "name": "Australian Solar & Battery Rebate Calculator 2025",
      "description": description,
      "url": window.location.href,
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web Browser",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "AUD",
        "availability": "https://schema.org/InStock"
      },
      "provider": {
        "@type": "Organization",
        "name": "Hilts Group",
        "url": "https://hiltsgroup.com.au",
        "logo": "https://hiltsgroup.com.au/logo.png",
        "address": {
          "@type": "PostalAddress",
          "addressCountry": "AU"
        }
      },
      "audience": {
        "@type": "Audience",
        "audienceType": "Australian homeowners and businesses",
        "geographicArea": {
          "@type": "Country",
          "name": "Australia"
        }
      },
      "about": [
        {
          "@type": "Thing",
          "name": "Solar Panel Rebates",
          "description": "Federal and state rebates for solar panel installations"
        },
        {
          "@type": "Thing", 
          "name": "Battery Storage Rebates",
          "description": "Government incentives for home battery storage systems"
        },
        {
          "@type": "Thing",
          "name": "Virtual Power Plant Bonuses",
          "description": "Additional incentives for joining VPP programs"
        }
      ],
      "featureList": [
        "Calculate federal STC rebates",
        "Calculate state-specific rebates",
        "VPP bonus calculations",
        "CEC-approved product database",
        "Real-time rebate updates",
        "Postcode-specific calculations",
        "Installation date optimization"
      ],
      "isAccessibleForFree": true,
      "browserRequirements": "Modern web browser with JavaScript enabled"
    };

    // Remove existing JSON-LD
    const existingJsonLd = document.querySelector('script[type="application/ld+json"][data-seo="dynamic"]');
    if (existingJsonLd) {
      existingJsonLd.remove();
    }

    // Add new JSON-LD
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-seo', 'dynamic');
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);

  }, [results, location]);

  return null;
};