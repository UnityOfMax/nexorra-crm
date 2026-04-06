/**
 * Design skill loader — loads all relevant skills from:
 * 1. Anthropic's frontend-design plugin (SKILL.md)
 * 2. Owl-Listener/designer-skills repo (cloned to ~/.claude/skills-designer)
 *
 * Skills are concatenated as --- SKILL: name --- blocks and prepended to
 * every design generation prompt, giving Claude the full design system
 * context before it generates a single line of HTML.
 */

import * as fs from 'fs';
import * as path from 'path';

const HOME = process.env.HOME!;

// ── Skill file paths ──────────────────────────────────────────────────────────

// Anthropic's frontend-design skill (already installed via plugin marketplace)
const FRONTEND_DESIGN_SKILL = path.join(
  HOME,
  '.claude/plugins/marketplaces/claude-plugins-official/plugins/frontend-design/skills/frontend-design/SKILL.md',
);

// Owl-Listener/designer-skills repo (cloned to ~/.claude/skills-designer)
const DESIGNER_SKILLS_ROOT = path.join(HOME, '.claude/skills-designer');

// All skill paths to load from designer-skills, grouped by plugin
// Structure: {plugin}/{skills}/{skill-name}/SKILL.md
const DESIGNER_SKILL_PATHS: Array<{ plugin: string; skill: string }> = [
  // ui-design — core visual skills
  { plugin: 'ui-design',          skill: 'color-system'       },
  { plugin: 'ui-design',          skill: 'typography-scale'   },
  { plugin: 'ui-design',          skill: 'visual-hierarchy'   },
  { plugin: 'ui-design',          skill: 'layout-grid'        },
  { plugin: 'ui-design',          skill: 'spacing-system'     },
  { plugin: 'ui-design',          skill: 'dark-mode-design'   },
  // interaction-design — motion and micro-interaction
  { plugin: 'interaction-design', skill: 'animation-principles'    },
  { plugin: 'interaction-design', skill: 'micro-interaction-spec'  },
  // design-systems — tokens and theming
  { plugin: 'design-systems',     skill: 'design-token'       },
  { plugin: 'design-systems',     skill: 'theming-system'     },
];

function loadFile(filePath: string): string | null {
  try {
    if (fs.existsSync(filePath)) return fs.readFileSync(filePath, 'utf-8');
    return null;
  } catch {
    return null;
  }
}

function buildBlock(name: string, content: string): string {
  return `--- SKILL: ${name} ---\n${content.trim()}\n--- END SKILL ---`;
}

// ── Singleton — loaded once per process ──────────────────────────────────────

let _designSkillContext: string | null = null;
let _loadedSkillNames: string[] = [];

export function loadDesignSkillContext(): string {
  if (_designSkillContext !== null) return _designSkillContext;

  const blocks: string[] = [];

  // 1. Anthropic frontend-design skill
  const frontendContent = loadFile(FRONTEND_DESIGN_SKILL);
  if (frontendContent) {
    blocks.push(buildBlock('frontend-design', frontendContent));
    _loadedSkillNames.push('frontend-design');
  } else {
    console.warn('[design-skills] frontend-design SKILL.md not found at', FRONTEND_DESIGN_SKILL);
  }

  // 2. Owl-Listener/designer-skills
  if (!fs.existsSync(DESIGNER_SKILLS_ROOT)) {
    console.warn('[design-skills] designer-skills repo not found at', DESIGNER_SKILLS_ROOT);
    console.warn('[design-skills] Run: git clone https://github.com/Owl-Listener/designer-skills.git ~/.claude/skills-designer');
  } else {
    for (const { plugin, skill } of DESIGNER_SKILL_PATHS) {
      const skillPath = path.join(DESIGNER_SKILLS_ROOT, plugin, 'skills', skill, 'SKILL.md');
      const content = loadFile(skillPath);
      if (content) {
        blocks.push(buildBlock(`${plugin}/${skill}`, content));
        _loadedSkillNames.push(`${plugin}/${skill}`);
      } else {
        console.warn(`[design-skills] Missing: ${plugin}/skills/${skill}/SKILL.md`);
      }
    }
  }

  console.log(`[design-skills] Loaded ${_loadedSkillNames.length} skills: ${_loadedSkillNames.join(', ')}`);
  _designSkillContext = blocks.join('\n\n');
  return _designSkillContext;
}

// Pre-built context string — import this in demo-generator.ts
export const DESIGN_SKILL_CONTEXT = loadDesignSkillContext();

export function getLoadedSkillNames(): string[] {
  return _loadedSkillNames;
}
