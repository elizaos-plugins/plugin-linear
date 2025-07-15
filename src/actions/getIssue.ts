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

export const getLinearIssueAction: Action = {
  name: 'GET_LINEAR_ISSUE',
  description: 'Get details of a specific Linear issue by ID or identifier',
  similes: ['get issue', 'show issue', 'fetch issue', 'view issue', 'issue details', 'what is issue'],
  
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
      
      // Extract issue ID or identifier from options or message
      let issueId: string | undefined;
      
      if (options?.issueId) {
        issueId = String(options.issueId);
      } else {
        // Try to extract issue identifier from the message (e.g., "ENG-123")
        const issuePattern = /\b[A-Z]+-\d+\b/;
        const match = message.content.text?.match(issuePattern);
        if (match) {
          issueId = match[0];
        }
      }
      
      if (!issueId) {
        return {
          success: false,
          error: 'No issue ID or identifier provided',
        };
      }
      
      const issue = await linearService.getIssue(issueId);
      
      // Fetch additional related data
      const [assignee, state, team, labels] = await Promise.all([
        issue.assignee,
        issue.state,
        issue.team,
        issue.labels(),
      ]);
      
      const labelList = await labels.nodes;
      
      const issueData = {
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        description: issue.description,
        url: issue.url,
        priority: issue.priority,
        priorityLabel: issue.priorityLabel,
        estimate: issue.estimate,
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
        dueDate: issue.dueDate,
        assignee: assignee ? {
          id: assignee.id,
          name: assignee.name,
          email: assignee.email,
        } : null,
        state: {
          id: state.id,
          name: state.name,
          type: state.type,
          color: state.color,
        },
        team: {
          id: team.id,
          name: team.name,
          key: team.key,
        },
        labels: labelList.map((label: any) => ({
          id: label.id,
          name: label.name,
          color: label.color,
        })),
      };
      
      logger.info(`Retrieved Linear issue: ${issue.identifier}`);
      
      return {
        success: true,
        data: {
          issue: issueData,
        },
        metadata: {
          issueId: issue.id,
          identifier: issue.identifier,
        },
      };
      
    } catch (error) {
      logger.error('Failed to get Linear issue:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get issue',
      };
    }
  },
  
  examples: [
    {
      input: 'Show me issue ENG-123',
      output: 'Issue ENG-123: Fix login button on mobile\nStatus: In Progress\nAssignee: John Doe\nPriority: High',
      explanation: 'Retrieves issue details by identifier',
    },
    {
      input: 'Get details for BUG-456',
      output: 'Issue BUG-456: Image upload timeout\nStatus: Todo\nAssignee: Unassigned\nPriority: Urgent\nLabels: bug, performance',
      explanation: 'Fetches comprehensive issue information',
    },
    {
      input: 'What is the status of FEAT-789?',
      output: 'Issue FEAT-789: Add dark mode support\nStatus: Done\nAssignee: Jane Smith\nCompleted: 2 days ago',
      explanation: 'Shows current status and details of an issue',
    },
  ] as ActionExample[],
}; 