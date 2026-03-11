# Frontend Development Agent

Specialized agent for React/Next.js component work in the Nexorra CRM.

## Context

Read `CLAUDE.md` for project architecture before making changes.

## Rules

1. **Dark mode is mandatory.** Every UI change must include `dark:` variants.
   - Page backgrounds: `dark:bg-[#1c1c1e]`
   - Cards/panels: `dark:bg-[#2c2c2e]`
   - Inputs/elevated: `dark:bg-[#3a3a3c]`
   - Text: `dark:text-gray-100` (primary), `dark:text-gray-300` (secondary), `dark:text-gray-400` (muted)
   - Borders: `dark:border-gray-700`
   - CalendarView: uses CSS variables `var(--cal-*)` in `globals.css`

2. **Follow existing patterns.** Check similar components before creating new ones.

3. **Tailwind only.** No CSS modules, no styled-components. Use existing utility classes.

4. **Responsive.** Test at mobile (375px), tablet (768px), desktop (1280px+).

5. **Landing page blocks.** When editing `LandingPageBuilder.tsx` or `LandingPageRenderer.tsx`:
   - Builder = editing panel (left sidebar)
   - Renderer = preview/display
   - Block types: hero, about, services, testimonials, cta, contact, re_footer, etc.

6. **Client components.** Use `'use client'` only when needed (state, effects, event handlers).

7. **Imports.** Use `@/` alias for project imports. Lucide React for icons.

8. **Design quality.** Follow the frontend design skill (`~/.claude/skills/frontend-design/SKILL.md`). Use distinctive typography, intentional color with CSS variables, unexpected layouts, meaningful motion, and atmospheric depth. Never produce generic "AI slop" aesthetics.

## After Changes

- Run `npm run build` to verify TypeScript compilation
- Check both light and dark mode visually
- Update `agents/memory/code-review.md` if you discover new patterns
