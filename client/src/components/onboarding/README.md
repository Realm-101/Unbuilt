# Onboarding System

This directory contains the onboarding tour implementation for new users.

## Components

### OnboardingTour.tsx
The main onboarding tour component that displays a step-by-step interactive guide for new users.

**Features:**
- 4-step interactive tour (Welcome, Search, Results, Export)
- Progress indicators
- Skip functionality
- Resume capability (state persisted in localStorage)
- Smooth element highlighting
- Sample search demo at completion

**Usage:**
The component is automatically rendered in App.tsx and manages its own visibility through the `useOnboarding` hook.

## Hooks

### useOnboarding.ts
Custom hook for managing onboarding state and persistence.

**Features:**
- localStorage persistence for tour progress
- Auto-start for new users (created within last 5 minutes)
- Step navigation (next, previous, skip, complete)
- Progress tracking
- Backend sync for completion status

**API:**
```typescript
const {
  isActive,              // Whether tour is currently active
  currentStep,           // Current step index (0-3)
  steps,                 // Array of step objects with completion status
  hasCompletedOnboarding, // Whether user has completed the tour
  hasSkipped,            // Whether user has skipped the tour
  startOnboarding,       // Function to start/restart the tour
  nextStep,              // Navigate to next step
  previousStep,          // Navigate to previous step
  skipOnboarding,        // Skip the tour
  completeOnboarding,    // Mark tour as complete
  resetOnboarding,       // Reset tour state
  goToStep,              // Jump to specific step
  canGoNext,             // Boolean: can navigate forward
  canGoPrevious,         // Boolean: can navigate backward
  progress,              // Progress percentage (0-100)
} = useOnboarding();
```

## Backend API

### POST /api/auth/onboarding-complete
Endpoint to save onboarding completion status to the backend.

**Request:**
- Requires JWT authentication
- No body required

**Response:**
```json
{
  "success": true,
  "message": "Onboarding completed successfully"
}
```

## Tour Steps

1. **Welcome** - Introduction to Unbuilt platform
2. **Search** - How to use AI-powered search
3. **Results** - Understanding detailed opportunities
4. **Export** - Professional export options (Pro feature)

## State Management

The onboarding state is managed through:
1. **localStorage** - For client-side persistence across sessions
2. **React state** - For real-time UI updates
3. **Backend API** - For server-side tracking (future use)

## Future Enhancements

- Add database field `onboardingCompleted` to users table
- Track which specific steps users complete/skip
- A/B testing different tour flows
- Contextual tooltips that appear on hover
- Video tutorials integration
- Interactive demo mode with sample data
