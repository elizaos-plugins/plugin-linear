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
import type { LinearIssueInput } from '../types';

export const updateLinearIssueAction: Action = {
  name: 'UPDATE_LINEAR_ISSUE',
  description: 'Update an existing Linear issue',
  similes: ['update issue', 'modify issue', 'change issue', 'edit issue'],
  
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
      
      const issueId = options?.issueId ? String(options.issueId) : undefined;
      if (!issueId) {
        return {
          success: false,
          error: 'Issue ID is required',
        };
      }
      
      const updates: Partial<LinearIssueInput> = {};
      
      if (options?.title !== undefined) updates.title = String(options.title);
      if (options?.description !== undefined) updates.description = String(options.description);
      if (options?.priority !== undefined) updates.priority = Number(options.priority);
      if (options?.assigneeId !== undefined) updates.assigneeId = String(options.assigneeId);
      if (options?.stateId !== undefined) updates.stateId = String(options.stateId);
      if (options?.labelIds !== undefined) updates.labelIds = options.labelIds as string[];
      if (options?.projectId !== undefined) updates.projectId = String(options.projectId);
      if (options?.estimate !== undefined) updates.estimate = Number(options.estimate);
      if (options?.dueDate !== undefined) updates.dueDate = new Date(String(options.dueDate));
      
      const issue = await linearService.updateIssue(issueId, updates);
      
      logger.info(`Updated Linear issue: ${issue.identifier}`);
      
      return {
        success: true,
        data: {
          issue: {
            id: issue.id,
            identifier: issue.identifier,
            title: issue.title,
            url: issue.url,
          },
        },
        metadata: {
          issueId: issue.id,
          identifier: issue.identifier,
          updates: Object.keys(updates),
        },
      };
      
    } catch (error) {
      logger.error('Failed to update Linear issue:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update issue',
      };
    }
  },
  
  examples: [
    {
      input: 'Update issue ENG-123 title to "Fix login button on all devices"',
      output: 'Updated issue ENG-123: Fix login button on all devices',
      explanation: 'Updates the title of an existing issue',
    },
  ] as ActionExample[],
}; 