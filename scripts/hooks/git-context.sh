#!/bin/bash
# Layer 3: Git Context — writes current repo state for agents to read
cd /home/max/crm

cat > agents/context/git-state.md << EOF
# Git State ($(date '+%Y-%m-%d %H:%M'))
Branch: $(git branch --show-current)

## Last 5 Commits
$(git log --oneline -5)

## Modified Files
$(git status --short)

## Untracked
$(git ls-files --others --exclude-standard | head -10)
EOF
