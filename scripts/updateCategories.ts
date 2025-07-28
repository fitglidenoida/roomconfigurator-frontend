// scripts/updateCategories.ts

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STRAPI_URL = 'http://localhost:1337';
const LOG_FILE = path.join(__dirname, 'update_log.txt');

const categoryRules = [
  { keywords: ['display', 'monitor'], type: 'Video', category: 'Display' },
  { keywords: ['speaker', 'soundbar'], type: 'Audio', category: 'Speakers' },
  { keywords: ['mic', 'microphone'], type: 'Audio', category: 'Microphones' },
  { keywords: ['codec', 'vc', 'poly', 'rally'], type: 'VC', category: 'Video Codec' },
  { keywords: ['mount', 'bracket'], type: 'Accessories', category: 'Mounting' },
  { keywords: ['switch', 'matrix'], type: 'Video', category: 'Switchers' },
  { keywords: ['controller', 'touch panel'], type: 'Control', category: 'Room Controller' },
  { keywords: ['cable', 'hdmi', 'vga', 'extender'], type: 'Cabling', category: 'Cables' },
];

const inferCategory = (text: string = '') => {
  const lower = text.toLowerCase();
  for (const rule of categoryRules) {
    if (rule.keywords.some(k => lower.includes(k))) {
      return {
        component_type: rule.type,
        component_category: rule.category,
      };
    }
  }
  return {
    component_type: 'Uncategorized',
    component_category: 'Uncategorized',
  };
};

const logToFile = async (message: string) => {
  const timestamp = new Date().toISOString();
  await fs.appendFile(LOG_FILE, `[${timestamp}] ${message}\n`, 'utf8');
};

const fetchAllComponents = async () => {
  const components: any[] = [];
  let page = 1;
  const pageSize = 100; // Smaller page size to avoid overwhelming the server
  let hasMore = true;

  while (hasMore) {
    try {
      const { data } = await axios.get(`${STRAPI_URL}/api/av-components`, {
        params: {
          pagination: {
            page,
            pageSize,
          },
        },
      });

      const fetchedComponents = data.data || [];
      components.push(...fetchedComponents);

      const pagination = data.meta?.pagination;
      if (!pagination || page >= pagination.pageCount) {
        hasMore = false;
      } else {
        page++;
      }

      await logToFile(`Fetched ${fetchedComponents.length} components from page ${page}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      await logToFile(`Error fetching components on page ${page}: ${errorMessage}`);
      throw err;
    }
  }

  return components;
};

const run = async () => {
  try {
    // Initialize log file
    await fs.writeFile(LOG_FILE, `[${new Date().toISOString()}] Starting component categorization\n`);

    const components = await fetchAllComponents();
    await logToFile(`📦 Total components fetched: ${components.length}`);

    let updatedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const component of components) {
      // Handle both Strapi v4 (with attributes) and v3 (without attributes)
      const { documentId, attributes } = component;
      const compData = attributes || component;
      const { make = '', model = '', description = '', component_type: currentType = '', component_category: currentCategory = '' } = compData;

      const matchText = `${description} ${make} ${model}`;
      const { component_type, component_category } = inferCategory(matchText);

      // Skip if no changes needed
      if (component_type === currentType && component_category === currentCategory) {
        await logToFile(`⏭️ Skipped ${model || documentId}: No changes needed (type: ${currentType}, category: ${currentCategory})`);
        skippedCount++;
        continue;
      }

      try {
        await axios.put(`${STRAPI_URL}/api/av-components/${documentId}`, {
          data: {
            component_type,
            component_category,
          },
        });

        await logToFile(`✅ Updated ${model || documentId} → ${component_type} / ${component_category}`);
        updatedCount++;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        await logToFile(`❌ Failed to update ${model || documentId}: ${errorMessage}`);
        failedCount++;
      }
    }

    const summary = `🎉 Done categorizing all components! Updated: ${updatedCount}, Skipped: ${skippedCount}, Failed: ${failedCount}`;
    await logToFile(summary);
    console.log(summary);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    const errorSummary = `❌ Script failed: ${errorMessage}`;
    await logToFile(errorSummary);
    console.error(errorSummary);
  }
};

run();