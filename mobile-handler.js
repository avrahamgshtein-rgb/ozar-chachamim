/**
 * Mobile Handler — Manages mobile-specific interactions and behavior
 * Handles viewport management, touch events, and responsive tab switching
 */

class MobileHandler {
  constructor() {
    this.isMobile = window.innerWidth <= 768;
    this.isSmallPhone = window.innerWidth <= 480;
    this.currentTab = 'graph';
    this.tabHeaderHeight = 0;
    this.isScrolling = false;

    this.init();
  }

  init() {
    console.log(`📱 [MobileHandler] Initializing (isMobile: ${this.isMobile})`);

    // Ensure proper viewport meta tag
    this.setupViewport();

    // Handle window resize
    window.addEventListener('resize', () => this.handleResize());

    // Setup tab switching
    this.setupTabSwitching();

    // Setup touch handlers
    this.setupTouchHandlers();

    // Calculate header height for proper spacing
    this.updateHeaderHeight();

    // Prevent unwanted zoom on double-tap
    this.preventDoubleClickZoom();

    // Fix iOS viewport issues
    this.fixIOSViewport();

    // Setup scrolling for all main areas
    this.setupScrolling();

    console.log('✅ [MobileHandler] Initialization complete');
  }

  /**
   * Ensure viewport meta tag is properly set
   */
  setupViewport() {
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }

    viewport.setAttribute('content',
      'width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no, maximum-scale=5'
    );
  }

  /**
   * Handle window resize events
   */
  handleResize() {
    const wasDesktop = !this.isMobile;
    this.isMobile = window.innerWidth <= 768;
    this.isSmallPhone = window.innerWidth <= 480;

    if (wasDesktop !== !this.isMobile) {
      console.log(`📱 [MobileHandler] Viewport changed: ${this.isMobile ? 'Mobile' : 'Desktop'}`);
      this.updateHeaderHeight();
      this.setupScrolling();
    }
  }

  /**
   * Setup tab switching with proper scroll handling
   */
  setupTabSwitching() {
    const tabs = document.querySelectorAll('.tab-btn');

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        const viewName = e.currentTarget.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
        if (viewName) {
          this.switchToTab(viewName);
        }
      });

      // Touch event for better responsiveness
      tab.addEventListener('touchstart', () => {
        tab.style.background = 'var(--color-bg-light)';
      });

      tab.addEventListener('touchend', () => {
        setTimeout(() => {
          tab.style.background = '';
        }, 100);
      });
    });
  }

  /**
   * Switch to a specific tab
   */
  switchToTab(viewName) {
    this.currentTab = viewName;

    // Hide all main areas
    document.querySelectorAll('.main-area').forEach(el => {
      el.classList.remove('active');
    });

    // Show selected area
    const selectedArea = document.getElementById(`${viewName}-view`);
    if (selectedArea) {
      selectedArea.classList.add('active');

      // Force scroll to top on mobile
      if (this.isMobile) {
        setTimeout(() => {
          selectedArea.scrollTop = 0;
        }, 100);
      }
    }

    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    const activeTab = document.querySelector(`[onclick*="${viewName}"]`);
    if (activeTab) {
      activeTab.classList.add('active');
    }

    console.log(`📱 [MobileHandler] Switched to tab: ${viewName}`);
  }

  /**
   * Setup touch handlers for better mobile experience
   */
  setupTouchHandlers() {
    const mainArea = document.querySelector('.container');

    if (!mainArea) return;

    let startX = 0;
    let startY = 0;
    let isDragging = false;

    mainArea.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isDragging = true;
    }, { passive: true });

    mainArea.addEventListener('touchmove', (e) => {
      if (!isDragging) return;

      // Only allow vertical scrolling
      const deltaX = Math.abs(e.touches[0].clientX - startX);
      const deltaY = Math.abs(e.touches[0].clientY - startY);

      if (deltaX > deltaY) {
        // Horizontal swipe - prevent default
        e.preventDefault();
      }
    }, { passive: false });

    mainArea.addEventListener('touchend', () => {
      isDragging = false;
    }, { passive: true });
  }

  /**
   * Update header height for proper container offset
   */
  updateHeaderHeight() {
    const header = document.querySelector('.header');
    if (header) {
      this.tabHeaderHeight = header.offsetHeight;
      const container = document.querySelector('.container');
      if (container && this.isMobile) {
        container.style.marginTop = this.tabHeaderHeight + 'px';
      }
    }
  }

  /**
   * Prevent unwanted double-tap zoom on buttons
   */
  preventDoubleClickZoom() {
    let lastTouchEnd = 0;

    document.addEventListener('touchend', (e) => {
      const now = Date.now();

      if (now - lastTouchEnd <= 300 &&
          (e.target.matches('.tab-btn') ||
           e.target.matches('.control-btn') ||
           e.target.matches('button'))) {
        e.preventDefault();
      }

      lastTouchEnd = now;
    }, false);
  }

  /**
   * Fix iOS viewport height issues
   */
  fixIOSViewport() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    if (isIOS) {
      // Use 100dvh instead of 100vh for iOS
      document.documentElement.style.height = '100dvh';

      // Fix address bar issue
      window.addEventListener('orientationchange', () => {
        setTimeout(() => {
          window.scrollTo(0, 0);
        }, 100);
      });
    }
  }

  /**
   * Setup scrolling for all main areas and ensure proper overflow
   */
  setupScrolling() {
    const mainAreas = document.querySelectorAll('.main-area');

    mainAreas.forEach(area => {
      const viewId = area.id;

      // Set proper overflow for each view type
      if (viewId === 'graph-view') {
        area.style.overflow = 'hidden';
      } else if (viewId === 'map-view') {
        area.style.overflow = 'hidden';
      } else if (viewId === 'timeline-view') {
        area.style.overflow = 'hidden';
      } else {
        // Traditions and Ideas views need scrolling
        area.style.overflow = 'auto';
        area.style.overflowX = 'hidden';
        area.style.WebkitOverflowScrolling = 'touch';
      }
    });

    // Enable scrolling on scrollable containers
    const traditions = document.getElementById('traditionsGrid');
    if (traditions) {
      traditions.parentElement.style.overflow = 'auto';
      traditions.parentElement.style.overflowX = 'hidden';
      traditions.parentElement.style.WebkitOverflowScrolling = 'touch';
    }

    const ideas = document.getElementById('ideasContainer');
    if (ideas) {
      ideas.parentElement.style.overflow = 'auto';
      ideas.parentElement.style.overflowX = 'hidden';
      ideas.parentElement.style.WebkitOverflowScrolling = 'touch';
    }
  }

  /**
   * Close sidebar on mobile with proper handling
   */
  closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.classList.remove('active');

      // Re-enable scrolling on main content
      if (this.isMobile) {
        document.body.style.overflow = 'auto';
      }
    }
  }

  /**
   * Open sidebar on mobile with scroll lock
   */
  openSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.classList.add('active');

      // Lock scrolling on main content
      if (this.isMobile) {
        document.body.style.overflow = 'hidden';
      }
    }
  }

  /**
   * Check if currently in mobile view
   */
  isCurrentlyMobile() {
    return this.isMobile;
  }

  /**
   * Get current viewport info
   */
  getViewportInfo() {
    return {
      isMobile: this.isMobile,
      isSmallPhone: this.isSmallPhone,
      width: window.innerWidth,
      height: window.innerHeight,
      orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
    };
  }
}

// Initialize mobile handler when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.mobileHandler = new MobileHandler();
  });
} else {
  window.mobileHandler = new MobileHandler();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MobileHandler;
}
