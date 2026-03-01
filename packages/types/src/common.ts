/**
 * Common Types - Shared utility types
 * 
 * Generic types used across the FOMO Life system.
 * These provide consistent patterns for async operations, API responses, etc.
 */

/**
 * BaseEntity - Base interface for all entities
 */
export interface BaseEntity {
  /** Unique identifier */
  id: string;
}

/**
 * AsyncState - Represents the state of an async operation
 * 
 * @template T - The type of data being loaded
 */
export interface AsyncState<T> {
  /** The loaded data, or null if not loaded */
  data: T | null;
  /** Whether the operation is in progress */
  loading: boolean;
  /** Error message if the operation failed, or null */
  error: string | null;
}

/**
 * Result - Represents success or failure of an operation
 * 
 * @template T - The type of the success value
 * @template E - The type of the error (defaults to string)
 */
export type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * Maybe - Represents a value that may or may not exist
 * 
 * @template T - The type of the potential value
 */
export type Maybe<T> = T | null | undefined;

/**
 * NonEmptyString - A string that is guaranteed to be non-empty
 * Use with type guards for runtime validation
 */
export type NonEmptyString = string & { __brand: 'NonEmptyString' };

/**
 * Timestamp - ISO 8601 timestamp string
 */
export type Timestamp = string;

/**
 * ColorHex - A hex color code (e.g., "#FF0000")
 */
export type ColorHex = string & { __brand: 'ColorHex' };

/**
 * UserId - Unique identifier for a user
 */
export type UserId = string;

/**
 * PaginationParams - Common pagination parameters
 */
export interface PaginationParams {
  /** Number of items per page */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Cursor for cursor-based pagination */
  cursor?: string;
}

/**
 * PaginatedResult - Result with pagination metadata
 * 
 * @template T - The type of items in the result
 */
export interface PaginatedResult<T> {
  /** The items */
  items: T[];
  /** Total count of items */
  total: number;
  /** Whether there are more items */
  hasMore: boolean;
  /** Cursor for the next page */
  nextCursor?: string;
}
