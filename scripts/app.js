/**
 * OZAR CHACHAMIM - App Main Script
 * Handles view switching, sidebar, search, and exports
 */

class OzarApp {
  constructor() {
    this.currentView = 'visualization';
    this.selectedNode = null;
    this.initializeElements();
    this.setupEventListeners();
  }

  initializeElements() {
    this.navButtons = document.querySelectorAll('.nav-btn');
    this.views = document.querySelectorAll('.view');
    this.sidebar = document.getElementById('sidebar');
    this.sidebarContent = document.getElementById('sidebarContent');
    this.sidebarClose = document.getElementById('sidebarClose');
    this.searchInput = document.getElementById('searchInput');
    this.exportBtn = document.getElementById('exportBtn');
    this.tableBody = document.getElementById('tableBody');
  }

  setupEventListeners() {
    // Navigation tabs
    this.navButtons.forEach(btn => {
      btn.addEventListener('click', (e) => this.switchView(e.target.closest('.nav-btn').dataset.view));
    });

    // Sidebar close
    if (this.sidebarClose) {
      this.sidebarClose.addEventListener('click', () => this.closeSidebar());
    }

    // Search
    this.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));

    // Export
    this.exportBtn.addEventListener('click', () => this.exportData());

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeSidebar();
    });
  }

  /**
   * Switch between views (visualization, table, about)
   */
  switchView(viewName) {
    // Update active nav button
    this.navButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    // Hide all views
    this.views.forEach(view => {
      view.classList.remove('active');
    });

    // Show selected view
    const viewElement = document.getElementById(`${viewName}-view`);
    if (viewElement) {
      viewElement.classList.add('active');
    }

    this.currentView = viewName;

    // Load table data if switching to table view
    if (viewName === 'table') {
      this.loadTableData();
    }
  }

  /**
   * Load sages into table view
   */
  loadTableData() {
    if (!window.graphData || !window.graphData.nodes) return;

    const nodes = window.graphData.nodes;
    this.tableBody.innerHTML = '';

    nodes.forEach(node => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${node.name_he || ''}</strong></td>
        <td>${node.name_en || ''}</td>
        <td>${node.era || ''}</td>
        <td>${node.region || ''}</td>
        <td>${node.primary_field || ''}</td>
      `;
      row.addEventListener('click', () => this.showNodeDetails(node));
      row.style.cursor = 'pointer';
      this.tableBody.appendChild(row);
    });
  }

  /**
   * Show node details in sidebar
   */
  showNodeDetails(node) {
    this.selectedNode = node;

    // Count teachers and students
    const teachers = window.graphData.links.filter(l => l.target === node.id).length;
    const students = window.graphData.links.filter(l => l.source === node.id).length;

    // Get related sages
    const teacherLinks = window.graphData.links.filter(l => l.target === node.id);
    const studentLinks = window.graphData.links.filter(l => l.source === node.id);

    const teacherNames = teacherLinks
      .map(l => window.graphData.sageMap?.get(String(l.source))?.name_he || 'Unknown')
      .slice(0, 5);

    const studentNames = studentLinks
      .map(l => window.graphData.sageMap?.get(String(l.target))?.name_he || 'Unknown')
      .slice(0, 5);

    // Build HTML
    const html = `
      <h2>${node.name_he || ''}</h2>
      <p><em>${node.name_en || ''}</em></p>

      <strong>תקופה:</strong>
      <p>${node.era || 'לא ידוע'}</p>

      <strong>אזור:</strong>
      <p>${node.region || 'לא ידוע'}</p>

      <strong>תחום:</strong>
      <p>${node.primary_field || 'לא ידוע'}</p>

      ${node.summary ? `
        <strong>תיאור:</strong>
        <p>${node.summary}</p>
      ` : ''}

      <strong>קשרים:</strong>
      <p>👨‍🏫 מורים: ${teachers} | 👨‍🎓 תלמידים: ${students}</p>

      ${teacherNames.length > 0 ? `
        <strong>מורים:</strong>
        <ul>
          ${teacherNames.map(name => `<li>${name}</li>`).join('')}
        </ul>
      ` : ''}

      ${studentNames.length > 0 ? `
        <strong>תלמידים:</strong>
        <ul>
          ${studentNames.map(name => `<li>${name}</li>`).join('')}
        </ul>
      ` : ''}
    `;

    this.sidebarContent.innerHTML = html;
    this.sidebarClose.style.display = 'block';
  }

  /**
   * Close sidebar
   */
  closeSidebar() {
    this.selectedNode = null;
    this.sidebarContent.innerHTML = '<p>בחר חכם מהרשת...</p>';
    this.sidebarClose.style.display = 'none';
  }

  /**
   * Search functionality
   */
  handleSearch(query) {
    if (!window.graphData) return;

    const lowerQuery = query.toLowerCase();
    const nodes = window.graphData.nodes;

    // Filter and highlight matching nodes
    if (window.genealogyDiagram && window.genealogyDiagram.node) {
      window.genealogyDiagram.node.style('opacity', d => {
        const matches = (d.name_he && d.name_he.includes(query)) ||
                       (d.name_en && d.name_en.toLowerCase().includes(lowerQuery)) ||
                       (d.region && d.region.toLowerCase().includes(lowerQuery));
        return matches ? 1 : 0.2;
      });
    }
  }

  /**
   * Export data as JSON
   */
  exportData() {
    if (!window.graphData) {
      alert('אין נתונים לייצוא');
      return;
    }

    const data = {
      sages: window.graphData.nodes,
      connections: window.graphData.links,
      exportedAt: new Date().toISOString()
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ozar-chachamim-${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    console.log('✅ Data exported');
  }
}

// Initialize app on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new OzarApp();
  console.log('✅ App initialized');
});

// Make sidebar details accessible from visualization
document.addEventListener('supabaseReady', () => {
  // Expose showNodeDetails to visualization
  if (window.genealogyDiagram) {
    window.genealogyDiagram.showNodeDetails = (node) => {
      window.app.showNodeDetails(node);
    };
  }
});
