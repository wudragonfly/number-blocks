/**
 * Cross-platform support for iPad and Web
 * Handles touch events, iOS quirks, and platform detection
 */

(function() {
    'use strict';

    // Platform detection
    const Platform = {
        isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) || 
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
        isIPad: /iPad/.test(navigator.userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
        isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
        isStandalone: window.matchMedia('(display-mode: standalone)').matches || 
                      window.navigator.standalone === true,
        isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0
    };

    // Expose platform info globally
    window.Platform = Platform;

    // Add platform classes to body for CSS targeting
    document.addEventListener('DOMContentLoaded', function() {
        const body = document.body;
        if (Platform.isIOS) body.classList.add('ios');
        if (Platform.isIPad) body.classList.add('ipad');
        if (Platform.isSafari) body.classList.add('safari');
        if (Platform.isStandalone) body.classList.add('standalone');
        if (Platform.isTouchDevice) body.classList.add('touch-device');
    });

    // Prevent double-tap zoom on iOS (while allowing actual double-taps)
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(e) {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, { passive: false });

    // Prevent pinch-zoom on iOS (game doesn't need it)
    document.addEventListener('gesturestart', function(e) {
        e.preventDefault();
    }, { passive: false });
    
    document.addEventListener('gesturechange', function(e) {
        e.preventDefault();
    }, { passive: false });

    // Fix iOS viewport height (100vh issue)
    function setViewportHeight() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
    
    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', function() {
        setTimeout(setViewportHeight, 100);
    });

    // Enhanced touch handling for buttons
    function enhanceTouchButtons() {
        const buttons = document.querySelectorAll('.control-btn, .num-btn, .action-btn, .nav-btn, .home-btn, .language-btn, .say-number');
        
        buttons.forEach(function(btn) {
            // Prevent context menu on long press
            btn.addEventListener('contextmenu', function(e) {
                e.preventDefault();
            });
            
            // Add touch feedback
            btn.addEventListener('touchstart', function() {
                this.classList.add('touch-active');
            }, { passive: true });
            
            btn.addEventListener('touchend', function() {
                this.classList.remove('touch-active');
            }, { passive: true });
            
            btn.addEventListener('touchcancel', function() {
                this.classList.remove('touch-active');
            }, { passive: true });
        });
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', enhanceTouchButtons);
    } else {
        enhanceTouchButtons();
    }

    // Re-run when DOM changes (for dynamically created buttons)
    if (typeof MutationObserver !== 'undefined') {
        const observer = new MutationObserver(function(mutations) {
            let shouldEnhance = false;
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes.length > 0) {
                    shouldEnhance = true;
                }
            });
            if (shouldEnhance) {
                enhanceTouchButtons();
            }
        });
        
        document.addEventListener('DOMContentLoaded', function() {
            observer.observe(document.body, { childList: true, subtree: true });
        });
    }

    // iOS Safari speech synthesis fix
    // Speech synthesis can stop working after page is in background
    if (Platform.isIOS && 'speechSynthesis' in window) {
        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'visible') {
                // Resume speech synthesis when page becomes visible
                speechSynthesis.cancel();
                // Re-unlock speech on next user interaction
                window._speechNeedsUnlock = true;
            }
        });
        
        // Unlock speech on any touch
        document.addEventListener('touchstart', function unlockSpeech() {
            if (window._speechNeedsUnlock && 'speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance('');
                speechSynthesis.speak(utterance);
                window._speechNeedsUnlock = false;
            }
        }, { once: false, passive: true });
    }

    // Handle iOS keyboard
    if (Platform.isIOS) {
        // Blur inputs when tapping outside
        document.addEventListener('touchstart', function(e) {
            if (!e.target.matches('input, textarea, select')) {
                const activeElement = document.activeElement;
                if (activeElement && activeElement.matches('input, textarea, select')) {
                    activeElement.blur();
                }
            }
        }, { passive: true });
    }

    // Orientation change handler
    window.addEventListener('orientationchange', function() {
        // Force reflow after orientation change
        setTimeout(function() {
            window.scrollTo(0, 0);
            document.body.style.display = 'none';
            document.body.offsetHeight; // Trigger reflow
            document.body.style.display = '';
        }, 100);
    });

    // Prevent iOS bounce/overscroll (but allow scrollable elements to scroll)
    document.body.addEventListener('touchmove', function(e) {
        const target = e.target;
        let scrollable = target.closest('.blocks-container, .quiz-area, .games-grid');
        
        if (!scrollable) {
            // Check if we're at a scroll boundary
            if (document.body.scrollTop === 0 || 
                document.body.scrollHeight - document.body.scrollTop === document.body.clientHeight) {
                // Optionally prevent overscroll - commented out as it can interfere with normal scrolling
                // e.preventDefault();
            }
        }
    }, { passive: true });

    // Console info
    console.log('Platform detected:', Platform);
    
})();

