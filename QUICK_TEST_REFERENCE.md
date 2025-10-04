# Quick Test Reference Card

**Last Updated:** October 4, 2025  
**Status:** ✅ All tests passing

---

## 🚀 Quick Commands

```bash
# Run all tests
npm test -- --run

# Run with coverage
npm test -- --run --coverage

# Run specific file
npm test -- --run path/to/test.ts

# Watch mode (auto-rerun on changes)
npm test

# Run tests matching pattern
npm test -- --run -t "authentication"
```

---

## 📊 Current Stats

```
Tests:     743 passing | 333 skipped
Coverage:  93.49% security | 88.18% auth
Speed:     ~73 seconds
Flaky:     0%
Status:    ✅ All passing
```

---

## 📁 Test Locations

```
server/__tests__/
├── integration/          # Integration tests
│   ├── auth.integration.test.ts
│   └── search.integration.test.ts
├── unit/                 # Unit tests
│   ├── authEdgeCases.test.ts
│   └── middleware/
├── mocks/                # Mock factories
│   ├── factory.ts
│   ├── db.ts
│   └── services.ts
├── utils/                # Test utilities
│   └── testHelpers.ts
└── templates/            # Test templates
    ├── unit.test.ts
    ├── integration.test.ts
    └── security.test.ts

server/middleware/__tests__/    # Middleware tests
server/services/__tests__/      # Service tests
server/utils/__tests__/         # Utility tests
```

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| `server/__tests__/README.md` | Quick start guide |
| `server/__tests__/TESTING_GUIDE.md` | Comprehensive patterns |
| `server/__tests__/INFRASTRUCTURE_SETUP.md` | Infrastructure details |
| `PROJECT_COMPLETION_SUMMARY.md` | Project overview |
| `TEST_DEBT_PROJECT_COMPLETE.md` | Full project report |

---

## 🔧 Writing Tests

### Basic Unit Test

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockFactory } from '../mocks/factory';

describe('MyComponent', () => {
  let mockFactory: MockFactory;

  beforeEach(() => {
    mockFactory = new MockFactory();
  });

  afterEach(() => {
    mockFactory.cleanup();
  });

  it('should do something', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = myFunction(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```

### Integration Test

```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../index';

describe('API Endpoint', () => {
  it('should return 200', async () => {
    const response = await request(app)
      .get('/api/endpoint')
      .expect(200);
    
    expect(response.body).toHaveProperty('data');
  });
});
```

---

## 🎯 Coverage Targets

| Component | Target | Current |
|-----------|--------|---------|
| Security | >80% | 93.49% ✅ |
| Auth | >70% | 88.18% ✅ |
| Overall | >70% | 88%+ ✅ |

---

## 🐛 Troubleshooting

### Tests failing?
1. Check imports are correct
2. Verify mocks are set up
3. Check cleanup is working
4. Review test isolation

### Slow tests?
1. Check for unnecessary delays
2. Optimize database mocks
3. Parallelize where possible
4. Review test setup

### Import errors?
1. Use centralized imports from `__tests__/imports.ts`
2. Check relative paths
3. Verify mock exports

---

## ✅ Test Checklist

Before committing:
- [ ] All tests pass locally
- [ ] New tests added for new features
- [ ] Coverage maintained or improved
- [ ] No skipped tests without reason
- [ ] Tests are isolated and clean up
- [ ] Mocks are properly configured

---

## 🔍 Common Patterns

### Mock Database
```typescript
const mockDb = mockFactory.createDatabase();
```

### Mock User
```typescript
const mockUser = mockFactory.createUser({
  email: 'test@example.com',
  role: 'user'
});
```

### Mock Request/Response
```typescript
const { req, res } = mockFactory.createRequestResponse({
  method: 'GET',
  url: '/api/test'
});
```

---

## 📞 Need Help?

1. **Check documentation:**
   - `server/__tests__/README.md`
   - `server/__tests__/TESTING_GUIDE.md`

2. **Look at examples:**
   - `server/__tests__/templates/`
   - Working test files

3. **Review patterns:**
   - `server/__tests__/INFRASTRUCTURE_SETUP.md`

---

## 🎉 Quick Wins

- ✅ 743 tests passing
- ✅ 0% flaky tests
- ✅ Fast execution (~73s)
- ✅ High coverage (93% security)
- ✅ Great documentation

---

*Keep this card handy for quick reference!*  
*For details, see full documentation.*
