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
import type { LinearCommentInput } from '../types';

export const createLinearCommentAction: Action = {
  name: 'CREATE_LINEAR_COMMENT',
  description: 'Add a comment to a Linear issue',
  similes: ['comment on issue', 'add comment', 'reply to issue'],
  
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
      const body = options?.body ? String(options.body) : message.content.text;
      
      if (!issueId || !body) {
        return {
          success: false,
          error: 'Issue ID and comment body are required',
        };
      }
      
      const commentInput: LinearCommentInput = {
        issueId,
        body,
      };
      
      const comment = await linearService.createComment(commentInput);
      
      logger.info(`Created comment on Linear issue: ${issueId}`);
      
      return {
        success: true,
        data: {
          comment: {
            id: comment.id,
            body: comment.body,
            createdAt: comment.createdAt,
          },
        },
        metadata: {
          commentId: comment.id,
          issueId: issueId,
        },
      };
      
    } catch (error) {
      logger.error('Failed to create Linear comment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create comment',
      };
    }
  },
  
  examples: [
    {
      input: 'Comment on ENG-123: This has been fixed in the latest release',
      output: 'Added comment to issue ENG-123',
      explanation: 'Adds a comment to an existing issue',
    },
  ] as ActionExample[],
}; 