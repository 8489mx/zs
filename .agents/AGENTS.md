# Project Rules

## Safe UI Component Refactoring
When refactoring UI components (like replacing `<Card>` with `<FormSection>`):
1. **Avoid fuzzy multi-line replacements** that can accidentally swallow surrounding lines (especially TypeScript interfaces or closing tags).
2. **Be extremely precise** with line numbers in `replace_file_content` and ensure the exact lines and brackets match perfectly.
3. If applying bulk replacements, do it carefully chunk by chunk and run a manual check or let Vite catch the syntax errors if they happen, but prioritize exact replacements.
4. If a syntax error occurs (e.g., Vite build fails with `[plugin:vite:react-babel] Unexpected token`), use `git restore` on the file and apply the edits line-by-line meticulously instead of trying to patch the broken syntax.
5. **Double/Duplicate lines:** Pay close attention to the lines surrounding the replacement chunks in `multi_replace_file_content`. A common mistake is replacing `return (` with another `return (` but capturing the lines incorrectly, resulting in `return ( return (`. Always check the unified diff.

## Document Prototype Layout Rules
When applying the "Document Prototype" spirit to a page to maintain visual consistency:
1. **Main Container Wrapper**: Wrap all sections (including the `PageHeader`) inside a `<main className="document-prototype-column">`.
2. **Header Consistency**: The `<PageHeader>` MUST be placed inside the `<main className="document-prototype-column">` to ensure it shares the same `max-width` and centering as the `FormSection` cards below it. This provides a unified visual alignment.
3. **Card Types**: Always use `<FormSection>` instead of `<Card>` or `<section>` tags.
4. **Width Tuning**: If the page contains a data table that requires more horizontal space (like invoices), add an inline style to increase the wrapper's max-width (e.g., `style={{ maxWidth: '1280px' }}`).
5. **Action Wrapping**: If table action buttons wrap onto multiple lines causing UI glitches, add `style={{ flexWrap: 'nowrap' }}` to their wrapper (usually `.actions`).
6. **Card Priority & Stacking**: Stack the sections vertically based on importance. The most critical data (like a table of items) goes first, followed by details, and then secondary insights.

## Build and Git Workflow Rules
1. **Never run `npm run build`, `git commit`, or `git push` automatically.** 
2. The user makes changes in bulk and will explicitly tell you when they are ready to run builds or push code.
3. Keep this rule strictly in mind and do not assume you should finalize code with a build/commit/push cycle unless the user's prompt explicitly requests it (e.g., "اعمل رن بيلد وكوميت وبوش").
