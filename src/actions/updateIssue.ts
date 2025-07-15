import { Action, ActionResult, IAgentRuntime, Memory, State, logger } from '@elizaos/core';
import { LinearService } from '../services/linear';
import type { LinearIssueInput } from '../types';

export const updateIssueAction: Action = {
  name: 'UPDATE_LINEAR_ISSUE',
  description: 'Update an existing Linear issue',
  similes: ['update-linear-issue', 'edit-linear-issue', 'modify-linear-issue'],
  
  examples: [[
    {
      name: 'User',
      content: {
        text: 'Update issue ENG-123 title to "Fix login button on all devices"'
      }
    },
    {
      name: 'Assistant',
      content: {
        text: 'I\'ll update the title of issue ENG-123 for you.',
        actions: ['UPDATE_LINEAR_ISSUE']
      }
    }
  ], [
    {
      name: 'User',
      content: {
        text: 'Change the priority of BUG-456 to high'
      }
    },
    {
      name: 'Assistant',
      content: {
        text: 'I\'ll change the priority of BUG-456 to high.',
        actions: ['UPDATE_LINEAR_ISSUE']
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
    message: Memory,
    _state?: State,
    _options?: Record<string, unknown>
  ): Promise<ActionResult> {
    try {
      const linearService = runtime.getService<LinearService>('linear');
      if (!linearService) {
        throw new Error('Linear service not available');
      }
      
      const content = message.content.text;
      if (!content) {
        return {
          text: 'Please provide update instructions for the issue.',
          success: false
        };
      }
      
      // Extract issue ID from the message
      const issueMatch = content.match(/(\w+-\d+)/);
      if (!issueMatch) {
        return {
          text: 'Please specify an issue ID (e.g., ENG-123) to update.',
          success: false
        };
      }
      
      const issueId = issueMatch[1];
      
      // Parse update instructions
      const updates: Partial<LinearIssueInput> = {};
      
      // Title update
      const titleMatch = content.match(/title to ["'](.+?)["']/i);
      if (titleMatch) {
        updates.title = titleMatch[1];
      }
      
      // Priority update
      const priorityMatch = content.match(/priority (?:to |as )?(\w+)/i);
      if (priorityMatch) {
        const priorityMap: Record<string, number> = {
          'urgent': 1,
          'high': 2,
          'normal': 3,
          'medium': 3,
          'low': 4,
        };
        const priority = priorityMap[priorityMatch[1].toLowerCase()];
        if (priority) {
          updates.priority = priority;
        }
      }
      
      // Description update
      const descMatch = content.match(/description to ["'](.+?)["']/i);
      if (descMatch) {
        updates.description = descMatch[1];
      }
      
      // Status update
      const statusMatch = content.match(/status to (\w+)/i);
      if (statusMatch) {
        // This would need to look up the state ID - simplified for now
        logger.warn('Status updates not yet implemented');
      }
      
      if (Object.keys(updates).length === 0) {
        return {
          text: 'No valid updates found. Please specify what to update (e.g., "Update issue ENG-123 title to \'New Title\'")',
          success: false
        };
      }
      
      const updatedIssue = await linearService.updateIssue(issueId, updates);
      
      const updateSummary = Object.entries(updates)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      
      return {
        text: `Updated issue ${updatedIssue.identifier}: ${updateSummary}`,
        success: true,
        data: {
          issueId: updatedIssue.id,
          identifier: updatedIssue.identifier,
          updates,
          url: updatedIssue.url
        }
      };
    } catch (error) {
      logger.error('Failed to update issue:', error);
      return {
        text: `Failed to update issue: ${error instanceof Error ? error.message : 'Unknown error'}`,
        success: false
      };
    }
  }
}; 