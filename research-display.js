/**
 * research-display.js
 * Beautiful research content rendering for sidebar
 *
 * Handles:
 * - Research content fetching from Supabase
 * - Clean HTML rendering with Hebrew typography
 * - Scrollable container without overflow
 * - Markdown-to-HTML conversion (basic)
 * - Character count and reading time calculation
 */

class ResearchDisplay {
  /**
   * Render research content section for sidebar
   * @param {Object} research - Research object from Supabase
   * @param {string} sageId - Sage ID for full view link
   * @returns {string} HTML markup for research section
   */
  static renderResearchSection(research, sageId) {
    if (!research || !research.content_text) {
      return '';
    }

    const wordCount = research.word_count || this.estimateWordCount(research.content_text);
    const readingTime = Math.ceil(wordCount / 200); // 200 words per minute

    // Truncate content for preview (first 600 characters)
    const preview = research.content_text.substring(0, 600);
    const isLong = research.content_text.length > 600;

    return `
      <div class="research-section" style="
        background: linear-gradient(135deg, #f5f8fb 0%, #f0f4f8 100%);
        padding: 1rem;
        border-radius: 8px;
        border-left: 4px solid #2196F3;
        margin-bottom: 1rem;
      ">
        <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 0.75rem;">
          <h3 style="margin: 0; color: #1976D2; font-size: 1rem; font-family: 'Heebo', sans-serif;">
            📚 ${research.source_file || 'מסמך מחקר'}
          </h3>
          <span style="
            background: #e3f2fd;
            color: #1976D2;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
            white-space: nowrap;
            margin-right: 0.5rem;
          ">
            ${readingTime} דקות קריאה
          </span>
        </div>

        ${research.content_type ? `
          <div style="
            font-size: 0.8rem;
            color: #666;
            margin-bottom: 0.5rem;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid #ddd;
          ">
            <span style="display: inline-block; margin-right: 1rem;">
              <strong>סוג:</strong> ${research.content_type}
            </span>
            <span style="display: inline-block;">
              <strong>מילים:</strong> ${wordCount}
            </span>
          </div>
        ` : ''}

        <!-- Research content preview with proper scrolling -->
        <div class="research-content-preview" style="
          background: white;
          padding: 0.75rem;
          border-radius: 4px;
          max-height: 180px;
          overflow-y: auto;
          line-height: 1.7;
          font-size: 0.9rem;
          color: #444;
          direction: rtl;
          text-align: right;
          font-family: 'Heebo', 'Frank Ruhl Libre', serif;
          white-space: pre-wrap;
          word-wrap: break-word;
          overflow-wrap: break-word;
          hyphens: auto;
          border: 1px solid #e3f2fd;
          margin-bottom: 0.75rem;
          scroll-behavior: smooth;
        ">
          ${this.sanitizeContent(preview)}${isLong ? '...' : ''}
        </div>

        <!-- Reading time and word count footer -->
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.8rem;
          color: #999;
          margin-bottom: 0.75rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #e3f2fd;
        ">
          <span>📄 ${wordCount} מילים</span>
          <span>⏱️ ~${readingTime} דקות</span>
          ${research.created_at ? `
            <span>📅 ${this.formatDate(research.created_at)}</span>
          ` : ''}
        </div>

        <!-- Action buttons -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
          <!-- Full research view button -->
          <button onclick="window.location.href='research-view.html?sage=${sageId}'"
            style="
              padding: 0.6rem 0.75rem;
              background: #2196F3;
              color: white;
              border: none;
              border-radius: 6px;
              font-size: 0.85rem;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s ease;
              font-family: 'Heebo', sans-serif;
              direction: rtl;
              text-align: center;
            "
            onmouseover="this.style.background='#1976D2'; this.style.transform='translateY(-2px)';"
            onmouseout="this.style.background='#2196F3'; this.style.transform='translateY(0)';"
          >
            📖 קרא הכל
          </button>

          <!-- Copy to clipboard button -->
          <button onclick="ResearchDisplay.copyToClipboard('${sageId}')"
            style="
              padding: 0.6rem 0.75rem;
              background: #4caf50;
              color: white;
              border: none;
              border-radius: 6px;
              font-size: 0.85rem;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s ease;
              font-family: 'Heebo', sans-serif;
              direction: rtl;
              text-align: center;
            "
            onmouseover="this.style.background='#388e3c'; this.style.transform='translateY(-2px)';"
            onmouseout="this.style.background='#4caf50'; this.style.transform='translateY(0)';"
          >
            📋 העתק טקסט
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Sanitize content to prevent XSS
   * @param {string} content - Raw content text
   * @returns {string} HTML-safe content
   */
  static sanitizeContent(content) {
    const div = document.createElement('div');
    div.textContent = content;
    return div.innerHTML;
  }

  /**
   * Estimate word count from text
   * @param {string} text - Text content
   * @returns {number} Estimated word count
   */
  static estimateWordCount(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).length;
  }

  /**
   * Format date for display
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date
   */
  static formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL');
  }

  /**
   * Copy full research text to clipboard
   * @param {string} sageId - Sage ID
   */
  static async copyToClipboard(sageId) {
    if (!window.supabase) {
      alert('Database not connected');
      return;
    }

    try {
      const { data: research } = await window.supabase
        .from('research_content')
        .select('content_text')
        .eq('sage_id', sageId)
        .single();

      if (research && research.content_text) {
        navigator.clipboard.writeText(research.content_text).then(() => {
          alert('✅ טקסט המחקר הועתק ללוח');
        });
      } else {
        alert('❌ לא ניתן למצוא את תוכן המחקר');
      }
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      alert('❌ שגיאה בהעתקה');
    }
  }

  /**
   * Fetch full research content for dedicated view
   * @param {string} sageId - Sage ID
   * @returns {Promise<Object>} Full research object
   */
  static async fetchFullResearch(sageId) {
    if (!window.supabase) {
      throw new Error('Database not connected');
    }

    const { data: research, error } = await window.supabase
      .from('research_content')
      .select('*')
      .eq('sage_id', sageId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch research: ${error.message}`);
    }

    return research;
  }

  /**
   * Convert basic markdown to HTML
   * @param {string} markdown - Markdown text
   * @returns {string} HTML
   */
  static markdownToHtml(markdown) {
    if (!markdown) return '';

    let html = markdown;

    // Bold: **text**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic: *text*
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Links: [text](url)
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" style="color: #2196F3; text-decoration: underline;">$1</a>');

    // Headers: # text
    html = html.replace(/^# (.*?)$/gm, '<h2 style="margin-top: 1rem; margin-bottom: 0.5rem; color: #1976D2;">$1</h2>');
    html = html.replace(/^## (.*?)$/gm, '<h3 style="margin-top: 0.75rem; margin-bottom: 0.5rem; color: #2196F3;">$1</h3>');
    html = html.replace(/^### (.*?)$/gm, '<h4 style="margin-top: 0.5rem; margin-bottom: 0.25rem; color: #64b5f6;">$1</h4>');

    // Line breaks
    html = html.replace(/\n\n/g, '</p><p>');
    html = `<p>${html}</p>`;

    return html;
  }

  /**
   * Create a dedicated research view page
   * @param {Object} sage - Sage object with research
   * @returns {string} HTML page
   */
  static createFullResearchPage(sage, research) {
    return `
      <!DOCTYPE html>
      <html lang="he" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>מחקר: ${sage.name_he} | אוצר חכמים</title>
        <link href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;700&family=Heebo:wght@400;500;600;700&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Heebo', sans-serif;
            background: #f5f1e8;
            color: #1a1410;
            direction: rtl;
            text-align: right;
            line-height: 1.8;
          }

          .header {
            background: white;
            border-bottom: 1px solid #ddd;
            padding: 2rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            position: sticky;
            top: 0;
            z-index: 100;
          }

          .header h1 {
            font-family: 'Frank Ruhl Libre', serif;
            font-size: 2rem;
            color: #1a1410;
            margin-bottom: 0.5rem;
          }

          .meta {
            display: flex;
            gap: 2rem;
            font-size: 0.9rem;
            color: #666;
            flex-wrap: wrap;
          }

          .meta-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .content {
            max-width: 900px;
            margin: 0 auto;
            padding: 2rem;
            background: white;
            margin-top: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          }

          .research-text {
            font-size: 1.05rem;
            line-height: 2;
            color: #333;
            text-align: justify;
            white-space: pre-wrap;
            word-wrap: break-word;
            hyphens: auto;
          }

          .back-button {
            display: inline-block;
            margin-top: 1rem;
            padding: 0.75rem 1.5rem;
            background: #2196F3;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            transition: all 0.2s;
            font-weight: 600;
          }

          .back-button:hover {
            background: #1976D2;
            transform: translateY(-2px);
          }

          footer {
            text-align: center;
            padding: 2rem;
            color: #999;
            font-size: 0.85rem;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${sage.name_he}</h1>
          <div class="meta">
            <div class="meta-item">
              <i class="fas fa-calendar"></i> ${sage.era}
            </div>
            <div class="meta-item">
              <i class="fas fa-map-pin"></i> ${sage.region || 'Unknown'}
            </div>
            <div class="meta-item">
              <i class="fas fa-book"></i> ${sage.primary_field || 'Other'}
            </div>
            <div class="meta-item">
              <i class="fas fa-file-alt"></i> ${research.word_count || 0} מילים
            </div>
          </div>
        </div>

        <div class="content">
          <div class="research-text">
            ${research.content_text}
          </div>

          <button onclick="window.history.back()" class="back-button" style="margin-top: 2rem;">
            ← חזור לפרופיל
          </button>
        </div>

        <footer>
          <p>אוצר חכמים | מסמך מחקר</p>
          <p style="margin-top: 0.5rem; font-size: 0.8rem;">
            ${research.created_at ? `עודכן: ${new Date(research.created_at).toLocaleDateString('he-IL')}` : ''}
          </p>
        </footer>
      </body>
      </html>
    `;
  }
}

// Export globally
window.ResearchDisplay = ResearchDisplay;
