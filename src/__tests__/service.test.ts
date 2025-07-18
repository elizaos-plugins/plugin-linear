import { describe, it, expect, beforeEach } from 'bun:test';
import { LinearService } from '../services/linear';
import type { IAgentRuntime } from '@elizaos/core';

// Import our test setup which handles mocking '@linear/sdk'
import './setup';

describe('LinearService', () => {
  let mockRuntime: any;
  let service: LinearService;

  beforeEach(async () => {
    // Create a mock runtime for each test
    mockRuntime = {
      getSetting: (key: string) => {
        if (key === 'LINEAR_API_KEY') return 'test-api-key';
        if (key === 'LINEAR_WORKSPACE_ID') return 'test-workspace';
        return undefined;
      }
    };
  });

  it('should initialize successfully with valid API key', async () => {
    service = await LinearService.start(mockRuntime);
    expect(service).toBeInstanceOf(LinearService);
  });

  it('should throw error without API key', async () => {
    mockRuntime.getSetting = () => undefined;
    
    await expect(LinearService.start(mockRuntime)).rejects.toThrow(
      'Linear API key is required'
    );
  });

  it('should get teams', async () => {
    service = await LinearService.start(mockRuntime);
    const teams = await service.getTeams();
    
    expect(teams).toHaveLength(1);
    expect(teams[0]).toHaveProperty('name', 'Engineering');
  });

  it('should create an issue', async () => {
    service = await LinearService.start(mockRuntime);
    
    const issue = await service.createIssue({
      title: 'Test Issue',
      description: 'Test description',
      teamId: 'team-123',
      priority: 3,
    });
    
    expect(issue).toHaveProperty('identifier', 'ENG-123');
    expect(issue).toHaveProperty('title', 'Test Issue');
  });

  it('should track activity', async () => {
    service = await LinearService.start(mockRuntime);
    
    // Clear any existing activity
    service.clearActivityLog();
    
    // Create an issue to generate activity
    await service.createIssue({
      title: 'Test Issue',
      teamId: 'team-123',
    });
    
    const activity = service.getActivityLog();
    expect(activity).toHaveLength(1);
    expect(activity[0]).toHaveProperty('action', 'create_issue');
    expect(activity[0]).toHaveProperty('success', true);
  });
}); 