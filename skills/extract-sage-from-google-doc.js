/**
 * SKILL: Extract Sage Data from Google Doc
 *
 * Purpose: Read a Google Doc containing deep research on a sage, extract structured data
 * Input: Google Doc content (text)
 * Output: JSON object with biography, works, ideas, relationships, locations
 *
 * Usage:
 *   const result = await extractSageData(googleDocContent, sageNameEnglish);
 *   console.log(result.bio, result.main_works, result.key_ideas);
 */

async function extractSageData(docContent, sageName) {
  if (!docContent || typeof docContent !== 'string') {
    throw new Error('Document content must be a non-empty string');
  }

  // ============================================================
  // PHASE 1: PARSE SECTIONS
  // ============================================================

  // Look for common section headers in Hebrew/English
  const sections = {
    biography: extractSection(docContent, ['ביוגרפיה', 'Biography', 'חייו', 'Life']),
    works: extractSection(docContent, ['יצירות עיקריות', 'Main Works', 'כתבים', 'Writings']),
    ideas: extractSection(docContent, ['רעיונות עיקריים', 'Core Ideas', 'תורה', 'Teachings']),
    relationships: extractSection(docContent, ['קשרים', 'Relationships', 'תלמידים', 'Students']),
    locations: extractSection(docContent, ['גיאוגרפיה', 'Geography', 'מקומות', 'Locations']),
  };

  // ============================================================
  // PHASE 2: EXTRACT STRUCTURED DATA
  // ============================================================

  const result = {
    sage_name_english: sageName,
    bio: extractBiography(sections.biography, docContent),
    main_works: extractWorks(sections.works, docContent),
    key_ideas: extractIdeas(sections.ideas, docContent),
    related_sages: extractRelationships(sections.relationships, docContent),
    locations: extractLocations(sections.locations, docContent),
    extracted_at: new Date().toISOString(),
  };

  return result;
}

// ============================================================
// HELPERS
// ============================================================

function extractSection(text, keywords) {
  /**
   * Find a section by looking for keyword headers
   * Returns the text between header and next major section
   */
  for (const keyword of keywords) {
    const pattern = new RegExp(`${keyword}[\\s\\S]*?(?=\\n(?:##|###|[א-ת]|$))`, 'i');
    const match = text.match(pattern);
    if (match) return match[0];
  }
  return '';
}

function extractBiography(bioSection, fullText) {
  /**
   * Extract 2-3 sentences summarizing the sage's life
   * Prefer first paragraph of biography section, else infer from content
   */
  if (bioSection) {
    // Take first 2-3 sentences
    const sentences = bioSection.match(/[^.!?]*[.!?]+/g) || [];
    return sentences.slice(0, 3).join('').trim();
  }

  // Fallback: extract intro from full text
  const intro = fullText.split('\n').slice(0, 5).join(' ');
  return intro.substring(0, 300);
}

function extractWorks(worksSection, fullText) {
  /**
   * Extract list of major works with titles and descriptions
   * Format: ["Title (Hebrew)", "Title (English)", ...]
   * Return max 10 items
   */
  const works = [];

  // Look for patterns like:
  // - ספר הרמב״ם (Mishneh Torah)
  // - Kiddushin (קידושין)
  const workPattern = /[-•*]\s*([^(\n]+)(?:\s*\(([^)]+)\))?/g;
  let match;

  while ((match = workPattern.exec(worksSection || fullText)) && works.length < 10) {
    const title = match[1]?.trim();
    const alternateTitle = match[2]?.trim();

    if (title && title.length > 2) {
      works.push(alternateTitle ? `${title} (${alternateTitle})` : title);
    }
  }

  return works.length > 0 ? works : [];
}

function extractIdeas(ideasSection, fullText) {
  /**
   * Extract key philosophical or legal ideas
   * Return max 5 ideas (bullet points or numbered items)
   */
  const ideas = [];
  const lines = (ideasSection || fullText).split('\n');

  for (const line of lines) {
    if (line.match(/^[-•*#0-9]+\s/) && ideas.length < 5) {
      const idea = line.replace(/^[-•*#0-9]+\s+/, '').trim();
      if (idea.length > 5) ideas.push(idea);
    }
  }

  return ideas;
}

function extractRelationships(relSection, fullText) {
  /**
   * Extract related sages: teachers, students, colleagues
   * Format: [{ name: "...", relation: "student" | "teacher" | "contemporary" }, ...]
   * Return max 10 relationships
   */
  const relations = [];
  const keywords = {
    student: ['תלמידים', 'student', 'disciples', 'תלמיד'],
    teacher: ['מורים', 'teacher', 'rabbi', 'rav', 'רב', 'מורו'],
    contemporary: ['עסקו', 'debated', 'contemporary', 'colleague', 'בן דורו'],
  };

  // Look for patterns: "Rabbi X was taught by Rabbi Y"
  const namePattern = /(?:Rabbi|Rav|רבי|ר״)\s+([A-Za-zא-ת\s]+?)(?:\s|[.,;:]|$)/g;
  let match;

  while ((match = namePattern.exec(relSection || fullText)) && relations.length < 10) {
    const name = match[1]?.trim();
    if (name && name.length > 2) {
      relations.push({
        name: name,
        relation: 'related', // Will be refined by user
      });
    }
  }

  return relations;
}

function extractLocations(locSection, fullText) {
  /**
   * Extract places where sage lived, studied, or traveled
   * Return array of location names (Hebrew preferred)
   */
  const locations = [];
  const places = new Set(); // Deduplicate

  // Common locations
  const locationKeywords = {
    'ירושלים': ['Jerusalem', 'ירושלים'],
    'טבריה': ['Tiberias', 'טבריה'],
    'בבל': ['Babylon', 'בבל', 'סורא', 'pumbedita'],
    'ספרד': ['Spain', 'ספרד', 'קורדובה', 'Cordoba'],
    'מצרים': ['Egypt', 'מצרים', 'קהיר', 'Cairo'],
    'צפרן': ['Safed', 'צפת'],
    'אשכנז': ['Ashkenaz', 'אשכנז', 'Germany', 'גרמניה'],
  };

  const text = (locSection || fullText).toLowerCase();

  for (const [hebrew, keywords] of Object.entries(locationKeywords)) {
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        places.add(hebrew);
      }
    }
  }

  return Array.from(places);
}

// ============================================================
// EXPORT
// ============================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { extractSageData };
}
