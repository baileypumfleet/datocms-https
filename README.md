# datocms-https
This uses the DatoCMS API to go into your blog posts (or other records) and change the URLs to use HTTPS instead of HTTP, which provides SEO benefits.

It checks with you before making changes, so you can see what it's going to change.

To install dependencies:

```bash
bun install
```

Now copy `.env.example` to `.env` and add your DatoCMS API token and blog post model ID.

To run:

```bash
bun run index.ts
```