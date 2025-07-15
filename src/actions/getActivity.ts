import {
  type Action,
  type ActionExample,
  type IAgentRuntime,
  type Memory,
  type State,
  type ActionResult,
  logger,
} from '@elizaos/core';
import { LinearService } from '../services/linear';

export const getLinearActivityAction: Action = {
  name: 'GET_LINEAR_ACTIVITY',
  description: 'Get recent Linear activity log',
  similes: ['show activity', 'get activity', 'view activity', 'activity log'],
  
  async validate(runtime: IAgentRuntime, _message: Memory, state: State): Promise<boolean> {
    try {
      const linearService = runtime.getService<LinearService>('linear');
      return !!linearService;
    } catch {
      return false;
    }
  },
  
  async handler(
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options?: Record<string, unknown>
  ): Promise<ActionResult> {
    try {
      const linearService = runtime.getService<LinearService>('linear');
      if (!linearService) {
        throw new Error('Linear service not available');
      }
      
      const limit = options?.limit ? Number(options.limit) : 50;
      const filter = options?.filter ? options.filter as any : undefined;
      
      const activity = linearService.getActivityLog(limit, filter);
      
      logger.info(`Retrieved ${activity.length} Linear activity items`);
      
      return {
        success: true,
        data: {
          activity,
          count: activity.length,
        },
        metadata: {
          activityCount: activity.length,
        },
      };
      
    } catch (error) {
      logger.error('Failed to get Linear activity:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get activity',
      };
    }
  },
  
  examples: [
    {
      input: 'Show me recent Linear activity',
      output: 'Recent activity:\n1. Created issue ENG-123\n2. Updated issue BUG-456\n3. Added comment to FEAT-789...',
      explanation: 'Shows recent Linear operations performed by the agent',
    },
  ] as ActionExample[],
}; 