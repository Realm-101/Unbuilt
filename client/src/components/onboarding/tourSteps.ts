import { TourStep } from "./InteractiveTour";
import { UserRole } from "@/stores/userPreferencesStore";

/**
 * Tour step definitions for different features and user roles
 * 
 * Requirements: 2.2, 2.3
 */

// Dashboard tour steps
export const dashboardTourSteps: TourStep[] = [
  {
    id: 'dashboard-welcome',
    target: '[data-tour="dashboard-header"]',
    title: 'Welcome to Your Dashboard',
    content: 'This is your command center. Here you can see your recent searches, favorites, and quick stats at a glance.',
    placement: 'bottom',
    highlightElement: true
  },
  {
    id: 'dashboard-stats',
    target: '[data-tour="dashboard-stats"]',
    title: 'Your Activity Stats',
    content: 'Track your usage, see how many searches you\'ve performed, and monitor your subscription limits.',
    placement: 'bottom',
    highlightElement: true
  },
  {
    id: 'dashboard-recent',
    target: '[data-tour="recent-searches"]',
    title: 'Recent Searches',
    content: 'Quickly access your most recent gap analyses. Click any card to view full details.',
    placement: 'top',
    highlightElement: true
  },
  {
    id: 'dashboard-favorites',
    target: '[data-tour="favorites"]',
    title: 'Favorites',
    content: 'Star your best analyses to keep them easily accessible. Perfect for tracking promising opportunities.',
    placement: 'top',
    highlightElement: true
  },
  {
    id: 'dashboard-projects',
    target: '[data-tour="projects"]',
    title: 'Organize with Projects',
    content: 'Group related analyses into projects to stay organized as you explore multiple opportunities.',
    placement: 'top',
    highlightElement: true
  }
];

// Search and analysis flow tour steps
export const searchFlowTourSteps: TourStep[] = [
  {
    id: 'search-bar',
    target: '[data-tour="search-bar"]',
    title: 'Start Your Search',
    content: 'Describe any industry, market, or problem area. Our AI will analyze thousands of data points to find untapped opportunities.',
    placement: 'bottom',
    highlightElement: true
  },
  {
    id: 'search-filters',
    target: '[data-tour="search-filters"]',
    title: 'Refine Your Search',
    content: 'Use filters to narrow down results by market size, innovation score, or feasibility rating.',
    placement: 'bottom',
    highlightElement: true
  },
  {
    id: 'results-overview',
    target: '[data-tour="results-overview"]',
    title: 'Analysis Results',
    content: 'Each result shows key metrics: innovation score, market potential, and feasibility rating.',
    placement: 'top',
    highlightElement: true
  },
  {
    id: 'result-card',
    target: '[data-tour="result-card"]',
    title: 'Gap Details',
    content: 'Click any gap to see detailed analysis including competitive landscape, market intelligence, and action plans.',
    placement: 'left',
    highlightElement: true
  },
  {
    id: 'export-options',
    target: '[data-tour="export-button"]',
    title: 'Export Your Findings',
    content: 'Generate professional PDF reports, CSV data exports, or investor pitch decks from your analysis.',
    placement: 'bottom',
    highlightElement: true
  }
];

// Action plan usage tour steps
export const actionPlanTourSteps: TourStep[] = [
  {
    id: 'action-plan-overview',
    target: '[data-tour="action-plan"]',
    title: 'Your Action Plan',
    content: 'Every gap analysis includes a 4-phase action plan to help you bring the opportunity to life.',
    placement: 'top',
    highlightElement: true
  },
  {
    id: 'action-phases',
    target: '[data-tour="action-phases"]',
    title: 'Four Development Phases',
    content: 'Each phase contains specific steps: Research & Validation, MVP Development, Market Entry, and Scale & Growth.',
    placement: 'bottom',
    highlightElement: true
  },
  {
    id: 'action-checkboxes',
    target: '[data-tour="action-checkbox"]',
    title: 'Track Your Progress',
    content: 'Check off steps as you complete them. Your progress is automatically saved and synced.',
    placement: 'right',
    highlightElement: true
  },
  {
    id: 'action-progress',
    target: '[data-tour="progress-indicator"]',
    title: 'Monitor Completion',
    content: 'Visual progress indicators show how far you\'ve come in each phase and overall.',
    placement: 'left',
    highlightElement: true
  },
  {
    id: 'action-celebration',
    target: '[data-tour="action-plan"]',
    title: 'Celebrate Milestones',
    content: 'Complete a phase to unlock celebrations and move to the next stage of development!',
    placement: 'top',
    highlightElement: false
  }
];

// Role-specific tour variations
export const getRoleSpecificTourSteps = (role: UserRole): TourStep[] => {
  const baseTourSteps: TourStep[] = [
    {
      id: 'navigation',
      target: '[data-tour="main-nav"]',
      title: 'Navigate Unbuilt',
      content: 'Use the main navigation to access all features: Discover, My Work, Resources, and Account settings.',
      placement: 'right',
      highlightElement: true
    },
    {
      id: 'global-search',
      target: '[data-tour="global-search"]',
      title: 'Quick Search',
      content: 'Press Ctrl+K (or Cmd+K on Mac) anytime to quickly search across your analyses, resources, and help articles.',
      placement: 'bottom',
      highlightElement: true
    }
  ];

  // Add role-specific steps
  const roleSpecificSteps: Record<UserRole, TourStep[]> = {
    entrepreneur: [
      {
        id: 'entrepreneur-validation',
        target: '[data-tour="search-bar"]',
        title: 'Validate Your Ideas',
        content: 'As an entrepreneur, use Unbuilt to validate business ideas before investing time and money. Search for gaps in markets you\'re passionate about.',
        placement: 'bottom',
        highlightElement: true
      },
      {
        id: 'entrepreneur-action-plan',
        target: '[data-tour="action-plan"]',
        title: 'Your Launch Roadmap',
        content: 'Each analysis includes a detailed 4-phase action plan specifically designed to help entrepreneurs launch successfully.',
        placement: 'top',
        highlightElement: true
      }
    ],
    investor: [
      {
        id: 'investor-opportunities',
        target: '[data-tour="results-overview"]',
        title: 'Investment Opportunities',
        content: 'As an investor, focus on innovation scores and market size estimates to identify high-potential opportunities.',
        placement: 'top',
        highlightElement: true
      },
      {
        id: 'investor-competitive',
        target: '[data-tour="competitive-analysis"]',
        title: 'Competitive Landscape',
        content: 'Dive deep into competitive analysis to understand market dynamics and identify defensible positions.',
        placement: 'bottom',
        highlightElement: true
      }
    ],
    product_manager: [
      {
        id: 'pm-features',
        target: '[data-tour="search-bar"]',
        title: 'Discover Feature Gaps',
        content: 'As a product manager, search for specific product categories to find missing features and unmet user needs.',
        placement: 'bottom',
        highlightElement: true
      },
      {
        id: 'pm-prioritization',
        target: '[data-tour="results-overview"]',
        title: 'Prioritize Development',
        content: 'Use feasibility ratings and market potential scores to prioritize your product roadmap.',
        placement: 'top',
        highlightElement: true
      }
    ],
    researcher: [
      {
        id: 'researcher-intelligence',
        target: '[data-tour="market-intelligence"]',
        title: 'Market Intelligence',
        content: 'As a researcher, access comprehensive market data including demographics, trends, and market sizing.',
        placement: 'bottom',
        highlightElement: true
      },
      {
        id: 'researcher-export',
        target: '[data-tour="export-button"]',
        title: 'Export for Reports',
        content: 'Export your findings as PDF reports or CSV data for presentations and further analysis.',
        placement: 'bottom',
        highlightElement: true
      }
    ],
    exploring: [
      {
        id: 'exploring-discover',
        target: '[data-tour="search-bar"]',
        title: 'Explore Any Market',
        content: 'Try searching for any industry or market that interests you. There are no wrong answers - just opportunities waiting to be discovered!',
        placement: 'bottom',
        highlightElement: true
      },
      {
        id: 'exploring-learn',
        target: '[data-tour="help-button"]',
        title: 'Learn as You Go',
        content: 'Click the help icon anytime to access guides, tutorials, and explanations of key concepts.',
        placement: 'left',
        highlightElement: true
      }
    ]
  };

  return [...baseTourSteps, ...roleSpecificSteps[role]];
};

// Complete tour combining all sections
export const getCompleteTour = (role: UserRole): TourStep[] => {
  return [
    ...getRoleSpecificTourSteps(role),
    ...dashboardTourSteps.slice(0, 2), // First 2 dashboard steps
    ...searchFlowTourSteps.slice(0, 3), // First 3 search steps
    ...actionPlanTourSteps.slice(0, 2)  // First 2 action plan steps
  ];
};

// Quick tour for returning users
export const quickTourSteps: TourStep[] = [
  {
    id: 'quick-search',
    target: '[data-tour="search-bar"]',
    title: 'Quick Reminder',
    content: 'Start by describing any market or industry you want to explore.',
    placement: 'bottom',
    highlightElement: true
  },
  {
    id: 'quick-dashboard',
    target: '[data-tour="dashboard-header"]',
    title: 'Your Dashboard',
    content: 'Access all your searches and favorites from your dashboard.',
    placement: 'bottom',
    highlightElement: true
  },
  {
    id: 'quick-help',
    target: '[data-tour="help-button"]',
    title: 'Need Help?',
    content: 'Click here anytime for contextual help and tutorials.',
    placement: 'left',
    highlightElement: true
  }
];
