import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://graphdb.pages.dev',
  integrations: [
    starlight({
      title: 'GraphDB',
      description:
        'An in-memory database with sync capabilities. Zero runtime deps. TypeScript-first.',
      social: {
        github: 'https://github.com/alexvcasillas/graphdb',
      },
      editLink: {
        baseUrl: 'https://github.com/alexvcasillas/graphdb/edit/master/apps/docs/',
      },
      head: [
        {
          tag: 'meta',
          attrs: {
            name: 'og:image',
            content: 'https://graphdb.pages.dev/og.png',
          },
        },
      ],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Installation', slug: 'getting-started/installation' },
            { label: 'Quick Start', slug: 'getting-started/quick-start' },
            { label: 'Migration to v2', slug: 'getting-started/migration-v2' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'CRUD Operations', slug: 'guides/crud-operations' },
            { label: 'Querying', slug: 'guides/querying' },
            { label: 'Indexes', slug: 'guides/indexes' },
            { label: 'Sorting & Pagination', slug: 'guides/sorting-pagination' },
            { label: 'Listeners & Events', slug: 'guides/listeners-events' },
            { label: 'Syncers', slug: 'guides/syncers' },
            { label: 'Bulk Operations', slug: 'guides/bulk-operations' },
            { label: 'TypeScript Types', slug: 'guides/typescript-types' },
          ],
        },
        {
          label: 'API Reference',
          items: [
            { label: 'GraphDB', slug: 'api-reference/graphdb' },
            { label: 'Collection', slug: 'api-reference/collection' },
            { label: 'Where Clauses', slug: 'api-reference/where-clauses' },
            { label: 'Types', slug: 'api-reference/types' },
          ],
        },
        {
          label: 'Advanced',
          items: [
            { label: 'Architecture', slug: 'advanced/architecture' },
            { label: 'Performance', slug: 'advanced/performance' },
            { label: 'Error Handling', slug: 'advanced/error-handling' },
            { label: 'Patterns', slug: 'advanced/patterns' },
          ],
        },
        {
          label: 'Examples',
          items: [
            { label: 'Basic Usage', slug: 'examples/basic-usage' },
            { label: 'Real-Time UI', slug: 'examples/real-time-ui' },
            { label: 'Backend Sync', slug: 'examples/backend-sync' },
            { label: 'Testing', slug: 'examples/testing' },
          ],
        },
      ],
    }),
  ],
});
