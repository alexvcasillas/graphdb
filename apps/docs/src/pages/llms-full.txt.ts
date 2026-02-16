import type { APIRoute } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';

// Sidebar order for structured output
const sectionOrder = [
  'index',
  'getting-started/installation',
  'getting-started/quick-start',
  'getting-started/migration-v2',
  'guides/crud-operations',
  'guides/querying',
  'guides/indexes',
  'guides/sorting-pagination',
  'guides/listeners-events',
  'guides/syncers',
  'guides/bulk-operations',
  'guides/typescript-types',
  'api-reference/graphdb',
  'api-reference/collection',
  'api-reference/where-clauses',
  'api-reference/types',
  'advanced/architecture',
  'advanced/performance',
  'advanced/error-handling',
  'advanced/patterns',
  'examples/basic-usage',
  'examples/real-time-ui',
  'examples/backend-sync',
  'examples/testing',
];

export const GET: APIRoute = async () => {
  const docs: CollectionEntry<'docs'>[] = await getCollection('docs');

  const docMap = new Map(docs.map((doc: CollectionEntry<'docs'>) => [doc.id, doc]));

  const parts: string[] = [
    '# GraphDB — Full Documentation',
    '',
    '> An in-memory database with sync capabilities. Zero runtime deps. TypeScript-first.',
    '',
    'Source: https://github.com/alexvcasillas/graphdb',
    'Docs: https://graphdb.pages.dev',
    '',
    '---',
    '',
  ];

  for (const slug of sectionOrder) {
    const doc = docMap.get(slug);
    if (!doc) continue;

    const title = (doc.data as { title: string }).title;
    parts.push(`# ${title}`);
    parts.push('');
    parts.push(doc.body ?? '');
    parts.push('');
    parts.push('---');
    parts.push('');
  }

  // Append any docs not in the explicit order
  for (const doc of docs) {
    if (!sectionOrder.includes(doc.id)) {
      parts.push(`# ${(doc.data as { title: string }).title}`);
      parts.push('');
      parts.push(doc.body ?? '');
      parts.push('');
      parts.push('---');
      parts.push('');
    }
  }

  return new Response(parts.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
