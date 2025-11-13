# Git Strategy - Parallel Development

## ⚠️ IMPORTANT: Development Rules

Before proceeding, all agents MUST follow these rules:

1. **TDD (Test-Driven Development)**
   - Write tests FIRST, then implementation
   - All tests must pass before committing
   - See `DEVELOPMENT_GUIDELINES.md` for details

2. **Feature-Based Commits**
   - Commit after each complete feature with tests
   - Push after 3-5 features or end of day
   - No commits with failing tests

3. **Decision Requests**
   - Document questions in `personal/YYYY-MM-DD_NN.md`
   - See `personal/README.md` for template

**📖 Read DEVELOPMENT_GUIDELINES.md before starting development!**

---

## Branch Structure

```
main
├── develop
│   ├── feature/infrastructure          (Agent A)
│   ├── feature/backend-core            (Agent B)
│   ├── feature/ml-service              (Agent C)
│   ├── feature/frontend                (Agent D)
│   ├── feature/backend-integration     (Agent E)
│   └── feature/frontend-integration    (Agent F)
```

## Branch Policies

### Main Branch
- **Protected:** Yes
- **Purpose:** Production-ready code only
- **Merge:** Only from `develop` after full testing
- **Requires:**
  - All tests passing
  - Code review approval
  - No merge conflicts

### Develop Branch
- **Protected:** Yes
- **Purpose:** Integration branch for all features
- **Merge:** From feature branches
- **Requires:**
  - Feature complete
  - Unit tests passing
  - Code review approved

### Feature Branches
- **Naming:** `feature/<agent-name>`
- **Purpose:** Agent-specific development
- **Merge:** To `develop` when complete
- **Lifetime:** Delete after merge

---

## Workflow for Each Agent

### Phase 2: Parallel Development (Agents A, B, C, D)

#### Step 1: Create Feature Branch
```bash
git checkout develop
git pull origin develop
git checkout -b feature/<your-branch-name>
```

**Example for Agent A:**
```bash
git checkout -b feature/infrastructure
```

#### Step 2: Daily Sync with Develop
```bash
# Start of each day
git checkout develop
git pull origin develop
git checkout feature/<your-branch-name>
git merge develop

# Resolve conflicts if any
# Test your changes
```

#### Step 3: Feature-Based Commits (IMPORTANT!)

**⚠️ COMMIT STRATEGY:**
- Commit after completing each **FEATURE** (not every line of code)
- Push after completing **3-5 features** or at end of day

**What is a Feature?**
A feature is a complete, testable unit of functionality:
- ✅ User registration endpoint with tests
- ✅ YOLOv8 display detection with tests
- ✅ Image upload component with tests
- ❌ One line of code
- ❌ Importing a library

```bash
# TDD Workflow for each feature:
# 1. Write test FIRST ❌
# 2. Run test (should FAIL)
# 3. Implement feature ✅
# 4. Run test (should PASS)
# 5. Refactor if needed
# 6. Commit

# Example: After implementing user repository with tests
git add src/ tests/
git commit -m "feat(backend-core): implement user repository

- Add User domain model with validation
- Implement UserRepository with PostgreSQL
- Add save, findById, findByEmail methods
- Add integration tests with TestContainers
- Test coverage: 95%

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# DON'T push yet - wait for 3-5 features

# After 3-5 feature commits OR end of day:
git push origin feature/<your-branch-name>
```

#### Step 4: Merge to Develop When Complete
```bash
# Ensure all tests pass
make test

# Sync with latest develop
git checkout develop
git pull origin develop
git checkout feature/<your-branch-name>
git merge develop

# Resolve conflicts, test again
# Create pull request to develop
git push origin feature/<your-branch-name>

# Use GitHub CLI or web interface to create PR
gh pr create --title "Infrastructure setup complete" \
  --body "$(cat <<'EOF'
## Summary
- PostgreSQL with pgvector configured
- Docker Compose ready for development
- Database schema and migrations complete

## Test plan
- [x] Docker Compose starts successfully
- [x] PostgreSQL accessible
- [x] pgvector extension loaded
- [x] Schema migrations applied

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

### Phase 3: Integration (Agents E, F)

**Prerequisites:**
- Agent E: Wait for Agent B to merge
- Agent F: Wait for Agent D to merge

**Process:** Same as Phase 2

---

## Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Scopes (by Agent)
- **Agent A:** `infrastructure`, `docker`, `database`
- **Agent B:** `backend-core`, `domain`, `api`
- **Agent C:** `ml-service`, `models`, `inference`
- **Agent D:** `frontend`, `ui`, `components`
- **Agent E:** `processing`, `integration`, `gateway`
- **Agent F:** `frontend-integration`, `websocket`

### Examples

```bash
# Agent A
git commit -m "feat(infrastructure): add PostgreSQL docker configuration"

# Agent B
git commit -m "feat(backend-core): implement user repository and service"

# Agent C
git commit -m "feat(ml-service): integrate YOLOv8 display detection"

# Agent D
git commit -m "feat(frontend): add image upload component with drag-and-drop"

# Agent E
git commit -m "feat(processing): implement priority queue for image processing"

# Agent F
git commit -m "feat(frontend-integration): replace mock API with real WebSocket connection"
```

---

## Conflict Resolution

### Minimize Conflicts

**Module Boundaries:**
Each agent works in separate directories:
```
video-match-system/
├── frontend/              # Agent D, F
├── backend/
│   ├── api-gateway/       # Agent E
│   ├── core-service/      # Agent B
│   ├── processing-service/# Agent E
│   └── common/            # Agent B (create early)
├── ml-service/            # Agent C
└── infrastructure/        # Agent A
```

**Shared Files:**
Files that multiple agents might modify:
- `docker-compose.yml` - Agent A creates, others may update
- `Makefile` - Created in Phase 1, minimal updates
- `README.md` - Each agent updates their section
- `shared/contracts/` - API contracts (should be stable after Phase 1)

### If Conflicts Occur

1. **Pull latest develop:**
   ```bash
   git checkout develop
   git pull origin develop
   ```

2. **Rebase your branch:**
   ```bash
   git checkout feature/<your-branch>
   git rebase develop
   ```

3. **Resolve conflicts:**
   ```bash
   # Git will pause at conflicts
   # Edit conflicting files
   git add <resolved-files>
   git rebase --continue
   ```

4. **Test thoroughly:**
   ```bash
   make test
   make dev  # Ensure everything starts
   ```

5. **Force push (if rebased):**
   ```bash
   git push --force-with-lease origin feature/<your-branch>
   ```

---

## Pull Request Guidelines

### PR Title Format
```
<type>(<scope>): <description>
```

Example:
```
feat(ml-service): complete ML inference pipeline with ONNX models
```

### PR Description Template

```markdown
## Summary
Brief description of what this PR accomplishes.

## Changes
- List of key changes
- Organized by category

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests passing
- [ ] Manual testing completed

## Screenshots (if applicable)
For UI changes, add screenshots or GIFs.

## Related Issues
Closes #123

## Checklist
- [ ] Code follows project conventions
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] No merge conflicts with develop

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Review Process

1. **Self-review:** Review your own PR first
2. **Automated checks:** Ensure CI passes
3. **Peer review:** At least 1 approval required
4. **Merge:** Squash and merge to develop

---

## Release Process

### Creating a Release

After Phase 4 (testing complete):

1. **Merge develop to main:**
   ```bash
   git checkout main
   git pull origin main
   git merge develop

   # Tag the release
   git tag -a v1.0.0 -m "Release v1.0.0: Initial production release

   Features:
   - Complete ML inference pipeline
   - Backend API with priority queue
   - Frontend with real-time updates
   - Admin dashboard

   Performance:
   - Processing time: 500-1500ms
   - Throughput: 500-1000 req/hour
   - Test coverage: >80%"

   git push origin main --tags
   ```

2. **Deploy to production:**
   ```bash
   # Use deployment script
   ./infrastructure/scripts/deploy/deploy.sh v1.0.0
   ```

---

## Git LFS for Model Files

### Setup Git LFS
```bash
# Install Git LFS
git lfs install

# Track model files
git lfs track "*.onnx"
git lfs track "*.pt"
git lfs track "*.pth"

# Commit .gitattributes
git add .gitattributes
git commit -m "chore: configure Git LFS for model files"
```

### Agent C: Adding Models
```bash
# Add model files
cp /path/to/yolov8-display.onnx models/yolo/
git add models/yolo/yolov8-display.onnx
git commit -m "feat(models): add YOLOv8 display detection model

Model details:
- Size: 25MB
- Input: 640x640
- mAP: 0.92"

git push origin feature/ml-service
```

---

## Best Practices

### DO

✅ **Commit frequently** - After each subtask completion
✅ **Write clear commit messages** - Follow conventional commits
✅ **Sync daily** - Merge develop into your branch every morning
✅ **Test before pushing** - Run tests locally
✅ **Update documentation** - Keep docs in sync with code
✅ **Use atomic commits** - One logical change per commit

### DON'T

❌ **Don't commit to main directly** - Always go through develop
❌ **Don't commit secrets** - Use .env files (gitignored)
❌ **Don't commit large files without LFS** - Models >10MB need LFS
❌ **Don't work on others' branches** - Stick to your feature branch
❌ **Don't merge without testing** - Always test after merging develop
❌ **Don't push broken code** - Fix issues before pushing

---

## Emergency Procedures

### Hotfix Process

If critical bug found in production:

```bash
# Create hotfix branch from main
git checkout main
git checkout -b hotfix/critical-gpu-memory-leak

# Fix the issue
# Test thoroughly

# Merge to both main and develop
git checkout main
git merge hotfix/critical-gpu-memory-leak
git push origin main

git checkout develop
git merge hotfix/critical-gpu-memory-leak
git push origin develop

# Tag new version
git tag -a v1.0.1 -m "Hotfix: Fix GPU memory leak"
git push origin --tags

# Delete hotfix branch
git branch -d hotfix/critical-gpu-memory-leak
```

---

## Agent Coordination

### Daily Standup (via Comments)

Each agent posts progress as PR comments or discussion:

**Format:**
```markdown
## Daily Update - Agent C (ML Service) - 2025-01-16

### Yesterday
- ✅ Completed YOLOv8 model integration
- ✅ Implemented display detection endpoint
- ✅ Added unit tests for detection

### Today
- 🔄 Implementing CLIP embedding extraction
- 🔄 Setting up FAISS vector search

### Blockers
- None

### Notes
- YOLOv8 inference time: 45ms (meets target)
```

---

## Summary for Agents

| Phase | Agent | Branch | Merge to Develop |
|-------|-------|--------|------------------|
| 2 | A: Infrastructure | feature/infrastructure | Day 2-3 |
| 2 | B: Backend Core | feature/backend-core | Day 7-8 |
| 2 | C: ML Service | feature/ml-service | Day 10-12 |
| 2 | D: Frontend | feature/frontend | Day 5-7 |
| 3 | E: Backend Integration | feature/backend-integration | Day 13-14 |
| 3 | F: Frontend Integration | feature/frontend-integration | Day 15-16 |

**Key Dates:**
- Day 1: Phase 1 complete, develop branch ready
- Day 2-12: Phase 2 parallel development
- Day 13-14: Phase 3 integration
- Day 15-17: Phase 4 testing & optimization
- Day 18: Release v1.0.0

---

## Tools

### Recommended Git Tools

- **Git CLI** - For command-line operations
- **GitHub CLI (gh)** - For PR management
- **VS Code Git** - For visual diff/merge
- **GitKraken / SourceTree** - For branch visualization

### Useful Git Commands

```bash
# View branch history
git log --oneline --graph --all

# View changes
git diff develop..feature/your-branch

# Stash changes
git stash
git stash pop

# Cherry-pick commit
git cherry-pick <commit-hash>

# Reset to develop
git reset --hard origin/develop  # ⚠️ Destructive!

# View who changed what
git blame <file>

# Search commit messages
git log --grep="feat(ml-service)"
```

---

**Remember:** Communication is key! If you're making changes that might affect other agents, notify them immediately.
