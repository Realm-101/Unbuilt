# Test Data Factories

This directory contains test data factories for creating, persisting, and cleaning up test data for E2E testing. Factories provide a consistent and maintainable way to generate test data with sensible defaults and easy customization.

## Overview

Test data factories follow the Factory pattern to create test objects with:
- **Sensible defaults** - Work out of the box without configuration
- **Easy customization** - Override any property as needed
- **Database integration** - Persist and cleanup test data
- **Relationship support** - Create related objects together
- **Isolation** - Each test gets fresh, independent data

## Available Factories

### UserFactory
Creates test users with different roles and subscription plans.

**Location:** `user.factory.ts`

**Basic Usage:**
```typescript
import { UserFactory } from '../fixtures/user.factory';

// Create a user object (not persisted)
const user = UserFactory.create();

// Create and persist to database
const persistedUser = await UserFactory.createAndPersist();

// Create specific user types
const freeUser = await UserFactory.createAndPersistFreeUser();
const proUser = await UserFactory.createAndPersistProUser();
const enterpriseUser = await UserFactory.createAndPersistEnterpriseUser();
const adminUser = UserFactory.createAdminUser();

// Customize properties
const customUser = await UserFactory.createAndPersist({
  email: 'custom@example.com',
  plan: 'pro',
  searchCount: 5
});

// Cleanup after test
await UserFactory.cleanup(user.id);
```

**Key Methods:**
- `create(overrides?)` - Create user object
- `createFreeUser(overrides?)` - Create free tier user
- `createProUser(overrides?)` - Create pro tier user
- `createEnterpriseUser(overrides?)` - Create enterprise user
- `createAdminUser(overrides?)` - Create admin user
- `createOAuthUser(provider, overrides?)` - Create OAuth user
- `persist(user)` - Save user to database
- `createAndPersist(overrides?)` - Create and save in one step
- `cleanup(userId)` - Delete user from database
- `cleanupMany(userIds)` - Delete multiple users
- `findByEmail(email)` - Find user by email
- `updateSearchCount(userId, count)` - Update search count
- `updateSubscription(userId, plan, status)` - Update subscription

**Example Test:**
```typescript
test('should create user with valid data', async ({ page }) => {
  // Arrange
  const testUser = await UserFactory.createAndPersistFreeUser({
    email: 'test@example.com'
  });
  
  // Act
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(testUser.email, testUser.password);
  
  // Assert
  await expect(page).toHaveURL('/dashboard');
  
  // Cleanup
  await UserFactory.cleanup(testUser.id!);
});
```

### SearchFactory
Creates test searches with configurable results and scores.

**Location:** `search.factory.ts`

**Basic Usage:**
```typescript
import { SearchFactory } from '../fixtures/search.factory';

// Create a search object
const search = SearchFactory.create(userId);

// Create and persist
const persistedSearch = await SearchFactory.createAndPersist(userId);

// Create with specific state
const pendingSearch = SearchFactory.createPending(userId);
const completedSearch = SearchFactory.createCompleted(userId);
const failedSearch = SearchFactory.createFailed(userId);
const favoriteSearch = SearchFactory.createFavorite(userId);

// Create with custom results
const searchWithResults = await SearchFactory.createAndPersistCompleted(userId, {
  query: 'Gaps in sustainable packaging',
  results: SearchFactory.generateResults(5, { innovationScore: 85 })
});

// Cleanup
await SearchFactory.cleanup(search.id);
await SearchFactory.cleanupByUser(userId);
```

**Key Methods:**
- `create(userId, overrides?)` - Create search object
- `createPending(userId, overrides?)` - Create pending search
- `createCompleted(userId, overrides?)` - Create completed search with results
- `createFailed(userId, overrides?)` - Create failed search
- `createFavorite(userId, overrides?)` - Create favorite search
- `generateResults(count, overrides?)` - Generate search results
- `createResultWithScore(score, overrides?)` - Create result with specific score
- `createHighScoringResults(count)` - Create high-scoring results (85+)
- `createLowScoringResults(count)` - Create low-scoring results (<50)
- `persist(search)` - Save search to database
- `persistResults(searchId, results)` - Save search results
- `createAndPersist(userId, overrides?)` - Create and save in one step
- `cleanup(searchId)` - Delete search and results
- `cleanupByUser(userId)` - Delete all user searches
- `updateFavorite(searchId, isFavorite)` - Update favorite status
- `findById(searchId)` - Find search by ID

**Example Test:**
```typescript
test('should display search results correctly', async ({ page }) => {
  // Arrange
  const user = await UserFactory.createAndPersistProUser();
  const search = await SearchFactory.createAndPersistCompleted(user.id!, {
    query: 'AI-powered market research',
    results: SearchFactory.createHighScoringResults(3)
  });
  
  // Act
  const resultsPage = new SearchResultsPage(page);
  await resultsPage.goto(search.id!);
  
  // Assert
  const score = await resultsPage.getInnovationScore();
  expect(score).toBeGreaterThan(80);
  
  // Cleanup
  await SearchFactory.cleanup(search.id!);
  await UserFactory.cleanup(user.id!);
});
```

### ConversationFactory
Creates test conversations with messages and suggested questions.

**Location:** `conversation.factory.ts`

**Basic Usage:**
```typescript
import { ConversationFactory } from '../fixtures/conversation.factory';

// Create a conversation object
const conversation = ConversationFactory.create(analysisId, userId);

// Create with messages
const withMessages = ConversationFactory.createWithMessages(
  analysisId,
  userId,
  4 // number of messages
);

// Create at message limit (for tier testing)
const atLimit = ConversationFactory.createAtMessageLimit(analysisId, userId, 10);

// Create and persist
const persisted = await ConversationFactory.createAndPersistWithMessages(
  analysisId,
  userId,
  6
);

// Add message to existing conversation
const newMessage = ConversationFactory.createUserMessage('What is the market size?');
await ConversationFactory.addMessage(conversation.id!, newMessage);

// Cleanup
await ConversationFactory.cleanup(conversation.id);
await ConversationFactory.cleanupByUser(userId);
```

**Key Methods:**
- `create(analysisId, userId, overrides?)` - Create conversation object
- `createWithMessages(analysisId, userId, count, overrides?)` - Create with messages
- `createAtMessageLimit(analysisId, userId, limit)` - Create at message limit
- `generateMessages(count, overrides?)` - Generate messages
- `createUserMessage(content, overrides?)` - Create user message
- `createAssistantMessage(content, overrides?)` - Create AI message
- `generateSuggestedQuestions(count, overrides?)` - Generate questions
- `persist(conversation)` - Save conversation to database
- `persistMessages(conversationId, messages)` - Save messages
- `persistSuggestedQuestions(conversationId, questions)` - Save questions
- `createAndPersist(analysisId, userId, overrides?)` - Create and save
- `addMessage(conversationId, message)` - Add message to conversation
- `cleanup(conversationId)` - Delete conversation and messages
- `cleanupByAnalysis(analysisId)` - Delete all analysis conversations
- `cleanupByUser(userId)` - Delete all user conversations
- `getMessageCount(conversationId)` - Get message count
- `markQuestionAsUsed(questionId)` - Mark question as used

**Example Test:**
```typescript
test('should enforce message limit for free tier', async ({ page }) => {
  // Arrange
  const user = await UserFactory.createAndPersistFreeUser();
  const search = await SearchFactory.createAndPersistCompleted(user.id!);
  const conversation = await ConversationFactory.createAndPersistWithMessages(
    search.id!,
    user.id!,
    10 // At free tier limit
  );
  
  // Act
  const conversationPage = new ConversationPage(page);
  await conversationPage.goto(conversation.id!);
  
  // Assert
  const canSendMessage = await conversationPage.isMessageInputEnabled();
  expect(canSendMessage).toBe(false);
  
  // Cleanup
  await ConversationFactory.cleanup(conversation.id!);
  await SearchFactory.cleanup(search.id!);
  await UserFactory.cleanup(user.id!);
});
```

### ResourceFactory
Creates test resources with categories, tags, bookmarks, and ratings.

**Location:** `resource.factory.ts`

**Basic Usage:**
```typescript
import { ResourceFactory } from '../fixtures/resource.factory';

// Create a resource object
const resource = ResourceFactory.create();

// Create specific resource types
const tool = ResourceFactory.createTool();
const template = ResourceFactory.createTemplate();
const guide = ResourceFactory.createGuide();
const video = ResourceFactory.createVideo();
const article = ResourceFactory.createArticle();

// Create premium or highly-rated resources
const premium = ResourceFactory.createPremium();
const highlyRated = ResourceFactory.createHighlyRated();

// Create and persist
const persisted = await ResourceFactory.createAndPersist({
  title: 'Market Research Template',
  resourceType: 'template'
});

// Create with category
const { resource, category } = await ResourceFactory.createAndPersistWithCategory(
  { name: 'Market Research' },
  { resourceType: 'guide' }
);

// Create related objects
const bookmark = await ResourceFactory.persistBookmark(
  ResourceFactory.createBookmark(userId, resource.id!)
);

const rating = await ResourceFactory.persistRating(
  ResourceFactory.createRating(userId, resource.id!, 5)
);

// Cleanup
await ResourceFactory.cleanup(resource.id);
await ResourceFactory.cleanupCategory(category.id);
```

**Key Methods:**
- `create(overrides?)` - Create resource object
- `createTool(overrides?)` - Create tool resource
- `createTemplate(overrides?)` - Create template resource
- `createGuide(overrides?)` - Create guide resource
- `createVideo(overrides?)` - Create video resource
- `createArticle(overrides?)` - Create article resource
- `createPremium(overrides?)` - Create premium resource
- `createHighlyRated(overrides?)` - Create highly-rated resource
- `createCategory(overrides?)` - Create category
- `createTag(overrides?)` - Create tag
- `createBookmark(userId, resourceId, overrides?)` - Create bookmark
- `createRating(userId, resourceId, rating, overrides?)` - Create rating
- `persist(resource)` - Save resource to database
- `persistCategory(category)` - Save category
- `persistTag(tag)` - Save tag
- `persistBookmark(bookmark)` - Save bookmark
- `persistRating(rating)` - Save rating
- `createAndPersist(overrides?)` - Create and save resource
- `createAndPersistWithCategory(categoryOverrides, resourceOverrides)` - Create with category
- `addTags(resourceId, tagIds)` - Add tags to resource
- `cleanup(resourceId)` - Delete resource and related data
- `cleanupCategory(categoryId)` - Delete category
- `cleanupTag(tagId)` - Delete tag
- `cleanupBookmark(bookmarkId)` - Delete bookmark
- `cleanupRating(ratingId)` - Delete rating
- `updateViewCount(resourceId, count)` - Update view count
- `updateBookmarkCount(resourceId, count)` - Update bookmark count

**Example Test:**
```typescript
test('should bookmark and rate resources', async ({ page }) => {
  // Arrange
  const user = await UserFactory.createAndPersistProUser();
  const resource = await ResourceFactory.createAndPersist({
    title: 'Business Model Canvas Template',
    resourceType: 'template'
  });
  
  // Act
  const libraryPage = new ResourceLibraryPage(page);
  await libraryPage.goto();
  await libraryPage.bookmarkResource(resource.id!);
  await libraryPage.rateResource(resource.id!, 5);
  
  // Assert
  const isBookmarked = await libraryPage.isResourceBookmarked(resource.id!);
  expect(isBookmarked).toBe(true);
  
  // Cleanup
  await ResourceFactory.cleanup(resource.id!);
  await UserFactory.cleanup(user.id!);
});
```

## Best Practices

### 1. Always Clean Up Test Data

```typescript
test('example test', async ({ page }) => {
  const user = await UserFactory.createAndPersist();
  
  try {
    // Test code here
  } finally {
    // Always cleanup, even if test fails
    await UserFactory.cleanup(user.id!);
  }
});
```

### 2. Use beforeEach/afterEach for Consistent Cleanup

```typescript
let testUser: TestUser;

test.beforeEach(async () => {
  testUser = await UserFactory.createAndPersistFreeUser();
});

test.afterEach(async () => {
  await UserFactory.cleanup(testUser.id!);
});

test('example test', async ({ page }) => {
  // Use testUser
});
```

### 3. Create Related Data Together

```typescript
// Create user, search, and conversation together
const user = await UserFactory.createAndPersistProUser();
const search = await SearchFactory.createAndPersistCompleted(user.id!);
const conversation = await ConversationFactory.createAndPersistWithMessages(
  search.id!,
  user.id!,
  4
);

// Cleanup in reverse order
await ConversationFactory.cleanup(conversation.id!);
await SearchFactory.cleanup(search.id!);
await UserFactory.cleanup(user.id!);
```

### 4. Use Specific Factory Methods

```typescript
// ✅ Good - Use specific methods
const freeUser = await UserFactory.createAndPersistFreeUser();
const highScoringResults = SearchFactory.createHighScoringResults(3);

// ❌ Bad - Manual configuration
const freeUser = await UserFactory.createAndPersist({
  plan: 'free',
  subscriptionTier: 'free',
  searchCount: 0
});
```

### 5. Override Only What You Need

```typescript
// ✅ Good - Override only necessary fields
const user = await UserFactory.createAndPersist({
  email: 'specific@example.com'
});

// ❌ Bad - Overriding everything
const user = await UserFactory.createAndPersist({
  email: 'test@example.com',
  password: 'Test123!',
  name: 'Test User',
  plan: 'free',
  // ... many more fields
});
```

### 6. Use Cleanup Helpers for Multiple Objects

```typescript
// Cleanup multiple users at once
const userIds = [user1.id!, user2.id!, user3.id!];
await UserFactory.cleanupMany(userIds);

// Cleanup all searches for a user
await SearchFactory.cleanupByUser(userId);

// Cleanup all conversations for an analysis
await ConversationFactory.cleanupByAnalysis(analysisId);
```

## Common Patterns

### Pattern 1: Complete User Flow

```typescript
test('complete user flow', async ({ page }) => {
  // Create user
  const user = await UserFactory.createAndPersistFreeUser();
  
  // Create search with results
  const search = await SearchFactory.createAndPersistCompleted(user.id!, {
    query: 'AI market gaps',
    results: SearchFactory.createHighScoringResults(3)
  });
  
  // Create conversation
  const conversation = await ConversationFactory.createAndPersistWithMessages(
    search.id!,
    user.id!,
    4
  );
  
  // Test the flow
  // ...
  
  // Cleanup
  await ConversationFactory.cleanup(conversation.id!);
  await SearchFactory.cleanup(search.id!);
  await UserFactory.cleanup(user.id!);
});
```

### Pattern 2: Testing Tier Limits

```typescript
test('free tier search limit', async ({ page }) => {
  // Create user at search limit
  const user = await UserFactory.createAndPersist({
    plan: 'free',
    searchCount: 5 // At limit
  });
  
  // Try to create another search
  // ...
  
  await UserFactory.cleanup(user.id!);
});
```

### Pattern 3: Testing with Multiple Users

```typescript
test('collaboration features', async ({ page }) => {
  const owner = await UserFactory.createAndPersistProUser();
  const collaborator = await UserFactory.createAndPersistFreeUser();
  
  // Test collaboration
  // ...
  
  await UserFactory.cleanupMany([owner.id!, collaborator.id!]);
});
```

### Pattern 4: Resource Library Testing

```typescript
test('resource filtering', async ({ page }) => {
  const user = await UserFactory.createAndPersistProUser();
  
  // Create resources of different types
  const tool = await ResourceFactory.createAndPersist({ resourceType: 'tool' });
  const guide = await ResourceFactory.createAndPersist({ resourceType: 'guide' });
  const video = await ResourceFactory.createAndPersist({ resourceType: 'video' });
  
  // Test filtering
  // ...
  
  // Cleanup
  await ResourceFactory.cleanupMany([tool.id!, guide.id!, video.id!]);
  await UserFactory.cleanup(user.id!);
});
```

## Troubleshooting

### Issue: Foreign Key Constraint Errors

**Problem:** Cleanup fails due to foreign key constraints

**Solution:** Delete in correct order (children before parents)

```typescript
// ✅ Correct order
await ConversationFactory.cleanup(conversation.id!); // Child
await SearchFactory.cleanup(search.id!);             // Parent
await UserFactory.cleanup(user.id!);                 // Root

// ❌ Wrong order - will fail
await UserFactory.cleanup(user.id!);                 // Has dependent searches
await SearchFactory.cleanup(search.id!);             // Has dependent conversations
await ConversationFactory.cleanup(conversation.id!);
```

### Issue: Test Data Leaking Between Tests

**Problem:** Tests interfere with each other

**Solution:** Use unique data and proper cleanup

```typescript
// ✅ Good - Unique data per test
test.beforeEach(async () => {
  testUser = await UserFactory.createAndPersist(); // Unique email each time
});

test.afterEach(async () => {
  await UserFactory.cleanup(testUser.id!);
});
```

### Issue: Slow Test Execution

**Problem:** Creating too much test data

**Solution:** Create only what you need

```typescript
// ✅ Good - Minimal data
const user = await UserFactory.createAndPersist();

// ❌ Bad - Unnecessary data
const user = await UserFactory.createAndPersist();
const search1 = await SearchFactory.createAndPersist(user.id!);
const search2 = await SearchFactory.createAndPersist(user.id!);
const search3 = await SearchFactory.createAndPersist(user.id!);
// ... when you only need one search
```

## Factory Maintenance

When adding new fields to the database schema:

1. Update the corresponding `Test*` interface
2. Add the field to the `create()` method with a sensible default
3. Add the field to the `persist()` method
4. Update any specialized creation methods if needed
5. Update this README with examples if the field is commonly used

## Related Documentation

- [E2E Testing Guide](../e2e/README.md)
- [Page Objects](../page-objects/README.md)
- [Test Configuration](../config/README.md)
- [E2E Testing Standards](../../../.kiro/steering/e2e-testing.md)