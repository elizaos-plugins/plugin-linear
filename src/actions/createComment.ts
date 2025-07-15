import { Action, ActionResult, IAgentRuntime, Memory, State, ActionExample, logger, HandlerCallback } from '@elizaos/core';
import { LinearService } from '../services/linear';

export const createCommentAction: Action = {
  name: 'CREATE_LINEAR_COMMENT',
  description: 'Create a comment on a Linear issue',
  similes: ['create-linear-comment', 'add-linear-comment', 'comment-on-linear-issue'],
  
  examples: [[
    {
      name: 'User',
      content: {
        text: 'Comment on ENG-123: This has been fixed in the latest release'
      }
    },
    {
      name: 'Assistant',
      content: {
        text: 'I\'ll add that comment to issue ENG-123.',
        actions: ['CREATE_LINEAR_COMMENT']
      }
    }
  ], [
    {
      name: 'User',
      content: {
        text: 'Add a comment to BUG-456: Need more information from the reporter'
      }
    },
    {
      name: 'Assistant', 
      content: {
        text: 'I\'ll post that comment on BUG-456 right away.',
        actions: ['CREATE_LINEAR_COMMENT']
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
    _options?: Record<string, unknown>,
    callback?: HandlerCallback
  ): Promise<ActionResult> {
    try {
      const linearService = runtime.getService<LinearService>('linear');
      if (!linearService) {
        throw new Error('Linear service not available');
      }
      
      const content = message.content.text;
      if (!content) {
        const errorMessage = 'Please provide a message with the issue ID and comment content.';
        await callback?.({
          text: errorMessage,
          source: message.content.source
        });
        return {
          text: errorMessage,
          success: false
        };
      }
      
      const issueMatch = content.match(/(?:comment on|add.*comment.*to)\s+(\w+-\d+):?\s*(.*)/i);
      
      if (!issueMatch) {
        const errorMessage = 'Please specify the issue ID and comment content. Example: "Comment on ENG-123: This looks good"';
        await callback?.({
          text: errorMessage,
          source: message.content.source
        });
        return {
          text: errorMessage,
          success: false
        };
      }
      
      const [, issueIdentifier, commentBody] = issueMatch;
      
      // Find the issue first to get its ID
      const issue = await linearService.getIssue(issueIdentifier);
      
      const comment = await linearService.createComment({
        issueId: issue.id,
        body: commentBody.trim()
      });
      
      const successMessage = `✅ Comment added to issue ${issueIdentifier}: "${commentBody.trim()}"`;
      await callback?.({
        text: successMessage,
        source: message.content.source
      });
      
      return {
        text: `Comment added to issue ${issueIdentifier}: "${commentBody.trim()}"`,
        success: true,
        data: {
          commentId: comment.id,
          issueId: issue.id
        }
      };
    } catch (error) {
      logger.error('Failed to create comment:', error);
      const errorMessage = `❌ Failed to create comment: ${error instanceof Error ? error.message : 'Unknown error'}`;
      await callback?.({
        text: errorMessage,
        source: message.content.source
      });
      return {
        text: errorMessage,
        success: false
      };
    }
  }
}; 