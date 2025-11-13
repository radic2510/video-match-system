# Development Guidelines

## Core Principles

All agents MUST follow these core development principles throughout the project.

---

## 1. Test-Driven Development (TDD) 🔴 🟢 🔵

### Mandatory TDD Workflow

**Every feature MUST follow this strict workflow:**

```
1. Write Test (RED) ❌
   ↓
2. Run Test (Should FAIL)
   ↓
3. Write Code (GREEN) ✅
   ↓
4. Run Test (Should PASS)
   ↓
5. Refactor (REFACTOR) 🔵
   ↓
6. Run Test Again (Should STILL PASS)
   ↓
7. Commit
```

### TDD Rules

#### ✅ DO

- **Write tests FIRST** - Before writing any implementation code
- **Write minimal code** - Only enough to make the test pass
- **Run tests frequently** - After every small change
- **Test one thing** - Each test should verify one behavior
- **Refactor confidently** - Tests provide safety net
- **Commit after green** - Only commit when tests pass

#### ❌ DON'T

- **DON'T write implementation first** - Tests must come first
- **DON'T skip tests** - No code without tests
- **DON'T commit failing tests** - All tests must pass before commit
- **DON'T write complex tests** - Keep tests simple and readable
- **DON'T test implementation details** - Test behavior, not internals

---

### TDD Examples by Technology

#### Backend (Kotlin/Spring Boot)

```kotlin
// 1. Write test FIRST (RED)
@Test
fun `should create user with valid data`() {
    // Given
    val request = CreateUserRequest(
        email = "user@example.com",
        password = "password123",
        name = "John Doe"
    )

    // When
    val result = userService.createUser(request)

    // Then
    assertThat(result.email).isEqualTo("user@example.com")
    assertThat(result.name).isEqualTo("John Doe")
    assertThat(result.id).isNotNull()
}

// 2. Run test → FAILS (UserService doesn't exist yet)

// 3. Write minimal implementation (GREEN)
class UserService(private val userRepository: UserRepository) {
    suspend fun createUser(request: CreateUserRequest): User {
        val user = User(
            id = UUID.randomUUID(),
            email = request.email,
            name = request.name,
            createdAt = Instant.now()
        )
        return userRepository.save(user)
    }
}

// 4. Run test → PASSES ✅

// 5. Refactor if needed
// 6. Run test again → Still PASSES
// 7. Commit
```

---

#### ML Service (Python)

```python
# 1. Write test FIRST (RED)
def test_yolo_detector_should_detect_display():
    # Given
    detector = YOLOv8Detector(model_path="models/yolo.onnx")
    image = cv2.imread("tests/fixtures/display_front_view.jpg")

    # When
    detections = detector.detect_display(image)

    # Then
    assert len(detections) > 0
    assert detections[0].confidence > 0.7
    assert detections[0].class_name == "display"

# 2. Run test → FAILS (YOLOv8Detector doesn't exist)

# 3. Write minimal implementation (GREEN)
class YOLOv8Detector:
    def __init__(self, model_path: str):
        self.session = ort.InferenceSession(model_path)

    def detect_display(self, image: np.ndarray) -> List[Detection]:
        # Preprocess
        input_tensor = self.preprocess(image)

        # Inference
        outputs = self.session.run(None, {"images": input_tensor})

        # Postprocess
        detections = self.postprocess(outputs[0])
        return detections

# 4. Run test → PASSES ✅
# 5. Refactor
# 6. Run test again → Still PASSES
# 7. Commit
```

---

#### Frontend (React/TypeScript)

```typescript
// 1. Write test FIRST (RED)
describe('ImageUpload', () => {
  it('should display preview when image is selected', async () => {
    // Given
    render(<ImageUpload onUpload={mockOnUpload} />);
    const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(/upload image/i);

    // When
    await userEvent.upload(input, file);

    // Then
    const preview = await screen.findByRole('img');
    expect(preview).toBeInTheDocument();
    expect(preview).toHaveAttribute('alt', 'test.jpg');
  });
});

// 2. Run test → FAILS (ImageUpload doesn't show preview)

// 3. Write implementation (GREEN)
export function ImageUpload({ onUpload }: Props) {
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
      onUpload(file);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} />
      {preview && <img src={preview} alt={file.name} />}
    </div>
  );
}

// 4. Run test → PASSES ✅
// 5. Refactor
// 6. Commit
```

---

### Test Coverage Requirements

| Component | Minimum Coverage | Target Coverage |
|-----------|-----------------|-----------------|
| Backend Core | 80% | 90% |
| Processing Service | 75% | 85% |
| ML Service | 75% | 85% |
| Frontend Components | 70% | 80% |

### Running Tests

**Backend:**
```bash
# Run all tests
./gradlew test

# Run specific module tests
./gradlew :core-service:test

# Run with coverage
./gradlew test jacocoTestReport
```

**ML Service:**
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/unit/test_yolo_detector.py -v
```

**Frontend:**
```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

---

## 2. Feature-Based Commits

### Commit Strategy

**Commit after completing each feature or logical unit of work:**

#### What is a "Feature"?

A feature is a complete, testable unit of functionality:

✅ **Good feature boundaries:**
- Implemented user registration endpoint with validation
- Added YOLOv8 display detection with tests
- Created image upload component with preview
- Implemented priority queue with resource monitoring

❌ **Too small (don't commit):**
- Added one line of code
- Fixed typo
- Imported a library

❌ **Too large (split into multiple commits):**
- Implemented entire authentication system (split: registration, login, JWT, refresh)
- Complete ML pipeline (split: detection, embedding, matching, verification)

---

### Commit Workflow

```bash
# 1. Write tests for a feature
git add tests/

# 2. Implement feature
git add src/

# 3. Ensure all tests pass
make test  # or npm test, pytest, etc.

# 4. Commit with descriptive message
git commit -m "feat(scope): description

- Detailed change 1
- Detailed change 2
- Test coverage: 85%

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# 5. After completing 3-5 related features, push
git push origin feature/your-branch
```

---

### When to Push

Push to remote **after completing a logical milestone:**

✅ **Good push points:**
- Completed a major component (e.g., User repository + service + controller)
- Finished a full workflow (e.g., Image upload → detection → matching)
- End of day (if you have working, tested code)
- Before switching to a different task
- After completing 3-5 related features

⏰ **Push frequency:**
- Minimum: Once per day
- Maximum: After every feature (if features are small)
- Recommended: After 3-5 feature commits

---

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `test`: Adding or updating tests
- `refactor`: Code refactoring (no behavior change)
- `docs`: Documentation only
- `style`: Code style (formatting, etc.)
- `chore`: Maintenance tasks

**Examples:**

```bash
# After implementing user registration with tests
git commit -m "feat(core): implement user registration endpoint

- Add User domain model
- Implement UserRepository with PostgreSQL
- Add UserService with validation
- Create POST /users/register endpoint
- Add integration tests
- Test coverage: 92%"

# After implementing YOLO detection with tests
git commit -m "feat(ml-service): add YOLOv8 display detection

- Implement YOLOv8Detector class with ONNX Runtime
- Add preprocessing (resize, normalize)
- Add postprocessing (NMS, bbox extraction)
- Add unit tests with fixture images
- Add GPU memory management
- Test coverage: 88%
- Inference time: 45ms (meets target)"

# After creating image upload component with tests
git commit -m "feat(frontend): implement image upload with drag-and-drop

- Create ImageUpload component
- Add drag-and-drop functionality
- Add file validation (size, format)
- Add image preview
- Add upload progress indicator
- Add component tests with React Testing Library
- Test coverage: 85%"
```

---

## 3. Decision Requests & Documentation

### Personal Folder Structure

When you need user input or approval, document it in the `personal/` folder:

```
personal/
├── 2025-01-15_01.md  # First request of the day
├── 2025-01-15_02.md  # Second request of the day
├── 2025-01-16_01.md
└── README.md
```

---

### When to Create a Decision Request

Create a document in `personal/` when:

✅ **Architectural decisions:**
- "Should we use HNSW or IVF index for FAISS?"
- "Which JWT library should we use?"
- "Should we implement connection pooling?"

✅ **Resource decisions:**
- "Need access to GPU server for model testing"
- "Need sample advertisement videos for testing"
- "Need API keys for external services"

✅ **Ambiguous requirements:**
- "How should we handle duplicate user emails?"
- "What should be the default priority for image processing?"
- "Should we support video formats other than MP4?"

✅ **Performance trade-offs:**
- "Trade-off between accuracy and speed: Use 2 models or 4 models?"
- "Cache size: 10GB or 20GB?"

❌ **DON'T create for:**
- Implementation details you can decide
- Standard best practices
- Questions answered in existing docs

---

### Decision Request Template

**File:** `personal/2025-01-15_01.md`

```markdown
# Decision Request: [Brief Title]

**Date:** 2025-01-15
**Agent:** Agent C (ML Service)
**Priority:** 🔴 High / 🟡 Medium / 🟢 Low
**Blocks:** Yes / No

---

## Context

Brief description of the situation and why a decision is needed.

## Question

Clear, specific question that needs to be answered.

## Options

### Option 1: [Name]
**Pros:**
- Pro 1
- Pro 2

**Cons:**
- Con 1
- Con 2

**Estimated Impact:**
- Development time: +2 days
- Performance: +15% accuracy
- Cost: None

### Option 2: [Name]
**Pros:**
- Pro 1

**Cons:**
- Con 1

**Estimated Impact:**
- Development time: +1 day
- Performance: +5% accuracy
- Cost: $100/month

## Recommendation

My recommendation with reasoning.

## Required by

Date or milestone when decision is needed.

---

## User Response

<!-- User fills this section -->

**Decision:** Option 1

**Reasoning:** [User's reasoning]

**Additional Notes:** [Any additional context]
```

---

### Example Decision Requests

#### Example 1: Model Selection

**File:** `personal/2025-01-16_01.md`

```markdown
# Decision Request: ESRGAN Model Selection

**Date:** 2025-01-16
**Agent:** Agent C (ML Service)
**Priority:** 🟡 Medium
**Blocks:** No (can use placeholder)

---

## Context

Real-ESRGAN has multiple model variants:
- Real-ESRGAN-x2 (faster, 2x upscaling)
- Real-ESRGAN-x4 (slower, 4x upscaling)
- Real-ESRGAN-anime (optimized for animation)

We need to choose which model to integrate.

## Question

Which Real-ESRGAN model should we use for image quality enhancement?

## Options

### Option 1: Real-ESRGAN-x4
**Pros:**
- Better quality improvement (4x)
- Better for very low-quality images

**Cons:**
- Slower inference (500ms)
- Larger model size (64MB)
- Higher GPU memory usage

**Estimated Impact:**
- Processing time per image: +500ms
- Quality improvement: High
- GPU memory: +800MB

### Option 2: Real-ESRGAN-x2
**Pros:**
- Faster inference (200ms)
- Smaller model (32MB)
- Lower GPU memory usage

**Cons:**
- Less quality improvement
- May not be sufficient for very blurry images

**Estimated Impact:**
- Processing time per image: +200ms
- Quality improvement: Medium
- GPU memory: +400MB

## Recommendation

Option 1 (Real-ESRGAN-x4) because:
1. We have sufficient GPU memory (RTX 3080 10GB)
2. Quality is more important than speed for this use case
3. We can conditionally apply it only to low-quality images

## Required by

Phase 2, Day 5 (when implementing quality enhancement)

---

## User Response

**Decision:** Option 1

**Reasoning:** Agreed, quality is priority. 500ms is acceptable for selective use.

**Additional Notes:** Also implement quality threshold check - only use ESRGAN when quality score < 0.5
```

---

#### Example 2: Test Data Request

**File:** `personal/2025-01-17_01.md`

```markdown
# Request: Test Advertisement Videos

**Date:** 2025-01-17
**Agent:** Agent C (ML Service)
**Priority:** 🔴 High
**Blocks:** Yes (need for testing)

---

## Context

I need sample advertisement videos to:
1. Test video preprocessing pipeline
2. Generate embeddings for vector database
3. Test matching accuracy

## Request

Please provide 5-10 sample advertisement videos (15-30 seconds each).

## Requirements

- Format: MP4, H.264
- Resolution: 1080p preferred, 720p acceptable
- Content: Variety of brands/styles
- Rights: Can be used for testing

## Where to Place

```
/data/videomatch/test-videos/
├── nike_ad_01.mp4
├── samsung_ad_01.mp4
└── ...
```

## Timeline

Needed by: Phase 2, Day 6

---

## User Response

**Status:** ✅ Completed

**Location:** `/data/videomatch/test-videos/`

**Files provided:**
- 8 advertisement videos (various brands)
- Metadata CSV with brand names and durations

**Notes:** Also added some challenging cases (low quality, moiré patterns) for edge case testing.
```

---

## 4. Code Review Checklist

Before pushing code, verify:

### Tests
- [ ] All tests written BEFORE implementation
- [ ] All tests passing
- [ ] Test coverage meets requirements
- [ ] Edge cases tested
- [ ] Error cases tested

### Code Quality
- [ ] Code follows project conventions
- [ ] No hardcoded values (use config/env)
- [ ] Proper error handling
- [ ] Logging added for important operations
- [ ] No commented-out code
- [ ] No debug print statements

### Documentation
- [ ] Public APIs documented
- [ ] Complex logic has comments
- [ ] README updated if needed
- [ ] API contracts followed

### Git
- [ ] Commit messages follow convention
- [ ] No large files without Git LFS
- [ ] No secrets in code
- [ ] Branch up to date with develop

---

## 5. Daily Workflow

### Morning
1. Pull latest from develop
2. Merge develop into your feature branch
3. Run all tests
4. Review your todo list

### During Development
1. Pick next feature from todo list
2. Write test (RED)
3. Implement feature (GREEN)
4. Refactor (BLUE)
5. Run tests (must pass)
6. Commit
7. Repeat

### Evening
1. Ensure all tests pass
2. Push to remote
3. Update progress in PR/discussion
4. Create decision requests if needed

---

## 6. Agent-Specific Notes

### Agent A (Infrastructure)
- TDD applies to scripts and configurations
- Test database migrations
- Test Docker compose configurations
- Verify services start correctly

### Agent B (Backend Core)
- Follow Spring Boot testing best practices
- Use MockK for mocking
- Test with TestContainers for integration tests
- Aim for 90% coverage

### Agent C (ML Service)
- Use pytest with fixtures
- Mock GPU operations when not available
- Test with sample images
- Benchmark performance (add to tests)

### Agent D (Frontend)
- Use React Testing Library
- Test user interactions, not implementation
- Use MSW for API mocking
- Aim for 80% component coverage

### Agent E (Backend Integration)
- Integration tests are critical
- Test full workflows
- Test error handling and retries
- Load testing

### Agent F (Frontend Integration)
- E2E tests with Playwright
- Test real API integration
- Test WebSocket connections
- Performance testing

---

## Summary

### Three Core Rules

1. **TDD Always** 🔴 🟢 🔵
   - Write test first
   - Make it pass
   - Refactor
   - Commit

2. **Feature-Based Commits**
   - Complete feature with tests
   - Commit
   - Push after 3-5 features

3. **Decision Requests**
   - Document in `personal/YYYY-MM-DD_NN.md`
   - Include options and recommendation
   - Wait for user response if blocking

---

**Remember:** Tests are not optional. Tests are the first code you write for every feature.
