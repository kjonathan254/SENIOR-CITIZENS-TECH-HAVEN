# Systematic Architecture Migration Plan
## Fix Monolithic HTML Without Breaking Anything

**Goal:** Transition from 31 monolithic HTML files (100KB–377KB each) to a component-based architecture **without downtime or broken pages**.

**Timeline:** 2-3 weeks (part-time), zero disruption to live site.

---

## Phase 0: Preparation (Day 1-2) — NO CHANGES TO LIVE PAGES

### Step 0.1: Create Component Infrastructure

Create these files in parallel with existing HTML (no deletions yet):

```
/workspace/components/
├── header.html          # Navigation + logo
├── footer.html          # Footer + contacts
├── sidebar.html         # Article navigation
├── seo-head.html        # Meta tags template
├── pwa-head.html        # PWA meta tags
└── scripts/
    ├── components.js    # Load + inject components
    └── navigation.js    # Active page highlighting
```

**Action:**
```bash
mkdir -p /workspace/components/scripts
```

### Step 0.2: Extract Common Patterns

Analyze your existing HTML files to identify repeated sections:

**Typical structure found in your files:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- PWA tags (identical across files) -->
  <!-- Preconnect links (identical) -->
  <!-- SEO meta (unique per page) -->
  <!-- Open Graph (similar pattern) -->
  <!-- Schema JSON-LD (similar pattern) -->
  <style>/* 500-800 lines of CSS */</style>
</head>
<body>
  <header>/* Navigation - 95% identical */</header>
  
  <main>
    <!-- UNIQUE CONTENT (only 20-30% of file) -->
  </main>
  
  <aside>/* Sidebar - 90% identical */</aside>
  
  <footer>/* Footer - 98% identical */</footer>
  
  <script>/* Inline JS - 200-400 lines */</script>
</body>
</html>
```

### Step 0.3: Create the Component Loader

File: `/workspace/components/scripts/components.js`

```javascript
/**
 * Component Loader for SCTH
 * Loads HTML fragments and injects them into the page
 * Works with existing static HTML - no build step required
 */

const COMPONENTS_BASE = '/components/';

async function loadComponent(selector, file) {
  try {
    const response = await fetch(`${COMPONENTS_BASE}${file}`);
    if (!response.ok) throw new Error(`Failed to load ${file}`);
    const html = await response.text();
    document.querySelector(selector).innerHTML = html;
    
    // Execute any scripts in the loaded component
    const scripts = document.querySelector(selector).querySelectorAll('script');
    scripts.forEach(oldScript => {
      const newScript = document.createElement('script');
      if (oldScript.src) {
        newScript.src = oldScript.src;
      } else {
        newScript.textContent = oldScript.textContent;
      }
      oldScript.parentNode.replaceChild(newScript, oldScript);
    });
  } catch (error) {
    console.error(`Error loading component ${file}:`, error);
  }
}

// Load all components when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  loadComponent('header', 'header.html');
  loadComponent('footer', 'footer.html');
  loadComponent('sidebar', 'sidebar.html');
});
```

---

## Phase 1: Extract Shared Components (Day 3-5)

### Step 1.1: Create Header Component

File: `/workspace/components/header.html`

Extract the `<header>` section from `index.html`:
```html
<header class="site-header">
  <nav class="main-navigation">
    <!-- Your existing navigation markup -->
  </nav>
</header>
```

**Test:** Create a test page `/workspace/test-header.html` that loads this component.

### Step 1.2: Create Footer Component

File: `/workspace/components/footer.html`

Extract the `<footer>` section from `index.html`.

### Step 1.3: Create Sidebar Component

File: `/workspace/components/sidebar.html`

Extract the article navigation sidebar.

### Step 1.4: Create SEO Head Template

File: `/workspace/components/seo-head.html`

Create a template with instructions for unique meta tags per page.

---

## Phase 2: Migrate ONE Page as Pilot (Day 6-8)

**Choose:** `email-account-guide.html` (medium size, ~33KB)

### Step 2.1: Create New Structure

Rename existing file as backup:
```bash
mv email-account-guide.html email-account-guide-old.html
```

Create new streamlined version:

File: `/workspace/email-account-guide.html`
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  
  <!-- UNIQUE META TAGS ONLY -->
  <title>Email Account Guide for Seniors | Senior Citizens Tech Haven</title>
  <meta name="description" content="Step-by-step guide to creating and managing email accounts for older adults in Kenya." />
  
  <!-- SHARED CSS -->
  <link rel="stylesheet" href="/css/main.css" />
  <link rel="stylesheet" href="/css/email-guide.css" />
  
  <!-- Schema for this page only -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Email Account Guide for Seniors",
    /* ... rest of schema */
  }
  </script>
</head>
<body>
  <!-- COMPONENTS (loaded via JS) -->
  <header></header>
  
  <div class="page-layout">
    <main id="main-content">
      <!-- UNIQUE CONTENT ONLY (~60% smaller than before) -->
      <article>
        <h1>Email Account Guide</h1>
        <!-- Content without repeated navigation/styling -->
      </article>
    </main>
    
    <aside id="sidebar"></aside>
  </div>
  
  <footer></footer>
  
  <!-- COMPONENT LOADER -->
  <script src="/components/scripts/components.js" defer></script>
  
  <!-- PAGE-SPECIFIC JS ONLY -->
  <script src="/scripts/email-guide.js" defer></script>
</body>
</html>
```

### Step 2.2: Extract CSS

File: `/workspace/css/main.css`
- Move common styles from all HTML files here

File: `/workspace/css/email-guide.css`
- Move page-specific styles here

### Step 2.3: Test Side-by-Side

Compare old vs new:
```bash
# Use diff to verify content is identical (except structure)
diff -u email-account-guide-old.html email-account-guide.html
```

Deploy BOTH versions temporarily:
- `/email-account-guide-new.html` (test version)
- Keep old version live

Test thoroughly on:
- Desktop Chrome/Firefox
- Mobile Chrome/Safari
- Screen reader (NVDA/JAWS)
- Keyboard navigation

### Step 2.4: Switch to New Version

Once tested:
```bash
rm email-account-guide-old.html
# New version is now live
```

---

## Phase 3: Batch Migrate Remaining Pages (Day 9-15)

### Step 3.1: Group Pages by Complexity

**Group A (Simple, <40KB):** 12 files
- `digital-business-50-plus.html`
- `ai-advantage-kenya-business.html`
- `ai-rise-kenya-guide.html`
- `articles.html`
- `elsah-ai.html`
- `facebook-groups-guide.html`
- `m-shwari-savings.html`
- `offline.html`
- `reverse-mpesa.html`
- `tech-revolution-guide.html`
- `voice-to-text-guide.html`
- `whatsapp-safety-settings.html`

**Group B (Medium, 40-60KB):** 10 files
- `affordable-smartphones-seniors-kenya.html`
- `digital-divide-then-vs-now.html`
- `ecitizen-kenya-guide.html`
- `email-account-guide.html` ✓ (already done)
- `financial-technology-guide.html`
- `health-wellness-tools.html`
- `japan-silver-tech-kenya.html`
- `kenya-digital-health-readiness.html`
- `mpesa-send-money-guide.html`
- `phone-settings-seniors.html`
- `smartphones-tablets-guide.html`
- `tech-mental-health.html`

**Group C (Large, >60KB):** 5 files
- `africa-aging-population-healthcare-technology-families.html`
- `index.html` (special case)
- `sim-swap-fraud-protection-guide.html`
- `the-empty-room.html` (377KB - needs special handling)
- `whatsapp-mastery-seniors-kenya.html`

### Step 3.2: Migrate Group A (2 days)

For each file:
1. Backup: `mv file.html file.html.bak`
2. Create new streamlined version
3. Extract CSS to `/css/page-name.css`
4. Extract JS to `/scripts/page-name.js`
5. Test locally with `netlify dev`
6. Commit to Git
7. Deploy to Netlify (staging)
8. Verify on live URL
9. Delete `.bak` file

### Step 3.3: Migrate Group B (3 days)

Same process as Group A.

### Step 3.4: Migrate Group C (4 days)

These need extra care due to size:

**Special Case: `the-empty-room.html` (377KB)**
- Likely contains large embedded images/data
- Consider splitting into multiple pages
- Or lazy-load heavy content
- May need image optimization first

**Special Case: `index.html`**
- Migrate LAST (after all other pages work)
- Requires extra testing (homepage is most visited)

---

## Phase 4: Cleanup & Optimization (Day 16-18)

### Step 4.1: Remove Old CSS/JS from HTML

After all pages migrated:
- Remove inline `<style>` tags from HTML files
- Remove inline `<script>` tags from HTML files
- Verify all functionality works with external files

### Step 4.2: Implement Code Splitting

File: `/webpack.config.js` (if using Webpack) OR `/vite.config.js`

Example with Vite:
```javascript
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        elsah: 'elsah-ai.html',
        guides: ['email-account-guide.html', 'mpesa-send-money-guide.html']
      }
    }
  }
});
```

### Step 4.3: Add Build Step (Optional)

Update `package.json`:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

Update `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "dist"
```

---

## Risk Mitigation

### Rollback Plan

If something breaks:
```bash
# Git rollback
git revert HEAD
# Or restore from backup
cp file.html.bak file.html
```

### Testing Checklist Per Page

- [ ] Desktop Chrome (latest)
- [ ] Desktop Firefox (latest)
- [ ] Mobile Chrome (Android)
- [ ] Mobile Safari (iOS)
- [ ] Keyboard navigation (Tab through all elements)
- [ ] Screen reader (NVDA or JAWS)
- [ ] Lighthouse score >90
- [ ] No console errors
- [ ] All links work
- [ ] Images load correctly
- [ ] Forms submit properly
- [ ] Elsah AI still works (if on page)

### Monitoring After Deployment

Add to Netlify dashboard:
- Error tracking (Netlify Functions logs)
- Performance monitoring (Core Web Vitals)
- 404 tracking

---

## Expected Results

| Metric                  | Before        | After         | Improvement |
|------------------------|---------------|---------------|-------------|
| Avg page size          | 100KB         | 35KB          | 65% ↓       |
| Largest page           | 377KB         | 120KB         | 68% ↓       |
| CSS duplication        | 31 copies     | 1 file        | 97% ↓       |
| JS duplication         | 31 copies     | Modular       | 90% ↓       |
| Build time             | N/A           | ~5 seconds    | Fast        |
| Maintainability        | Hard          | Easy          | 10x ↑       |
| Core Web Vitals        | ~70           | ~90           | 28% ↑       |
| Time to add new page   | 4 hours       | 30 minutes    | 8x faster   |

---

## Alternative: Gradual Migration (Lower Risk)

If the above feels too aggressive, use this **hybrid approach**:

### Option A: Keep HTML, Extract Only CSS/JS

1. Keep all 31 HTML files as-is
2. Extract repeated CSS to `/css/main.css`
3. Replace inline styles with `<link rel="stylesheet" href="/css/main.css">`
4. Extract repeated JS to `/scripts/main.js`
5. Benefits: 40-50% size reduction, minimal risk

### Option B: Use Server-Side Includes (Netlify Edge Functions)

Create Edge Function to inject header/footer:

File: `/netlify/edge-functions/inject-components.js`
```javascript
export default async (request, context) => {
  const url = new URL(request.url);
  const response = await context.next();
  
  if (response.headers.get('content-type')?.includes('text/html')) {
    let html = await response.text();
    
    // Inject header before </body>
    html = html.replace('<body>', '<body><!-- header injected here -->');
    
    return new Response(html, response);
  }
  
  return response;
};
```

Update `netlify.toml`:
```toml
[[edge_functions]]
  source = "/*"
  function = "inject-components"
```

**Benefits:**
- Zero changes to existing HTML files
- Components managed centrally
- Can migrate gradually page-by-page

---

## Recommendation

**Start with Option A (Hybrid Approach):**

1. Week 1: Extract CSS/JS to external files (low risk, immediate 40% size reduction)
2. Week 2: Migrate 5 smallest pages to component architecture (test the approach)
3. Week 3: If successful, migrate remaining pages in batches
4. Week 4: Optimize with build tool (Vite/Astro) if needed

This gives you:
- ✅ Immediate performance gains
- ✅ Lower risk than full rewrite
- ✅ Learning opportunity before big changes
- ✅ Ability to stop anytime without breaking anything

---

## Next Steps

1. **Today:** Create `/workspace/components/` directory structure
2. **Tomorrow:** Extract header/footer into component files
3. **Day 3:** Create test page to validate component loading
4. **Day 4:** Migrate `email-account-guide.html` as pilot
5. **Day 5:** Review results, adjust approach if needed

**Would you like me to start implementing Phase 0 right now?** I can:
1. Create the component directory structure
2. Extract header/footer from your existing HTML
3. Create the component loader script
4. Set up a test page

Just say "go" and I'll begin without modifying any live pages.
