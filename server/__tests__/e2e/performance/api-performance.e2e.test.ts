import { test, expect } from '@playwright/test';
import { createPerformanceHelper, PERFORMANCE_THRESHOLDS } from '../../helpers/performance.helper';

/**
 * API Performance E2E Tests
 * 
 * Tests API endpoint response times to ensure they meet performance requirements.
 * Authentication endpoints must respond within 500ms.
 * 
 * Requirements: 5.3, 5.4
 */

test.describe('API Performance', () => {
  test('login API should respond within 500ms', async ({ page, request }) => {
    const perfHelper = createPerformanceHelper(page);
    
    // Measure API response time
    const responseTime = await perfHelper.measureAPIResponseTime(async () => {
      const response = await request.post('/api/auth/login', {
        data: {
          email: 'test@example.com',
          password: 'Test123!@#'
        }
      });
      return response;
    });
    
    console.log(`Login API response time: ${responseTime}ms`);
    
    // Should respond within 500ms
    expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiAuth);
  });

  test('registration API should respond within 500ms', async ({ page, request }) => {
    const perfHelper = createPerformanceHelper(page);
    
    const responseTime = await perfHelper.measureAPIResponseTime(async () => {
      const response = await request.post('/api/auth/register', {
        data: {
          email: `test-${Date.now()}@example.com`,
          password: 'Test123!@#',
          confirmPassword: 'Test123!@#'
        }
      });
      return response;
    });
    
    console.log(`Registration API response time: ${responseTime}ms`);
    
    expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiAuth);
  });

  test('logout API should respond within 500ms', async ({ page, request }) => {
    const perfHelper = createPerformanceHelper(page);
    
    // Login first to get session
    await request.post('/api/auth/login', {
      data: {
        email: 'test@example.com',
        password: 'Test123!@#'
      }
    });
    
    const responseTime = await perfHelper.measureAPIResponseTime(async () => {
      const response = await request.post('/api/auth/logout');
      return response;
    });
    
    console.log(`Logout API response time: ${responseTime}ms`);
    
    expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiAuth);
  });

  test('user profile API should respond within 1 second', async ({ page, request }) => {
    const perfHelper = createPerformanceHelper(page);
    
    // Login first
    await request.post('/api/auth/login', {
      data: {
        email: 'test@example.com',
        password: 'Test123!@#'
      }
    });
    
    const responseTime = await perfHelper.measureAPIResponseTime(async () => {
      const response = await request.get('/api/user/profile');
      return response;
    });
    
    console.log(`User profile API response time: ${responseTime}ms`);
    
    expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiGeneral);
  });

  test('search history API should respond within 1 second', async ({ page, request }) => {
    const perfHelper = createPerformanceHelper(page);
    
    // Login first
    await request.post('/api/auth/login', {
      data: {
        email: 'test@example.com',
        password: 'Test123!@#'
      }
    });
    
    const responseTime = await perfHelper.measureAPIResponseTime(async () => {
      const response = await request.get('/api/searches');
      return response;
    });
    
    console.log(`Search history API response time: ${responseTime}ms`);
    
    expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiGeneral);
  });

  test('resource library API should respond within 1 second', async ({ page, request }) => {
    const perfHelper = createPerformanceHelper(page);
    
    const responseTime = await perfHelper.measureAPIResponseTime(async () => {
      const response = await request.get('/api/resources');
      return response;
    });
    
    console.log(`Resource library API response time: ${responseTime}ms`);
    
    expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiGeneral);
  });

  test('favorites API should respond within 1 second', async ({ page, request }) => {
    const perfHelper = createPerformanceHelper(page);
    
    // Login first
    await request.post('/api/auth/login', {
      data: {
        email: 'test@example.com',
        password: 'Test123!@#'
      }
    });
    
    const responseTime = await perfHelper.measureAPIResponseTime(async () => {
      const response = await request.get('/api/favorites');
      return response;
    });
    
    console.log(`Favorites API response time: ${responseTime}ms`);
    
    expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiGeneral);
  });

  test('projects API should respond within 1 second', async ({ page, request }) => {
    const perfHelper = createPerformanceHelper(page);
    
    // Login first
    await request.post('/api/auth/login', {
      data: {
        email: 'test@example.com',
        password: 'Test123!@#'
      }
    });
    
    const responseTime = await perfHelper.measureAPIResponseTime(async () => {
      const response = await request.get('/api/projects');
      return response;
    });
    
    console.log(`Projects API response time: ${responseTime}ms`);
    
    expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiGeneral);
  });

  test('should measure API response times under load', async ({ page, request }) => {
    const perfHelper = createPerformanceHelper(page);
    const responseTimes: number[] = [];
    
    // Make 10 concurrent requests
    const requests = Array.from({ length: 10 }, async () => {
      const responseTime = await perfHelper.measureAPIResponseTime(async () => {
        const response = await request.get('/api/resources');
        return response;
      });
      responseTimes.push(responseTime);
    });
    
    await Promise.all(requests);
    
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    
    console.log(`Average response time: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`Max response time: ${maxResponseTime.toFixed(0)}ms`);
    
    // Average should still be under threshold
    expect(avgResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiGeneral);
    
    // Max should be reasonable (allow 2x threshold)
    expect(maxResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiGeneral * 2);
  });

  test('should validate API response time consistency', async ({ page, request }) => {
    const perfHelper = createPerformanceHelper(page);
    const responseTimes: number[] = [];
    
    // Make 5 sequential requests
    for (let i = 0; i < 5; i++) {
      const responseTime = await perfHelper.measureAPIResponseTime(async () => {
        const response = await request.get('/api/resources');
        return response;
      });
      responseTimes.push(responseTime);
    }
    
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const variance = responseTimes.reduce((sum, time) => {
      return sum + Math.pow(time - avgResponseTime, 2);
    }, 0) / responseTimes.length;
    const stdDev = Math.sqrt(variance);
    
    console.log(`Response times: ${responseTimes.map(t => t.toFixed(0)).join(', ')}ms`);
    console.log(`Average: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`Std Dev: ${stdDev.toFixed(0)}ms`);
    
    // Standard deviation should be low (consistent performance)
    expect(stdDev).toBeLessThan(avgResponseTime * 0.5); // Within 50% of average
  });

  test('should measure API response with authentication overhead', async ({ page, request }) => {
    const perfHelper = createPerformanceHelper(page);
    
    // Measure unauthenticated request
    const unauthTime = await perfHelper.measureAPIResponseTime(async () => {
      const response = await request.get('/api/resources');
      return response;
    });
    
    // Login
    await request.post('/api/auth/login', {
      data: {
        email: 'test@example.com',
        password: 'Test123!@#'
      }
    });
    
    // Measure authenticated request
    const authTime = await perfHelper.measureAPIResponseTime(async () => {
      const response = await request.get('/api/user/profile');
      return response;
    });
    
    console.log(`Unauthenticated request: ${unauthTime}ms`);
    console.log(`Authenticated request: ${authTime}ms`);
    console.log(`Authentication overhead: ${(authTime - unauthTime).toFixed(0)}ms`);
    
    // Both should be under threshold
    expect(unauthTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiGeneral);
    expect(authTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiGeneral);
  });
});
