/**
 * @myorg/types - Shared TypeScript type definitions
 * 
 * This package provides common types used across all FOMO Life apps.
 * Import types from '@myorg/types' in your application code.
 */

// Common utility types
export type { BaseEntity, AsyncState, Result, Maybe, NonEmptyString, Timestamp, ColorHex, UserId, PaginationParams, PaginatedResult } from './common';

// Contact types
export type {
	ContactStatus,
	InviteToken,
	Contact,
	ContactCreateInput,
	ContactUpdateInput,
	InviteAcceptanceRequest,
	ContactGroup,
	ContactGroupInput,
	Group,
	InviteTokenResponse,
	InviteInfo,
	Connection,
	ConnectionStatus,
	InvitationLink,
	InviterProfile,
	PendingRequest,
	GenerateInviteResponse,
	PendingRequestsResponse,
	RequestLinkageRequest,
} from './contact';

// Project types
export type { ProjectTaskPerson, ProjectTask, ProjectSubproject, ProjectItem, ProjectCreateInput, ProjectUpdateInput } from './project';

// Task types
export type { TaskItem, TaskFilter, TaskCreateInput, TaskUpdateInput } from './task';
