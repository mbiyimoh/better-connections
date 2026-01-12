---
description: Create a new product update checkpoint for the What's New modal
---

# Create Product Update

Create a new product update file based on the user's description of recent improvements.

## Instructions

1. Generate a filename using today's date and a slug: `YYYY-MM-DD-{slug}.md`
2. Create the file in `/updates/` directory
3. Follow the exact markdown format with frontmatter, Summary, and Details sections
4. Each bullet in Summary must have a matching H3 in Details
5. Keep summary bullets concise (under 100 characters)
6. Write details in a friendly, informative tone
7. Set `published: true` unless the user wants a draft

## Template

```markdown
---
version: "{YYYY-MM-DD}"
title: "{Title}"
published: true
---

## Summary

- **{Feature 1}** - {Brief description}
- **{Feature 2}** - {Brief description}

## Details

### {Feature 1}

{Detailed explanation with markdown formatting}

### {Feature 2}

{Detailed explanation with markdown formatting}
```

## Format Rules

- **Summary bullets**: Use format `- **Title** - Description`
- **Details headings**: Use `### Title` where Title matches Summary exactly
- **Limit**: 3-5 summary items maximum
- **Details**: Can include lists, code blocks, emphasis, etc.
- **Tone**: Friendly, informative, user-focused

## User Input

$ARGUMENTS
