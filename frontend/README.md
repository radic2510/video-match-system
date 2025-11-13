# Frontend - Video Match System

Next.js-based frontend application for the Video Match System. Built with TypeScript, React, and Tailwind CSS.

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand
- **API Client**: Custom fetch wrapper with error handling
- **Testing**: Vitest + React Testing Library
- **Mock API**: MSW (Mock Service Worker) for testing

## Project Structure

```
frontend/
├── app/                      # Next.js app directory
│   ├── auth/                # Authentication pages
│   ├── layout.tsx           # Root layout with ErrorBoundary
│   ├── page.tsx             # Home page (upload form)
│   └── globals.css          # Global styles
├── components/              # React components
│   ├── ui/                  # shadcn/ui base components
│   ├── error-boundary.tsx   # Global error boundary
│   ├── skeletons.tsx        # Loading skeleton components
│   └── upload-form.tsx      # Image upload form
├── lib/                     # Utilities and helpers
│   ├── api/                 # API client and mock handlers
│   │   ├── client.ts        # API client with error handling
│   │   ├── mock-handlers.ts # MSW request handlers
│   │   └── mock-server.ts   # MSW server setup
│   ├── hooks/               # Custom React hooks
│   │   └── use-polling.ts   # Polling hook with backoff
│   └── env.ts               # Environment variable validation
├── stores/                  # Zustand state stores
│   ├── auth-store.ts        # Authentication state
│   └── match-store.ts       # Match/upload state
├── types/                   # TypeScript type definitions
│   └── api.ts               # API response types
└── __tests__/               # Test files
    ├── components/          # Component tests
    ├── lib/                 # Library tests
    └── stores/              # Store tests
```

## Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Update environment variables
# NEXT_PUBLIC_API_URL=http://localhost:8080
```

## Development

```bash
# Start development server (port 3000)
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run linter
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

## Environment Variables

Create a `.env.local` file in the frontend directory:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8080

# App Configuration
NEXT_PUBLIC_APP_NAME=Video Match System

# Environment
NODE_ENV=development
```

For production, create `.env.production`:

```env
NEXT_PUBLIC_API_URL=https://your-production-api.com
NEXT_PUBLIC_APP_NAME=Video Match System
NODE_ENV=production
```

## Key Features

### 1. Real API Integration

The API client (`lib/api/client.ts`) provides:

- **Environment-based configuration**: Uses `NEXT_PUBLIC_API_URL`
- **Automatic error handling**: Status-code-specific error messages
- **JWT authentication**: Automatic token injection in headers
- **Request logging**: Development-only logging
- **Network error handling**: User-friendly error messages

```typescript
// Example: Upload image
import { apiClient } from '@/lib/api/client'

const response = await apiClient.uploadImage(file, 'high')
```

### 2. State Management

Using Zustand for simple, type-safe state management:

#### Auth Store (`stores/auth-store.ts`)

```typescript
import { useAuthStore } from '@/stores/auth-store'

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuthStore()

  // State persists to localStorage automatically
}
```

#### Match Store (`stores/match-store.ts`)

```typescript
import { useMatchStore } from '@/stores/match-store'

function MyComponent() {
  const { uploadImage, getMatch, matches, isUploading } = useMatchStore()
}
```

### 3. Polling Hook

Custom hook for polling with exponential backoff (`lib/hooks/use-polling.ts`):

```typescript
import { usePolling } from '@/lib/hooks/use-polling'
import { useMatchStore } from '@/stores/match-store'

function ResultsPage({ matchId }: { matchId: string }) {
  const { getMatch } = useMatchStore()

  const { isPolling, elapsedMs } = usePolling(
    () => getMatch(matchId),
    (data) => data?.status === 'COMPLETED' || data?.status === 'FAILED',
    {
      enabled: true,
      onTimeout: () => alert('Processing timeout'),
      onError: (error) => console.error(error),
    }
  )

  return <div>Polling: {isPolling ? 'Yes' : 'No'}</div>
}
```

Features:
- Exponential backoff: 3s → 5s → 10s (max)
- 5-minute timeout
- Automatic cleanup on unmount
- Error handling

### 4. Error Boundary

Global error boundary wraps the entire app:

```typescript
// Automatically catches React errors
// Shows user-friendly error message
// Provides reload button

// Custom error boundary usage:
<ErrorBoundary fallback={<CustomErrorUI />}>
  <MyComponent />
</ErrorBoundary>
```

### 5. Loading Skeletons

Reusable skeleton components for loading states:

```typescript
import { MatchListSkeleton, MatchResultSkeleton, CardListSkeleton } from '@/components/skeletons'

// Show loading state
{isLoading ? <MatchListSkeleton count={5} /> : <MatchList />}
```

## Testing

### Unit Tests

Tests are colocated in `__tests__/` directory with the same structure as `app/`, `components/`, `lib/`, and `stores/`.

```bash
# Run all tests
npm test

# Run specific test file
npm test -- __tests__/lib/api/client.test.ts

# Run tests in watch mode
npm run test:watch
```

### Test Coverage

- **API Client**: 12 tests (error handling, authentication, uploads)
- **Auth Store**: 8 tests (login, register, logout, persistence)
- **Match Store**: 10 tests (upload, fetch, update, errors)
- **Polling Hook**: 8 tests (backoff, timeout, cleanup)
- **Error Boundary**: 7 tests (catch errors, reload, custom fallback)
- **Skeletons**: 8 tests (rendering, customization)

**Total**: 53 tests, all passing ✅

### Mock API (MSW)

MSW is used for testing with realistic API responses. See `lib/api/mock-handlers.ts` for mock implementations.

MSW is **only** enabled in test environment (`NODE_ENV === 'test'`), not in production.

## Component Library

Uses **shadcn/ui** components:

- Button
- Card
- Alert
- Select
- Skeleton
- Progress
- Tabs

All components are in `components/ui/` and can be customized via Tailwind.

## API Client Error Handling

The API client provides detailed error messages:

| Status Code | Error Message |
|------------|---------------|
| 400 | Invalid request |
| 401 | Authentication required |
| 403 | Access denied |
| 404 | Resource not found |
| 408 | Request timed out |
| 429 | Too many requests |
| 500 | Server error, please try again |
| 502 | Bad gateway |
| 503 | Service unavailable |
| 504 | Gateway timeout |
| Network Error | Unable to connect to server |

## Authentication Flow

1. User enters credentials on `/auth` page
2. API client calls `/api/v1/users/login`
3. JWT token stored in `localStorage` (key: `auth_token`)
4. Token automatically included in all subsequent requests
5. On 401 error, user redirected to `/auth` page
6. Logout clears token and redirects to `/auth`

## Image Upload Flow

1. User selects image on home page
2. Client-side validation (file type, size)
3. Image uploaded via `/api/v1/matches` endpoint
4. Match ID returned
5. User redirected to `/results/:matchId` (to be implemented)
6. Results page polls `/api/v1/matches/:matchId` for status

## Production Build

```bash
# Build for production
npm run build

# Start production server
npm start

# The build output is in `.next/` directory
```

## Deployment

The frontend can be deployed to:

- **Vercel** (recommended for Next.js)
- **Docker** (see `docker-compose.yml` in project root)
- **Static hosting** (after `next export`)

### Environment Variables for Production

Set these in your hosting platform:

```
NEXT_PUBLIC_API_URL=https://your-api-domain.com
```

## Known Limitations

1. **No WebSocket**: Uses polling for status updates (as per requirements)
2. **Simple Auth**: ID/PW only, no OAuth or 2FA
3. **No History Page**: Not yet implemented (planned)
4. **No Results Page**: Not yet implemented (planned)
5. **No Mobile Testing**: Responsive design not fully tested on real devices

## Next Steps (Remaining Tasks)

### High Priority

1. **Results Page** (`/results/[id]`)
   - Implement match results display
   - Use polling hook for status updates
   - Show processing progress
   - Display matched advertisement details

2. **History Page** (`/history`)
   - List all user matches
   - Add filters (status, date)
   - Add search functionality
   - Add export to CSV

3. **Enhanced Image Validation**
   - Validate image dimensions (min/max)
   - Detect actual file type (not just extension)
   - Add image compression for large files
   - Show upload progress

### Medium Priority

4. **Mobile Responsiveness**
   - Test on real mobile devices
   - Optimize touch interactions
   - Improve mobile navigation

5. **Integration Tests**
   - Add E2E tests with Playwright or Cypress
   - Test full user flows
   - Test with Docker Compose environment

### Low Priority

6. **Accessibility**
   - Add ARIA labels
   - Keyboard navigation
   - Screen reader support

7. **Performance**
   - Code splitting
   - Image optimization
   - Bundle size analysis

## Troubleshooting

### Tests failing

```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install

# Run tests with verbose output
npm test -- --reporter=verbose
```

### API connection errors

1. Check `NEXT_PUBLIC_API_URL` in `.env.local`
2. Ensure backend is running on correct port
3. Check CORS configuration on backend

### Build errors

```bash
# Check TypeScript errors
npx tsc --noEmit

# Check linter errors
npm run lint
```

## Contributing

1. Follow existing code structure
2. Write tests for new features (TDD preferred)
3. Update this README for significant changes
4. Use TypeScript strict mode
5. Follow commit message convention (feat, fix, test, docs, etc.)

## License

See project root for license information.
