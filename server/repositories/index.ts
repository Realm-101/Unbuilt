/**
 * Resource Library Repositories
 * 
 * This module exports all repository instances for the resource library feature.
 * Repositories handle all database operations using Drizzle ORM.
 */

export { resourceRepository, ResourceRepository } from './resourceRepository';
export { categoryRepository, CategoryRepository } from './categoryRepository';
export { tagRepository, TagRepository } from './tagRepository';
export { bookmarkRepository, BookmarkRepository } from './bookmarkRepository';
export { ratingRepository, RatingRepository } from './ratingRepository';
export { contributionRepository, ContributionRepository } from './contributionRepository';
export { accessHistoryRepository, AccessHistoryRepository } from './accessHistoryRepository';

// Re-export types
export type {
  ResourceFilters,
  PaginationOptions,
  ResourceWithRelations,
  PaginatedResources
} from './resourceRepository';

export type {
  CategoryWithChildren
} from './categoryRepository';

export type {
  TagWithCount
} from './tagRepository';

export type {
  BookmarkWithResource
} from './bookmarkRepository';

export type {
  RatingWithUser,
  RatingStats
} from './ratingRepository';

export type {
  ContributionWithDetails,
  ContributionStatus
} from './contributionRepository';

export type {
  AccessHistoryWithDetails,
  AccessType,
  AccessStats
} from './accessHistoryRepository';
