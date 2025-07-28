// fetchUncategorizedComponents.ts
// fetchUncategorizedComponents.ts
import axios from 'axios';
import fs from 'fs/promises';

const STRAPI_URL = 'http://localhost:1337';
const PAGE_SIZE = 100;

const isUncategorized = (comp: any) => {
  const attrs = comp.attributes || {};
  const type = (attrs.component_type || '').toLowerCase();
  const cat = (attrs.component_category || '').toLowerCase();
  return !type || !cat || type === 'uncategorized' || cat === 'uncategorized';
};

const run = async () => {
  let page = 1;
  let hasMore = true;
  const uncategorized: any[] = [];

  console.log('🔍 Scanning for uncategorized components...\n');

  while (hasMore) {
    try {
      const url = `${STRAPI_URL}/api/av-components?pagination[page]=${page}&pagination[pageSize]=${PAGE_SIZE}&populate=*`;
      const res = await axios.get(url, {
        headers: {
          // Authorization: `Bearer ${TOKEN}` // Uncomment if needed
        },
      });

      const data = res.data.data;
      if (!data || !Array.isArray(data)) {
        console.error('❌ Unexpected response structure:', res.data);
        break;
      }

      const filtered = data.filter(isUncategorized);
      filtered.forEach((comp: any) => {
        // Check if comp.attributes exists, provide fallback values
        const model = comp.attributes?.model || 'Unknown Model';
        const description = comp.attributes?.description
          ? comp.attributes.description.slice(0, 50) + '...'
          : 'No description';
        console.log(`➕ [${comp.id || 'Unknown ID'}] ${model} – ${description}`);
      });

      uncategorized.push(...filtered);
      const pagination = res.data.meta.pagination;
      hasMore = pagination.page < pagination.pageCount;
      page++;
    } catch (err: any) {
      console.error('❌ Error fetching page', page, ':', err.message);
      break;
    }
  }

  try {
    await fs.writeFile('uncategorized-components.json', JSON.stringify(uncategorized, null, 2));
    console.log(`\n✅ Saved ${uncategorized.length} uncategorized components to "uncategorized-components.json"`);
  } catch (err: any) {
    console.error('❌ Error writing file:', err.message);
  }
};

run().catch(err => {
  console.error('❌ Error:', err.message);
});