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

export const clearLinearActivityAction: Action = {
  name: 'CLEAR_LINEAR_ACTIVITY',
  description: 'Clear the Linear activity log',
  similes: ['clear activity', 'reset activity', 'delete activity log'],
  
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
      
      linearService.clearActivityLog();
      
      logger.info('Cleared Linear activity log');
      
      return {
        success: true,
        data: {
          message: 'Activity log cleared successfully',
        },
      };
      
    } catch (error) {
      logger.error('Failed to clear Linear activity:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear activity',
      };
    }
  },
  
  examples: [
    {
      input: 'Clear the Linear activity log',
      output: 'Linear activity log has been cleared',
      explanation: 'Clears all stored activity history',
    },
  ] as ActionExample[],
}; 