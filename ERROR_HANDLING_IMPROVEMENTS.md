# Error Handling Improvements

## 1. Standardized Error Response Format

### Create Error Handler Middleware
```typescript
// server/middleware/errorHandler.ts
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  statusCode: number;
}

export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details
      }
    });
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: err.errors
      }
    });
  }

  // Default error
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
  });
};
```

## 2. Graceful API Key Fallbacks

### Improve Service Availability
```typescript
// server/services/aiService.ts
export class AIService {
  private hasGemini = !!process.env.GEMINI_API_KEY;
  private hasXAI = !!process.env.XAI_API_KEY;

  async analyzeGaps(query: string): Promise<GapAnalysis[]> {
    if (this.hasGemini) {
      try {
        return await this.geminiAnalysis(query);
      } catch (error) {
        console.warn('Gemini API failed, falling back to demo data');
      }
    }

    if (this.hasXAI) {
      try {
        return await this.xaiAnalysis(query);
      } catch (error) {
        console.warn('xAI API failed, falling back to demo data');
      }
    }

    // Return demo data with clear indication
    return this.getDemoAnalysis(query);
  }

  private getDemoAnalysis(query: string): GapAnalysis[] {
    return [{
      title: `Demo Analysis: ${query}`,
      description: "This is demo data. Configure AI API keys for real analysis.",
      category: "Demo",
      feasibility: "medium",
      marketPotential: "high",
      innovationScore: 75,
      isDemoData: true
    }];
  }
}
```

## 3. User-Friendly Error Messages

### Frontend Error Handling
```typescript
// client/src/hooks/useErrorHandler.ts
export function useErrorHandler() {
  const { toast } = useToast();

  const handleError = (error: any) => {
    let message = 'An unexpected error occurred';
    
    if (error.response?.data?.error) {
      const apiError = error.response.data.error;
      
      switch (apiError.code) {
        case 'VALIDATION_ERROR':
          message = 'Please check your input and try again';
          break;
        case 'RATE_LIMIT_EXCEEDED':
          message = 'Too many requests. Please try again later';
          break;
        case 'API_KEY_MISSING':
          message = 'Service temporarily unavailable. Using demo data';
          break;
        default:
          message = apiError.message || message;
      }
    }

    toast({
      title: "Error",
      description: message,
      variant: "destructive",
    });
  };

  return { handleError };
}
```