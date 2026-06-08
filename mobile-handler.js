/**
 * Mobile Handler
 * Manages responsive behavior for sidebar on mobile devices
 */

const mobileHandler = {
  isCurrentlyMobile() {
    return window.innerWidth < 768
  },

  openSidebar() {
    const sidebar = document.getElementById('sidebar')
    if (sidebar) {
      sidebar.classList.add('active')
    }
  },

  closeSidebar() {
    const sidebar = document.getElementById('sidebar')
    if (sidebar) {
      sidebar.classList.remove('active')
    }
  },

  init() {
    console.log('📱 [MobileHandler] Initialized')
    window.addEventListener('resize', () => {
      if (!this.isCurrentlyMobile()) {
        this.closeSidebar()
      }
    })
  }
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    mobileHandler.init()
  })
} else {
  mobileHandler.init()
}

// Expose globally
window.mobileHandler = mobileHandler
