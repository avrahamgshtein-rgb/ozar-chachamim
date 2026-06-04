/**
 * SKILL: Extract Sage Data from Local File
 *
 * Purpose: Read a local research file (docx, txt, md) and extract structured data
 * Input: File path (string) + sage name (string)
 * Output: JSON object with biography, works, ideas, relationships, locations
 *
 * Supported formats:
 *   - .docx (Word documents) — requires 'docx' npm package
 *   - .txt (Plain text)
 *   - .md (Markdown)
 *
 * Usage:
 *   const { extractSageDataFromFile } = require('./skills/extract-sage-from-local-file.js');
 *   const result = await extractSageDataFromFile('./data/rambam-research.docx', 'rambam');
 *   console.log(result.bio, result.main_works);
 */

const fs = require('fs');
const path = require('path');

// Optional: For parsing .docx files
let docx;
try {
  docx = require('docx');
} catch (err) {
  console.warn('⚠️ docx package not installed. Run: npm install docx');
}

// ============================================================
// MAIN EXPORT FUNCTION
// ============================================================

async function extractSageDataFromFile(filePath, sageName = '') {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const fileExt = path.extname(filePath).toLowerCase();
  let fileContent = '';

  // ======================================================
  // PHASE 1: READ FILE BY TYPE
  // ======================================================

  switch (fileExt) {
    case '.docx':
      fileContent = await readDocxFile(filePath);
      break;
    case '.txt':
      fileContent = fs.readFileSync(filePath, 'utf-8');
      break;
    case '.md':
      fileContent = fs.readFileSync(filePath, 'utf-8');
      break;
    default:
      throw new Error(`Unsupported file type: ${fileExt}`);
  }

  if (!fileContent || fileContent.length === 0) {
    throw new Error('File is empty');
  }

  // ======================================================
  // PHASE 2: EXTRACT SAGE NAME FROM FILENAME (if not provided)
  // ======================================================

  if (!sageName) {
    const fileName = path.basename(filePath);
    sageName = extractSageNameFromFilename(fileName);
  }

  // ======================================================
  // PHASE 3: PARSE STRUCTURED DATA
  // ======================================================

  const result = {
    sage_name_english: sageName,
    bio: extractBiography(fileContent),
    main_works: extractWorks(fileContent),
    key_ideas: extractIdeas(fileContent),
    related_sages: extractRelationships(fileContent),
    locations: extractLocations(fileContent),
    extracted_at: new Date().toISOString(),
    source_file: path.basename(filePath),
    source_type: fileExt.replace('.', ''),
  };

  return result;
}

// ============================================================
// FILE READERS
// ============================================================

async function readDocxFile(filePath) {
  /**
   * Read .docx file and extract text
   * Uses docx package for proper Word document parsing
   */

  if (!docx) {
    // Fallback: try using Alternative method (basic unzip)
    console.warn('⚠️ docx package not available. Using fallback text extraction.');
    return readDocxFallback(filePath);
  }

  try {
    const buffer = fs.readFileSync(filePath);
    const result = await docx.parseBuffer(buffer);

    // Extract text from paragraphs
    let text = '';
    if (result.paragraphs) {
      text = result.paragraphs.map((p) => p.text).join('\n');
    }

    return text;
  } catch (err) {
    console.warn(`⚠️ Could not parse docx with docx package: ${err.message}`);
    return readDocxFallback(filePath);
  }
}

function readDocxFallback(filePath) {
  /**
   * Fallback: Extract text from docx (it's a zip file)
   * This is basic and may miss some formatting
   */

  try {
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(filePath);
    const xmlEntry = zip.getEntry('word/document.xml');

    if (!xmlEntry) {
      throw new Error('No document.xml found in docx');
    }

    const xmlContent = zip.readAsText(xmlEntry);

    // Simple regex to extract text (removes XML tags)
    const text = xmlContent
      .replace(/<[^>]+>/g, '') // Remove XML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .trim();

    return text;
  } catch (err) {
    throw new Error(`Could not read docx file: ${err.message}`);
  }
}

// ============================================================
// DATA EXTRACTION HELPERS
// ============================================================

function extractSageNameFromFilename(filename) {
  const name = filename.replace(/\.[^.]+$/, '').trim();
  const parts = name.split(/[-–—]/);
  const englishName = parts[0].trim().toLowerCase();
  return englishName.replace(/\s+/g, '-');
}

function extractBiography(text) {
  /**
   * Extract first 2-3 sentences as biography
   */
  const sentences = text.match(/[^.!?]*[.!?]+/g) || [];
  return sentences.slice(0, 3).join('').trim().substring(0, 500);
}

function extractWorks(text) {
  /**
   * Extract main works (books, treatises, commentaries)
   * Look for patterns like:
   * - Mishneh Torah
   * - Guide for the Perplexed
   * - Commentary on Mishna
   */

  const works = [];
  const patterns = [
    /(?:wrote|authored|composed|published|created)\s+(?:the\s+)?([A-Z][A-Za-z\s—-]+?)(?:\.|,|\(|$)/gi,
    /(?:book|treatise|commentary|guide|epistle|letter)\s+(?:on|of|to)\s+([A-Z][A-Za-z\s—-]+?)(?:\.|,|$)/gi,
    /[-•*]\s+([A-Z][A-Za-z\s—-]+?)(?:\(|—|-|$)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) && works.length < 10) {
      const work = match[1]?.trim();
      if (work && work.length > 3 && !works.includes(work)) {
        works.push(work);
      }
    }
  }

  return works.slice(0, 10);
}

function extractIdeas(text) {
  /**
   * Extract key philosophical or theological ideas
   * Look for lines starting with bullets or numbers
   */

  const ideas = [];
  const lines = text.split('\n');

  for (const line of lines) {
    if (line.match(/^[-•*#0-9]+\s/) && ideas.length < 5) {
      const idea = line.replace(/^[-•*#0-9]+\s+/, '').trim();
      if (idea.length > 5) {
        ideas.push(idea);
      }
    }
  }

  // Fallback: extract sentences containing philosophical keywords
  if (ideas.length < 3) {
    const keywords = ['principle', 'concept', 'theory', 'philosophy', 'doctrine', 'belief', 'teaching'];
    const sentences = text.match(/[^.!?]*[.!?]+/g) || [];

    for (const sentence of sentences) {
      if (keywords.some((k) => sentence.toLowerCase().includes(k)) && ideas.length < 5) {
        ideas.push(sentence.trim().substring(0, 150));
      }
    }
  }

  return ideas;
}

function extractRelationships(text) {
  /**
   * Extract related sages (teachers, students, contemporaries)
   * Look for patterns like:
   * - "Student of Rabbi X"
   * - "Taught by Rabbi Y"
   * - "Contemporary of Rabbi Z"
   */

  const relations = [];
  const patterns = [
    /(?:student|disciple|pupil)\s+(?:of|under)\s+(?:Rabbi|Rav|ר"י|ר\.)\s+([A-Za-zא-ת\s-]+?)(?:\.|,|$)/gi,
    /(?:taught|instructed)\s+(?:by|under)\s+(?:Rabbi|Rav)\s+([A-Za-zא-ת\s-]+?)(?:\.|,|$)/gi,
    /(?:contemporary|colleague)\s+(?:of|with)\s+(?:Rabbi|Rav)\s+([A-Za-zא-ת\s-]+?)(?:\.|,|$)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) && relations.length < 10) {
      const name = match[1]?.trim();
      if (name && name.length > 2) {
        relations.push({ name, relation: 'related' });
      }
    }
  }

  return relations;
}

function extractLocations(text) {
  /**
   * Extract places where sage lived, studied, or worked
   * Look for geographic names (cities, regions)
   */

  const locations = [];
  const places = new Set();

  // Common location keywords (Hebrew + English)
  const locationMap = {
    'ירושלים': ['Jerusalem', 'ירושלים'],
    'טבריה': ['Tiberias', 'טבריה'],
    'בבל': ['Babylon', 'בבל', 'Iraq'],
    'ספרד': ['Spain', 'ספרד'],
    'מצרים': ['Egypt', 'מצרים', 'Cairo', 'קהיר'],
    'צפת': ['Safed', 'צפת'],
    'אשכנז': ['Ashkenaz', 'אשכנז', 'Germany', 'France'],
    'פולין': ['Poland', 'פולין'],
    'רוסיה': ['Russia', 'רוסיה'],
  };

  const lowerText = text.toLowerCase();

  for (const [hebrew, keywords] of Object.entries(locationMap)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        places.add(hebrew);
      }
    }
  }

  return Array.from(places);
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  extractSageDataFromFile,
  extractBiography,
  extractWorks,
  extractIdeas,
  extractRelationships,
  extractLocations,
};
