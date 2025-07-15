import { Action, ActionResult, IAgentRuntime, Memory, State, logger } from '@elizaos/core';
import { LinearService } from '../services/linear';

export const getActivityAction: Action = {
  name: 'GET_LINEAR_ACTIVITY',
  description: 'Get recent Linear activity',
  similes: ['get-linear-activity', 'show-linear-activity', 'view-linear-activity'],
  
  examples: [[
    {
      name: 'User',
      content: {
        text: 'Show me recent Linear activity'
      }
    },
    {
      name: 'Assistant',
      content: {
        text: 'I\'ll check the recent Linear activity for you.',
        actions: ['GET_LINEAR_ACTIVITY']
      }
    }
  ], [
    {
      name: 'User',
      content: {
        text: 'What\'s been happening in Linear?'
      }
    },
    {
      name: 'Assistant',
      content: {
        text: 'Let me show you the recent Linear activity.',
        actions: ['GET_LINEAR_ACTIVITY']
      }
    }
  ]],
  
  async validate(runtime: IAgentRuntime, _message: Memory, _state?: State): Promise<boolean> {
    try {
      const apiKey = runtime.getSetting('LINEAR_API_KEY');
      return !!apiKey;
    } catch {
      return false;
    }
  },
  
  async handler(
    runtime: IAgentRuntime,
    _message: Memory,
    _state?: State,
    _options?: Record<string, unknown>
  ): Promise<ActionResult> {
    try {
      const linearService = runtime.getService<LinearService>('linear');
      if (!linearService) {
        throw new Error('Linear service not available');
      }
      
      const activity = linearService.getActivityLog();
      
      if (activity.length === 0) {
        return {
          text: 'No recent Linear activity found.',
          success: true,
          data: {
            activity: []
          }
        };
      }
      
      const activityText = activity
        .slice(0, 10) // Show last 10 activities
        .map((item, index) => {
          const description = `${item.action} ${item.resource_type} ${item.resource_id}${item.error ? ` (failed: ${item.error})` : ''}`;
          return `${index + 1}. ${description}`;
        })
        .join('\n');
      
      return {
        text: `Recent Linear activity:\n${activityText}`,
        success: true,
        data: {
          activity: activity.slice(0, 10),
          count: activity.length
        }
      };
    } catch (error) {
      logger.error('Failed to get Linear activity:', error);
      return {
        text: `Failed to get Linear activity: ${error instanceof Error ? error.message : 'Unknown error'}`,
        success: false
      };
    }
  }
}; 