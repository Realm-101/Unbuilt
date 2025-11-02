/**
 * Resource Tracking Utilities
 * 
 * Provides helper functions for tracking resource interactions
 * These can be used directly or through the useResourceTracking hook
 * 
 * Requirements: 11
 */

export interface ResourceAccessContext {
  analysisId?: number;
  stepId?: string;
}

export type ResourceAccessType = 'view' | 'download' | 'external_link';

/**
 * Track a resource access event
 * 
 * @param resourceId - ID of the resource being accessed
 * @param accessType - Type of access (view, download, external_link)
 * @param context - Optional context (analysisId, stepId)
 * @returns Promise that resolves when tracking is complete
 */
export async function trackResourceAccess(
  resourceId: number,
  accessType: ResourceAccessType,
  context?: ResourceAccessContext
): Promise<void> {
  try {
    const response = await fetch(`/api/resources/${resourceId}/access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        analysisId: context?.analysisId,
        stepId: context?.stepId,
        accessType,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to track resource access: ${response.statusText}`);
    }
  } catch (error) {
    // Log error but don't disrupt user experience
    console.error('Resource tracking error:', error);
  }
}

/**
 * Track a resource view
 * Called when user views resource details page
 */
export function trackResourceView(
  resourceId: number,
  context?: ResourceAccessContext
): Promise<void> {
  return trackResourceAccess(resourceId, 'view', context);
}

/**
 * Track an external link click
 * Called when user clicks to open resource URL
 */
export function trackResourceExternalLink(
  resourceId: number,
  context?: ResourceAccessContext
): Promise<void> {
  return trackResourceAccess(resourceId, 'external_link', context);
}

/**
 * Track a template download
 * Called when user downloads a template resource
 */
export function trackResourceDownload(
  resourceId: number,
  context?: ResourceAccessContext
): Promise<void> {
  return trackResourceAccess(resourceId, 'download', context);
}

/**
 * Batch track multiple resource accesses
 * Useful for tracking multiple resources viewed in a list
 */
export async function trackResourceAccessBatch(
  accesses: Array<{
    resourceId: number;
    accessType: ResourceAccessType;
    context?: ResourceAccessContext;
  }>
): Promise<void> {
  // Execute all tracking calls in parallel
  await Promise.allSettled(
    accesses.map(({ resourceId, accessType, context }) =>
      trackResourceAccess(resourceId, accessType, context)
    )
  );
}

/**
 * Create a tracking event handler for resource cards
 * Returns a function that can be used as an onClick handler
 */
export function createResourceClickHandler(
  resourceId: number,
  resourceUrl: string,
  accessType: ResourceAccessType = 'external_link',
  context?: ResourceAccessContext
): (e?: React.MouseEvent) => void {
  return (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    // Track the access
    trackResourceAccess(resourceId, accessType, context);
    
    // Open the resource URL
    window.open(resourceUrl, '_blank', 'noopener,noreferrer');
  };
}
