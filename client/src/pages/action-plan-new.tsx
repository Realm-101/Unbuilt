import React from 'react';
import { useLocation, useRoute } from 'wouter';
import Layout from '@/components/layout-new';
import { ActionPlanView } from '@/components/action-plan';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

/**
 * Action Plan Page (New Implementation)
 * 
 * This page demonstrates the new ActionPlanView component with:
 * - TanStack Query integration
 * - Real-time progress tracking
 * - Interactive task management
 * 
 * Route: /action-plan/:searchId
 */
export default function ActionPlanNewPage() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/action-plan/:searchId');
  
  const searchId = params?.searchId ? parseInt(params.searchId, 10) : null;
  
  const handleComplete = () => {
    // Handle plan completion (e.g., show celebration modal)
    console.log('Plan completed!');
  };
  
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Back button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation('/history')}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Search History
          </Button>
        </div>
        
        {/* Action Plan View */}
        {searchId ? (
          <ActionPlanView
            searchId={searchId}
            onComplete={handleComplete}
          />
        ) : (
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold text-white mb-4">
              Invalid Search ID
            </h2>
            <p className="text-gray-400 mb-6">
              Please select a search from your history to view its action plan.
            </p>
            <Button
              className="btn-flame"
              onClick={() => setLocation('/history')}
            >
              Go to Search History
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
