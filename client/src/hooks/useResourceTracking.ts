import { useMutation } from "@tanstack/react-query";

export interface TrackResourceAccessParams {
  resourceId: number;
  analysisId?: number;
  stepId?: string;
  accessType: 'view' | 'download' | 'external_link';
}

/**
 * Custom hook for tracking resource access
 * 
 * Provides a mutation for logging resource interactions to the backend
 * Handles errors gracefully without disrupting user experience
 * 
 * Requirements: 11
 */
export function useResourceTracking() {
  const trackAccessMutation = useMutation({
    mutationFn: async (params: TrackResourceAccessParams) => {
      const { resourceId, analysisId, stepId, accessType } = params;
      
      const response = await fetch(`/api/resources/${resourceId}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          analysisId,
          stepId,
          accessType,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to track resource access');
      }
      
      return response.json();
    },
    onError: (error) => {
      // Log error but don't disrupt user experience
      console.error('Failed to track resource access:', error);
    },
  });
  
  /**
   * Track a resource view
   * Called when user views resource details
   */
  const trackView = (resourceId: number, context?: { analysisId?: number; stepId?: string }) => {
    trackAccessMutation.mutate({
      resourceId,
      analysisId: context?.analysisId,
      stepId: context?.stepId,
      accessType: 'view',
    });
  };
  
  /**
   * Track an external link click
   * Called when user clicks to open resource URL
   */
  const trackExternalLink = (resourceId: number, context?: { analysisId?: number; stepId?: string }) => {
    trackAccessMutation.mutate({
      resourceId,
      analysisId: context?.analysisId,
      stepId: context?.stepId,
      accessType: 'external_link',
    });
  };
  
  /**
   * Track a template download
   * Called when user downloads a template resource
   */
  const trackDownload = (resourceId: number, context?: { analysisId?: number; stepId?: string }) => {
    trackAccessMutation.mutate({
      resourceId,
      analysisId: context?.analysisId,
      stepId: context?.stepId,
      accessType: 'download',
    });
  };
  
  return {
    trackView,
    trackExternalLink,
    trackDownload,
    isTracking: trackAccessMutation.isPending,
  };
}
