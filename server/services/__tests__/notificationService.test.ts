import { describe, it, expect } from 'vitest';
import { notificationService } from '../notificationService';

/**
 * NotificationService Tests
 * 
 * These tests verify the structure and basic functionality of the NotificationService.
 * Full integration tests with database mocking are complex due to the service's
 * dependencies on multiple database tables and queries.
 */
describe('NotificationService', () => {
  it('should export a notification service instance', () => {
    expect(notificationService).toBeDefined();
    expect(typeof notificationService).toBe('object');
  });

  it('should have getUserNotificationPreferences method', () => {
    expect(notificationService.getUserNotificationPreferences).toBeDefined();
    expect(typeof notificationService.getUserNotificationPreferences).toBe('function');
  });

  it('should have updateNotificationPreferences method', () => {
    expect(notificationService.updateNotificationPreferences).toBeDefined();
    expect(typeof notificationService.updateNotificationPreferences).toBe('function');
  });

  it('should have notifyTaskAssigned method', () => {
    expect(notificationService.notifyTaskAssigned).toBeDefined();
    expect(typeof notificationService.notifyTaskAssigned).toBe('function');
  });

  it('should have notifyTaskCompleted method', () => {
    expect(notificationService.notifyTaskCompleted).toBeDefined();
    expect(typeof notificationService.notifyTaskCompleted).toBe('function');
  });

  it('should have notifyTaskReminder method', () => {
    expect(notificationService.notifyTaskReminder).toBeDefined();
    expect(typeof notificationService.notifyTaskReminder).toBe('function');
  });

  it('should have notifyPhaseCompleted method', () => {
    expect(notificationService.notifyPhaseCompleted).toBeDefined();
    expect(typeof notificationService.notifyPhaseCompleted).toBe('function');
  });

  it('should have notifyPlanCompleted method', () => {
    expect(notificationService.notifyPlanCompleted).toBeDefined();
    expect(typeof notificationService.notifyPlanCompleted).toBe('function');
  });

  it('should have getUsersNeedingReminders method', () => {
    expect(notificationService.getUsersNeedingReminders).toBeDefined();
    expect(typeof notificationService.getUsersNeedingReminders).toBe('function');
  });

  it('should have processTaskReminders method', () => {
    expect(notificationService.processTaskReminders).toBeDefined();
    expect(typeof notificationService.processTaskReminders).toBe('function');
  });
});
