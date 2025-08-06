/**
 * Frontmatter utilities for parsing and reconstructing YAML frontmatter
 * in thoughts documents
 */

/**
 * Parse frontmatter from document content
 * @param {string} content - The full document content
 * @returns {Object} Object with { frontmatter: {}, content: string }
 */
export function parseFrontmatter(content) {
  if (typeof content !== 'string') {
    return { frontmatter: {}, content: content || '' };
  }

  // Check if content starts with ---
  if (!content.startsWith('---\n')) {
    return { frontmatter: {}, content };
  }

  // Find the second --- (closing frontmatter)
  const lines = content.split('\n');
  let closingIndex = -1;
  
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      closingIndex = i;
      break;
    }
  }

  // If no closing --- found, treat as regular content
  if (closingIndex === -1) {
    return { frontmatter: {}, content };
  }

  // Extract frontmatter YAML (between the --- markers)
  const frontmatterLines = lines.slice(1, closingIndex);
  const frontmatterYaml = frontmatterLines.join('\n');
  
  // Extract content after frontmatter (skip the closing --- and any empty line)
  let contentStartIndex = closingIndex + 1;
  
  // Skip empty line after closing --- if it exists
  if (contentStartIndex < lines.length && lines[contentStartIndex] === '') {
    contentStartIndex++;
  }
  
  const remainingContent = lines.slice(contentStartIndex).join('\n');

  // Parse YAML frontmatter
  let frontmatter = {};
  if (frontmatterYaml.trim()) {
    try {
      // Simple YAML parser for key: value pairs
      frontmatter = parseSimpleYaml(frontmatterYaml);
    } catch (error) {
      console.warn('Error parsing frontmatter YAML:', error);
      // If parsing fails, return empty frontmatter but keep the content
      return { frontmatter: {}, content };
    }
  }

  return {
    frontmatter,
    content: remainingContent
  };
}

/**
 * Reconstruct document content with frontmatter
 * @param {Object} frontmatter - The frontmatter object
 * @param {string} content - The document content
 * @returns {string} Full document content with frontmatter
 */
export function reconstructWithFrontmatter(frontmatter, content) {
  // If no frontmatter or empty frontmatter, return content as-is
  if (!frontmatter || Object.keys(frontmatter).length === 0) {
    return content || '';
  }

  // Convert frontmatter object to YAML
  const yamlLines = [];
  for (const [key, value] of Object.entries(frontmatter)) {
    yamlLines.push(`${key}: ${formatYamlValue(value)}`);
  }

  // Construct full document with frontmatter
  const parts = [
    '---',
    ...yamlLines,
    '',  // Empty line before closing ---
    '---',
    '',  // Empty line after closing ---
    content || ''
  ];

  return parts.join('\n');
}

/**
 * Simple YAML parser for key: value pairs
 * @param {string} yamlString - YAML string to parse
 * @returns {Object} Parsed object
 */
function parseSimpleYaml(yamlString) {
  const result = {};
  const lines = yamlString.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue; // Skip empty lines and comments
    }

    const colonIndex = trimmedLine.indexOf(':');
    if (colonIndex === -1) {
      continue; // Skip lines without colons
    }

    const key = trimmedLine.slice(0, colonIndex).trim();
    const valueStr = trimmedLine.slice(colonIndex + 1).trim();

    // Parse value
    let value = valueStr;

    // Handle different value types
    if (value === '') {
      value = '';
    } else if (value === 'true') {
      value = true;
    } else if (value === 'false') {
      value = false;
    } else if (value === 'null') {
      value = null;
    } else if (/^-?\d+$/.test(value)) {
      value = parseInt(value, 10);
    } else if (/^-?\d*\.\d+$/.test(value)) {
      value = parseFloat(value);
    } else if ((value.startsWith('"') && value.endsWith('"')) || 
               (value.startsWith("'") && value.endsWith("'"))) {
      // Remove quotes
      value = value.slice(1, -1);
    }
    // Otherwise keep as string

    result[key] = value;
  }

  return result;
}

/**
 * Format a value for YAML output
 * @param {*} value - Value to format
 * @returns {string} YAML-formatted value
 */
function formatYamlValue(value) {
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'boolean') {
    return value.toString();
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (typeof value === 'string') {
    // Quote strings that contain special characters or are empty
    if (value === '' || value.includes(':') || value.includes('\n') || 
        value.includes('#') || /^\s/.test(value) || /\s$/.test(value)) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }
  
  // For other types, convert to JSON string
  return JSON.stringify(value);
}

/**
 * Extract frontmatter for storage in PouchDB
 * @param {string} content - Full document content
 * @returns {Object} Object with { frontmatter: {}, contentWithoutFrontmatter: string }
 */
export function extractFrontmatterForStorage(content) {
  const { frontmatter, content: contentWithoutFrontmatter } = parseFrontmatter(content);
  return {
    frontmatter,
    contentWithoutFrontmatter
  };
}

/**
 * Reconstruct content for display in editor
 * @param {Object} frontmatter - Frontmatter object from PouchDB
 * @param {string} content - Content without frontmatter from PouchDB
 * @returns {string} Full content with frontmatter for display
 */
export function reconstructForDisplay(frontmatter, content) {
  return reconstructWithFrontmatter(frontmatter, content);
}