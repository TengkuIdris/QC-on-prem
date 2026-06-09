# SEO Strategies for React + Vite Landing Pages: 2025 Guide for KaizenHub

**React Helmet is effectively dead, but your Vite + React stack can achieve excellent SEO without a complete rewrite.** For a POC-stage B2B SaaS startup, the most practical approach is implementing pre-rendering solutions that maintain your existing codebase while delivering server-side HTML to search engines and social media crawlers. Quick optimizations can provide 40-60% of SEO benefits in 1-2 weeks, while more comprehensive solutions require 2-4 weeks but deliver 80%+ improvement.

The critical insight: client-side rendering fundamentally fails for social media sharing (Facebook, LinkedIn, Twitter crawlers execute zero JavaScript), and Google's JavaScript rendering introduces median 10-second delays that can harm rankings. However, modern Vite plugins and pre-rendering tools solve these problems without requiring migration to heavyweight frameworks.

## React Helmet status and the CSR metadata problem

Both react-helmet and react-helmet-async are effectively abandoned as of 2025, with react-helmet-async breaking on React 19 installations. A new fork (@dr.pogodin/react-helmet) emerged in April 2025, but this misses the fundamental issue: **client-side meta tags only appear in the browser DOM, not in the initial HTML response that search engines and social media crawlers read.**

React 19 introduced native document metadata support, allowing you to render `<title>` and `<meta>` tags directly in components that automatically hoist to the `<head>`. While elegant for client-side applications, this still produces meta tags via JavaScript execution. The Vercel/MERJ study analyzing 37,000+ pages found that **Google's median rendering delay is 10 seconds, with 90th percentile reaching 3 hours and 99th percentile extending to 18 hours**. For time-sensitive launches or competitive keywords, these delays are commercially unacceptable.

**The social media crawler problem is absolute**: Facebook, LinkedIn, and Twitter crawlers execute zero JavaScript. They read only the initial HTML response. This means React Helmet, react-helmet-async, and React 19's native features are **100% ineffective for social sharing**. When someone shares your landing page on LinkedIn (critical for B2B), they'll see blank previews without server-side meta tags. Multiple case studies confirm this - even Twitter serves SSR HTML to crawler user agents while delivering CSR to regular users.

For B2B SaaS landing pages where LinkedIn sharing drives customer acquisition, client-side meta tag management isn't just suboptimal - it's fundamentally broken. Your beautiful Open Graph images and compelling descriptions never reach the crawlers.

## Client-side rendering limitations for landing pages

The CSR limitations extend beyond meta tags to core business metrics. Real-world case studies show consistent patterns: **SSR migrations deliver 40-100% organic traffic increases**. Silkfred saw 2x traffic growth after moving pagination to SSR. Airtable achieved 40-50% uplift from their full CSR-to-SSR migration. A Prerender.io implementation (dynamic rendering service) doubled organic traffic with no other changes.

Google's official documentation explicitly warns that "dynamic rendering is a workaround and not a long-term solution," recommending SSR, static rendering, or hydration instead. Their March 2025 update added prominent warnings about treating JavaScript rendering as primary strategy.

**The two-wave indexing problem persists**: Google first crawls your HTML skeleton, then queues pages for JavaScript rendering in the Web Rendering Service. While Google successfully renders 100% of properly configured pages, the timing distribution is problematic. Only 25% render within 4 seconds, 50% take 10+ seconds, and the tail extends to hours. For landing pages competing in active markets, faster-loading SSR competitors can establish rankings while your pages sit in rendering queues.

The emerging AI crawler challenge compounds this. As of December 2024, AI crawlers (ChatGPT, Claude, Perplexity) represent 28% of Googlebot's volume across the Vercel network, and **most AI crawlers don't execute JavaScript**. Only Google's Gemini (using Googlebot infrastructure) can render CSR apps. As AI-powered search grows, CSR sites become increasingly invisible to these discovery channels.

For a Japanese B2B SaaS landing page in POC phase with interested companies, these limitations create specific risks: delayed Google indexing when you need immediate visibility, broken social sharing when prospects share your product on LinkedIn, and invisibility to AI assistants that potential customers might query about problem-solving tools.

## Practical solutions: Staying with Vite + React

The good news: **you don't need to abandon your Vite + React + TypeScript stack**. Multiple modern solutions provide SSR/SSG capabilities while preserving your existing codebase. Based on 2024-2025 developments, here are your options ranked by implementation complexity and suitability for POC-stage startups:

### Quick wins: vite-prerender-plugin (1-2 days implementation)

The Preact team's vite-prerender-plugin offers true "drop-in" pre-rendering with minimal code changes. You add the plugin to your Vite config, create a prerender function that renders your React app to string, and mark your script with a prerender attribute. The plugin automatically generates static HTML for specified routes during build.

**Implementation**: Install the plugin, add it to vite.config, create a simple prerender function using `renderToString()`, and specify which routes to pre-render. Your existing React components require zero modifications. **TypeScript compatibility is excellent**, and the Preact team emphasizes this as a "no lock-in" solution you can toggle on/off.

**Best for**: Quick SEO improvements when you need visibility now but can't pause feature development for weeks. Ideal for landing pages with relatively static content. Gets you 40-60% of SEO benefits for 10% of migration effort.

### Production-ready: Vike (formerly vite-plugin-ssr) (1-2 weeks)

Vike represents the most mature Vite-native SSR/SSG solution, positioned as a "Next.js alternative" built on Vite. After renaming from vite-plugin-ssr in 2024, it offers comprehensive features with active development and production deployments at companies like Redwood Materials.

**Implementation**: Install vike and vike-react extension, restructure pages into Vike's file-based routing (`/pages/index/+Page.tsx`), add a global config enabling pre-rendering (`prerender: true`), and define rendering functions. The vike-react extension significantly reduces boilerplate. For dynamic routes, implement `onBeforePrerenderStart` to generate route parameters.

**TypeScript support is excellent** with full type inference. Code changes are low-to-medium - primarily restructuring into Vike's conventions rather than rewriting components. Your existing React components can be imported directly into Vike pages. Build process changes to `vike build`, which handles client bundle, server bundle, and pre-rendering in one command.

**Best for**: Long-term production applications where you want framework-like features (data fetching, head management, routing) without switching to Next.js or Remix. Offers flexibility to mix SSG, SSR, and CSR per route. Strong choice if you anticipate growing beyond simple landing pages.

### React Router users: vite-react-ssg (1 week)

If you're using React Router v6, vite-react-ssg provides natural integration by wrapping React Router with static generation capabilities. It leverages your existing router setup and loaders, making migration smoother than other solutions.

**Implementation**: Install vite-react-ssg and change your main entry to use `ViteReactSSG()` instead of `createBrowserRouter()`. Update build scripts to `vite-react-ssg build`. For dynamic routes, add `getStaticPaths()` functions returning arrays of paths to pre-render. Your routing logic, components, and TypeScript types largely remain unchanged.

**Features include**: SSR during development (optional), critical CSS extraction with beasties, React Helmet integration for meta tags, and concurrent pre-rendering (20 workers default). The project is actively maintained with React 19 support coming.

**Best for**: Existing React Router v6 projects where you want to preserve routing architecture. Note that React Router v7 (released late 2024) now includes native pre-rendering support - if upgrading to v7 is feasible, use `prerender: true` in react-router.config.ts instead.

### React Router v7: Native pre-rendering (1 week if migrating from v6)

React Router v7's native pre-rendering represents an official solution that eliminates dependency on third-party plugins. Simply set `prerender: true` in your React Router config to generate static HTML for all routes. For static-only mode (no runtime server), combine `ssr: false` with `prerender: true` for pure SSG.

**Implementation**: If starting fresh, use `npx create-react-router@latest`. If migrating from v6, upgrade packages and update configuration. The pre-rendering configuration is declarative and TypeScript-native. Users report "Lighthouse scores of 99+ across the board."

**Best for**: New projects or those willing to upgrade React Router. Provides official support from the React Router team rather than relying on community plugins. May reduce the need for separate SSG tools as ecosystem matures.

### Vite native SSR: Maximum control (2-3 weeks)

Vite's built-in SSR support offers maximum flexibility but requires the most manual setup. You create separate entry points for client and server, configure an Express server with Vite middleware, and implement hydration on the client. For SSG, add a custom prerender script that imports your server entry and generates HTML files for specified routes.

**Implementation**: Create `entry-client.tsx` (uses `hydrateRoot()`), `entry-server.tsx` (uses `renderToString()`), and `server.js` (Express with Vite middleware). Configure separate build commands for client and server bundles. TypeScript compatibility is excellent as you control the entire pipeline.

**Best for**: Teams wanting deep understanding of SSR mechanics, custom requirements not served by frameworks, or those building reusable patterns across multiple projects. Good learning foundation but higher maintenance burden.

## Comparing Vite solutions to meta-frameworks

The meta-framework question - "should we switch to Next.js, Remix, Astro, or TanStack Start?" - requires honest cost-benefit analysis for a POC-stage startup.

**Next.js** remains the industry standard with 36%+ developer adoption, comprehensive features (ISR, RSC, edge rendering), and the largest ecosystem. However, migration from Vite + React to Next.js App Router requires 3-6 weeks of engineering time, learning the Server Components mental model (steep curve), and restructuring to file-based routing. JavaScript bundles are heavier (~566 KB baseline) and only 25-30% of Next.js sites pass Core Web Vitals assessment. Real cost including hidden expenses: **$8,000-$16,000** at typical developer rates. Next.js excels for e-commerce, dynamic personalization, and when you need full-stack API routes in the same codebase. For a pure landing page, it's overkill.

**Remix** (now unified with React Router v7) offers the smoothest migration path due to native Vite support and SPA mode allowing incremental adoption. Migration takes 2-4 weeks, costs $4,000-$8,000, and produces 35% smaller bundles than Next.js (~371 KB). Shopify's 30% performance improvement using Remix patterns demonstrates real-world effectiveness. **Best fit**: Data-heavy dashboards or applications transitioning from SPA to full-stack. For landing pages, React Router v7's native pre-rendering might suffice without full Remix adoption.

**Astro** dominates performance metrics with **>50% Core Web Vitals pass rate** (only framework exceeding 50% in 2023 benchmarks), 40-90% less JavaScript than typical React apps, and zero-JS by default via Islands Architecture. Used by Google Firebase, Cloudflare, Porsche, and IKEA for content-heavy sites. However, migration requires 3-5 weeks and substantial rearchitecture - pages become `.astro` format with HTML-like syntax, and you add `client:*` directives for interactive components. Code reuse drops to 50-60%. Cost: $6,000-$12,000. **Best fit**: Content-first marketing sites, blogs, documentation. For complex interactive tools like Pareto charts and fishbone diagrams, Astro's static-first approach creates friction.

**TanStack Start** shows promise with full SSR/SSG support, end-to-end type safety, and integration with TanStack's excellent ecosystem (Query, Router, Table). However, it's in Release Candidate stage (December 2024) and **not production-ready**. For a POC-stage startup with interested companies, betting on beta software introduces unnecessary risk. Worth watching for 2026 but not recommended now.

### Decision framework: Stay or switch?

**Stay with Vite + React and optimize** if: SEO isn't critical to immediate customer acquisition, you're pre-product-market fit and need iteration speed, you have limited engineering resources (1-2 developers), or you can achieve sufficient SEO through pre-rendering plugins. This describes most POC-stage startups.

**Switch to a meta-framework** if: SEO directly drives customer acquisition and you're losing rankings to competitors, Core Web Vitals failures cause measurable bounce rates, you need full-stack capabilities (auth, API routes, database integration), or you have 4-8 weeks of engineering time available without compromising product development. This describes post-PMF companies with dedicated platform teams.

For KaizenHub specifically - a Japanese B2B SaaS in POC phase with interested companies - **staying with Vite and implementing vite-prerender-plugin or vike-react provides the best ROI**. You need visibility for those interested companies to find you, but spending 4-8 weeks on framework migration could delay product iterations that matter more for closing POC customers. Get the landing page indexed properly with pre-rendering, then revisit meta-frameworks post-Series A.

## Google's JavaScript rendering: Capable but not instant

Google's rendering capabilities have improved dramatically - they use evergreen Chromium, successfully render 100% of properly configured pages, and support modern JavaScript (ES6+, dynamic imports, React Server Components). The Vercel study proved complete compatibility with complex frameworks.

However, **timing remains the core issue**. The three-phase process (crawl HTML → queue for rendering → render JavaScript → index) introduces unavoidable delays. While 25% of pages render within 4 seconds (competitive with SSR), the median 10-second delay and long tail (hours at 99th percentile) create risk for competitive keywords. Martin Splitt (Google's Developer Advocate) confirmed most rendering completes within minutes, but "rare exceptions" extending to hours do occur.

**Google's rendering infrastructure has other limitations**: 30-day caching of JavaScript/CSS resources (can serve stale code), stateless rendering (no cookies or localStorage), and crawl budget constraints for large sites. Not all Googlebots use the rendering engine - specialized crawlers may skip JavaScript entirely.

The practical reality: **Google can index your CSR React app, but SSR competitors have structural advantages**. They get indexed on first crawl with no rendering queue, their content is immediately available to all crawlers (including AI), and they avoid resource intensity penalties. For POC-stage startups competing against established players, you can't afford disadvantages.

**The hybrid approach**: Pre-render critical landing pages, pricing, and about pages while keeping the actual application as CSR. This gives you SEO benefits where they matter without complicating your interactive product. Tools like Vike support per-route rendering modes, enabling this exact pattern.

## B2B SaaS SEO best practices: Implementation guide

### Essential meta tags for immediate implementation

Your title tags rank as the second most important on-page SEO factor. Structure: **[Primary Keyword] | [Value Proposition]**, keeping to 50-60 characters (600 pixels max). For KaizenHub's problem-solving tools: `"Business Analysis Tool | Pareto Charts & Root Cause Analysis"`. Place your primary keyword at the start - Google prioritizes first terms. Avoid leading with your brand name unless you already have strong recognition.

Meta descriptions should be 150-160 characters on desktop, 120-140 on mobile. While Google rewrites 60-70% of descriptions, optimized ones perform significantly better. Focus on user intent and include clear value propositions. For a Japanese B2B SaaS: `"AI-powered business analysis platform with Pareto charts, fishbone diagrams, and automated root cause analysis. Used by [number] teams to solve problems 10x faster."` Include primary keywords naturally - Google bolds matching terms in search results.

Implement canonical URLs on every page to prevent duplicate content issues: `<link rel="canonical" href="https://kaizenhub.com/business-analysis" />`. This consolidates ranking signals and prevents self-competition.

### Open Graph optimization for B2B social sharing

LinkedIn sharing is critical for B2B customer acquisition, and LinkedIn relies entirely on Open Graph tags in the initial HTML (no JavaScript execution). Implement these required tags:

```html
<meta property="og:title" content="Business Analysis Tool | Solve Problems Faster" />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://kaizenhub.com/" />
<meta property="og:description" content="AI-powered platform with Pareto charts, fishbone diagrams, and automated analysis for team problem-solving." />
<meta property="og:image" content="https://kaizenhub.com/images/og-image-1200x630.jpg" />
<meta property="og:site_name" content="KaizenHub" />
<meta property="og:locale" content="en_US" />
<meta property="og:locale:alternate" content="ja_JP" />
```

**Image specifications matter**: Use 1200x630 pixels (1.91:1 ratio) for Facebook/LinkedIn, minimum 600x314 pixels, PNG for logos/graphics, JPG for photos, maximum 5MB file size. LinkedIn additionally supports 180x110 pixel thumbnails. Your OG image is often the first impression potential customers get - use professional product screenshots or compelling graphics showing value (dashboard visualizations, before/after comparisons).

Always test implementations before launch. Use Facebook Sharing Debugger, Twitter Card Validator, LinkedIn Post Inspector, and OpenGraph.xyz. These tools show exactly what crawlers see and identify missing or problematic tags.

Twitter/X Cards follow similar patterns with `twitter:card`, `twitter:site`, `twitter:title`, `twitter:description`, and `twitter:image` tags. Use `summary_large_image` for the card type to maximize visual impact.

### Structured data for SaaS products

JSON-LD structured data enables rich snippets in search results and helps Google understand your product. For B2B SaaS landing pages, implement WebApplication schema as your primary markup:

```json
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "KaizenHub - Business Analysis Platform",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "all",
  "browserRequirements": "Requires Javascript and HTML5 support",
  "url": "https://kaizenhub.com/",
  "screenshot": "https://kaizenhub.com/images/dashboard-screenshot.png",
  "description": "AI-powered business analysis tool helping teams solve problems with Pareto charts, fishbone diagrams, and automated root cause analysis.",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "47"
  },
  "offers": {
    "@type": "AggregateOffer",
    "offeredBy": {
      "@type": "Organization",
      "name": "KaizenHub Inc."
    },
    "highPrice": "999.00",
    "lowPrice": "0.00",
    "offerCount": "3",
    "priceCurrency": "USD",
    "priceSpecification": [
      {
        "@type": "UnitPriceSpecification",
        "price": "0.00",
        "priceCurrency": "USD",
        "name": "Free Tier"
      },
      {
        "@type": "UnitPriceSpecification",
        "price": "49.00",
        "priceCurrency": "USD",
        "name": "Professional Plan",
        "referenceQuantity": {
          "@type": "QuantitativeValue",
          "value": "1",
          "unitCode": "MON"
        }
      }
    ]
  }
}
```

Add Organization schema to establish your company identity:

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "KaizenHub Inc.",
  "url": "https://kaizenhub.com",
  "logo": "https://kaizenhub.com/logo.png",
  "description": "Leading provider of business analysis and problem-solving tools for teams",
  "foundingDate": "2024",
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+81-3-xxxx-xxxx",
    "contactType": "Customer Service",
    "email": "support@kaizenhub.com",
    "areaServed": ["US", "JP"],
    "availableLanguage": ["English", "Japanese"]
  },
  "sameAs": [
    "https://twitter.com/kaizenhub",
    "https://www.linkedin.com/company/kaizenhub"
  ]
}
```

Implement FAQPage schema for your FAQ section - this can win "People Also Ask" rich snippets:

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is KaizenHub's business analysis tool?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "KaizenHub is an AI-powered platform that helps teams analyze business problems using proven methodologies like Pareto charts, fishbone diagrams, and automated root cause analysis."
      }
    },
    {
      "@type": "Question",
      "name": "How much does KaizenHub cost?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "We offer three pricing tiers: Free for individuals, Professional at $49/month for teams, and Enterprise with custom pricing for large organizations."
      }
    }
  ]
}
```

Place JSON-LD in your `<head>` section (preferred) or `<body>`. Test with Google's Rich Results Test and Schema Markup Validator to ensure proper implementation. Successful B2B SaaS companies like Webflow, Canva, and Adobe Express use comprehensive schema strategies - study their implementations for inspiration.

### Japanese market specific optimizations

Hreflang tags are critical for international SEO and preventing duplicate content issues. Implement bidirectional linking between language versions:

```html
<!-- On English version -->
<link rel="alternate" hreflang="en" href="https://kaizenhub.com/" />
<link rel="alternate" hreflang="ja-jp" href="https://kaizenhub.com/ja/" />
<link rel="alternate" hreflang="x-default" href="https://kaizenhub.com/" />

<!-- On Japanese version -->
<link rel="alternate" hreflang="en" href="https://kaizenhub.com/" />
<link rel="alternate" hreflang="ja-jp" href="https://kaizenhub.com/ja/" />
<link rel="alternate" hreflang="x-default" href="https://kaizenhub.com/" />
```

Use ISO 639-1 language codes (ja = Japanese) and ISO 3166-1 Alpha 2 country codes (JP = Japan). Include x-default for fallback. Always use absolute URLs with https://. If a page links to another with hreflang, that page must link back (bidirectional requirement).

Character encoding must be UTF-8 for proper Japanese support: `<meta charset="UTF-8" />`. Keep Japanese meta descriptions slightly shorter (80-90 characters) as Japanese characters are wider and display differently in search results.

**Japanese search market specifics**: Google dominates with 77% mobile market share, but Yahoo Japan remains relevant. Desktop usage is higher in Japan (57.69% desktop vs. 39.54% mobile) compared to global averages - don't neglect desktop optimization. Consider professional translation rather than machine translation for business content - cultural nuances matter in B2B relationships.

For meta descriptions in Japanese, use formal polite language (丁寧語) appropriate for business contexts. Emphasize reliability, quality, and long-term benefits rather than speed or disruption. Include trust signals like "Japanese customer support" or "local data centers" if applicable.

## Quick wins: High-impact optimizations for POC stage

For a POC-stage startup with interested companies waiting, prioritize these highest-impact, lowest-effort improvements that deliver results in days rather than weeks:

**Priority 1 (15 minutes)**: Optimize title tags on your top 5 pages. Replace generic `"Home | KaizenHub"` with keyword-rich `"Business Analysis Tool | Pareto Charts & Root Cause Analysis | KaizenHub"`. Put primary keywords at the start. This alone can improve rankings and click-through rates by 20-30%.

**Priority 2 (30 minutes)**: Add basic Organization and WebApplication JSON-LD schema to your landing page. Copy the examples from Section 6, customize with your actual details, and place in your `<head>`. Test with Google's Rich Results Test. This enables rich snippets and helps Google understand your product.

**Priority 3 (15 minutes)**: Implement essential Open Graph tags for social sharing. At minimum: og:title, og:description, og:image (1200x630px), og:url, og:type. Test with LinkedIn Post Inspector and Facebook Debugger before considering this complete. **This is critical for B2B where LinkedIn sharing drives awareness**.

**Priority 4 (20 minutes)**: Write compelling, unique meta descriptions for your top 5 pages. Focus on value propositions and include clear CTAs. Keep to 150-160 characters. While Google rewrites many descriptions, well-optimized ones get 30% higher click-through rates.

**Priority 5 (20 minutes)**: Compress all images with TinyPNG and convert to WebP format. Add explicit width/height attributes to prevent layout shift. A 20-image landing page taking 5MB can drop to 500KB, dramatically improving Core Web Vitals and mobile experience.

**Priority 6 (30 minutes)**: Create and submit sitemap.xml to Google Search Console. Ensure important pages are included. Use `noindex, follow` for pages you don't want indexed (customer portals, internal tools) rather than blocking with robots.txt - this preserves link equity while controlling indexing.

**Priority 7 (30 minutes)**: Add an FAQ section with 5-10 common questions about business analysis, your tools, and problem-solving methodologies. Implement FAQPage schema. This can win "People Also Ask" placements and ranks for long-tail queries like "how to create a Pareto chart for business analysis."

**Priority 8 (15 minutes)**: Optimize internal linking. Add 2-3 contextual internal links to your top pages using keyword-rich anchor text. Link from features to pricing, from blog posts to product pages, from FAQs to detailed documentation. This improves crawlability and distributes page authority.

**Priority 9 (15 minutes)**: Set up Google Search Console if you haven't already. Verify ownership, submit your sitemap, and check the Core Web Vitals report. Identify which pages pass CWV assessment and which fail. Monitor this weekly to track improvements.

**Priority 10 (20 minutes)**: Audit and fix broken links using Ahrefs, Screaming Frog, or Bing Webmaster Tools. Fix 404 errors and update outdated URLs. Broken links harm user experience and waste crawl budget.

These ten quick wins require approximately **4-5 hours total** and deliver **40-60% of total SEO benefits**. For a POC-stage startup, this represents massive ROI - roughly $500-$1,000 in developer time for potentially 30-50% increase in organic visibility within 2-4 weeks.

**Low-competition keyword strategy**: Use tools like LowFruits or KWFinder to identify keywords where competitors have lower authority. Target long-tail combinations like "business analysis tool for startups," "problem solving software for teams," or "fishbone diagram software Japanese." These 3-5 word phrases have less competition and convert better as they indicate specific intent.

**Page 2 poaching**: Check Google Search Console for keywords ranking positions 11-20. These are on page 2, tantalizingly close to page 1. Improve on-page optimization (better titles, add internal links, enhance content) and you can often jump to page 1 quickly - disproportionate traffic gains for minimal effort.

## Long-term strategy: Building sustainable visibility

After quick wins establish baseline visibility, implement these longer-term optimizations:

**Phase 1 (Weeks 1-2)**: Foundation and quick wins. Optimize title tags, meta descriptions, Open Graph tags, and schema markup. Fix technical issues like broken links, ensure mobile responsiveness, compress images. Set up Google Search Console and submit sitemap. Establish measurement baseline.

**Phase 2 (Weeks 3-4)**: Implement pre-rendering solution. For your timeline and resources, **vite-prerender-plugin provides fastest path to working SSR/SSG**. Spend 1-2 days integrating the plugin, creating your prerender function, and configuring which routes to generate. Deploy and test that social media crawlers now see proper meta tags. Monitor Google Search Console for indexing improvements.

**Phase 3 (Weeks 5-8)**: Content expansion and optimization. Create detailed guides on business analysis methodologies (Pareto analysis, fishbone diagrams, root cause analysis). Target educational keywords that your prospects search before they're ready to buy tools. Implement topic clusters with pillar pages and supporting content. Each piece should link to your product pages with clear CTAs.

**Phase 4 (Weeks 9-12)**: International expansion. If targeting Japanese market actively, create Japanese-language content (not just translations - culturally adapted content). Implement hreflang properly. Build backlinks from Japanese business directories and industry sites. Consider Japanese-specific social platforms if relevant to your audience.

**Phase 5 (Ongoing)**: Measurement, iteration, and refinement. Monitor organic traffic, keyword rankings, Core Web Vitals, and conversion rates weekly. Use Google Search Console's Performance report to identify winning keywords and pages to optimize further. A/B test title tags and meta descriptions. Track social sharing metrics to understand which content resonates with your B2B audience.

**When to revisit framework migration**: If after 3-6 months you're hitting scaling limits (thousands of pages, complex internationalization, need for ISR), or SEO becomes clearly critical to customer acquisition with strong ROI data, then evaluate migrating to Next.js or Remix. But for POC stage focused on validating product-market fit with a manageable landing page, pre-rendering plugins provide 80% of benefits for 20% of effort.

## Recommended implementation approach for KaizenHub

Given your specific context - Japanese B2B SaaS in POC phase with interested companies, offering problem-solving tools, needing Google visibility without rewriting your Vite + React + TypeScript setup - here's your optimal path:

**Week 1**: Implement all quick wins (4-5 hours). Deploy immediately. This establishes baseline SEO and fixes the social sharing problem that's currently losing you organic awareness when prospects share your product.

**Week 2**: Integrate vite-prerender-plugin (1-2 days). This solves the CSR meta tag problem permanently with minimal code changes. Your landing page, features, pricing, and about pages get pre-rendered to static HTML with all meta tags in initial response. Interactive components like your Pareto chart and fishbone diagram tools remain client-side rendered where that makes sense.

**Week 3**: Implement Japanese internationalization with proper hreflang tags and culturally adapted content. Focus on professional translation of key pages. Set up Japanese social sharing optimization for local business networks.

**Week 4**: Create initial content marketing - blog posts or guides on business analysis best practices that link to your product. Target educational keywords that warm prospects search. Implement FAQ section with schema.

**Ongoing**: Monitor Google Search Console weekly, iterate on keyword performance, gradually expand content, build backlinks from relevant business analysis and productivity tool directories.

**Cost estimate**: Approximately $2,000-$4,000 in developer time (20-40 hours total). **Expected results**: 40-60% improvement in organic visibility within 4-6 weeks, proper social sharing previews immediately, faster Google indexing, and foundation for scaling SEO as you grow.

**Critical success factors**: Deploy the pre-rendering solution properly - test with Facebook Debugger and LinkedIn Post Inspector that meta tags appear in initial HTML. Monitor Core Web Vitals and ensure landing page stays under 2.5s LCP. Track conversions from organic traffic to validate ROI. Focus on educational content about problem-solving methodologies that brings prospects into your funnel before they're actively shopping for tools.

This approach balances immediate needs (visibility for POC phase), resource constraints (small team, limited engineering time), and long-term sustainability (builds foundation that scales without requiring framework migration). You maintain development velocity on product features while establishing search presence that compounds over time.