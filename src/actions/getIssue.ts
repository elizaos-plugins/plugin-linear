import { Action, ActionResult, IAgentRuntime, Memory, State, logger } from '@elizaos/core';
import { LinearService } from '../services/linear';

export const getIssueAction: Action = {
  name: 'GET_LINEAR_ISSUE',
  description: 'Get details of a specific Linear issue',
  similes: ['get-linear-issue', 'show-linear-issue', 'view-linear-issue'],
  
  examples: [[
    {
      name: 'User',
      content: {
        text: 'Show me issue ENG-123'
      }
    },
    {
      name: 'Assistant',
      content: {
        text: 'I\'ll get the details for issue ENG-123.',
        actions: ['GET_LINEAR_ISSUE']
      }
    }
  ], [
    {
      name: 'User',
      content: {
        text: 'What\'s the status of BUG-456?'
      }
    },
    {
      name: 'Assistant',
      content: {
        text: 'Let me check the status of BUG-456 for you.',
        actions: ['GET_LINEAR_ISSUE']
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
          text: 'Please specify an issue ID.',
          success: false
        };
      }
      
      // Extract issue ID from the message
      const issueMatch = content.match(/(\w+-\d+)/);
      if (!issueMatch) {
        return {
          text: 'Please provide a valid issue ID (e.g., ENG-123).',
          success: false
        };
      }
      
      const issueId = issueMatch[1];
      const issue = await linearService.getIssue(issueId);
      
      const assignee = await issue.assignee;
      const state = await issue.state;
      const team = await issue.team;
      const labels = await issue.labels();
      const project = await issue.project;
      
      const issueDetails = {
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        description: issue.description,
        priority: issue.priority,
        priorityLabel: issue.priorityLabel,
        url: issue.url,
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
        dueDate: issue.dueDate,
        estimate: issue.estimate,
        assignee: assignee ? {
          id: assignee.id,
          name: assignee.name,
          email: assignee.email,
        } : null,
        state: state ? {
          id: state.id,
          name: state.name,
          type: state.type,
          color: state.color,
        } : null,
        team: team ? {
          id: team.id,
          name: team.name,
          key: team.key,
        } : null,
        labels: labels.nodes.map(label => ({
          id: label.id,
          name: label.name,
          color: label.color,
        })),
        project: project ? {
          id: project.id,
          name: project.name,
        } : null,
      };
      
      // Format the response text
      let responseText = `Issue ${issue.identifier}: ${issue.title}\n`;
      responseText += `Status: ${state?.name || 'Unknown'}\n`;
      responseText += `Priority: ${issue.priorityLabel}\n`;
      if (assignee) {
        responseText += `Assignee: ${assignee.name}\n`;
      }
      if (issue.dueDate) {
        responseText += `Due: ${new Date(issue.dueDate).toLocaleDateString()}\n`;
      }
      if (issue.description) {
        responseText += `\nDescription: ${issue.description}\n`;
      }
      responseText += `\nView in Linear: ${issue.url}`;
      
      return {
        text: responseText,
        success: true,
        data: issueDetails
      };
    } catch (error) {
      logger.error('Failed to get issue:', error);
      return {
        text: `Failed to get issue: ${error instanceof Error ? error.message : 'Unknown error'}`,
        success: false
      };
    }
  }
}; 