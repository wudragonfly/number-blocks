/**
 * Platform loader - auto-injects cross-platform CSS/JS and PWA support
 * Add this single script to any HTML page to enable iPad + Web support
 */

(function() {
    'use strict';
    
    // Get the base path (where this script is located)
    const scripts = document.getElementsByTagName('script');
    const currentScript = scripts[scripts.length - 1];
    const basePath = currentScript.src.substring(0, currentScript.src.lastIndexOf('/') + 1);
    
    // Inject platform CSS
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = basePath + 'platform.css';
    document.head.appendChild(css);
    
    // Inject platform JS
    const js = document.createElement('script');
    js.src = basePath + 'platform.js';
    document.head.appendChild(js);
    
    // Add PWA manifest
    const manifest = document.createElement('link');
    manifest.rel = 'manifest';
    manifest.href = basePath + 'manifest.json';
    document.head.appendChild(manifest);
    
    // Add iOS-specific meta tags if not already present
    function addMetaIfMissing(name, content, attr) {
        attr = attr || 'name';
        const selector = `meta[${attr}="${name}"]`;
        if (!document.querySelector(selector)) {
            const meta = document.createElement('meta');
            meta.setAttribute(attr, name);
            meta.content = content;
            document.head.appendChild(meta);
        }
    }
    
    // iOS Web App meta tags
    addMetaIfMissing('apple-mobile-web-app-capable', 'yes');
    addMetaIfMissing('apple-mobile-web-app-status-bar-style', 'black-translucent');
    addMetaIfMissing('apple-mobile-web-app-title', 'Number Blocks');
    addMetaIfMissing('mobile-web-app-capable', 'yes');
    addMetaIfMissing('theme-color', '#667eea');
    
    // Add apple-touch-icon if not present (using SVG, iOS will render it)
    if (!document.querySelector('link[rel="apple-touch-icon"]')) {
        const touchIcon = document.createElement('link');
        touchIcon.rel = 'apple-touch-icon';
        touchIcon.href = basePath + 'icons/icon.svg';
        document.head.appendChild(touchIcon);
    }
    
    // Ensure proper viewport meta tag
    let viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
        let content = viewport.content;
        // Ensure user-scalable=no and maximum-scale=1.0 for game-like experience
        if (!content.includes('user-scalable')) {
            content += ', user-scalable=no';
        }
        if (!content.includes('maximum-scale')) {
            content += ', maximum-scale=1.0';
        }
        viewport.content = content;
    }
    
})();

