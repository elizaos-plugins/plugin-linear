import {
  type Action,
  type ActionExample,
  type IAgentRuntime,
  type Memory,
  type State,
  type ActionResult,
  logger,
  validateEntityName,
} from '@elizaos/core';
import { LinearService } from '../services/linear';
import type { LinearIssueInput } from '../types';

const createIssueTemplate = `Create a new Linear issue based on the user's request. Extract the necessary information from the conversation.

Recent conversation:
{{recentMessages}}

When creating the issue:
1. The title should be clear and concise
2. The description should include all relevant details from the conversation
3. Determine the appropriate team based on context
4. Set priority if mentioned (1=Urgent, 2=High, 3=Normal, 4=Low)
5. If no team is specified, use the default team

Response format should be a valid JSON block:
\`\`\`json
{
  "title": "Clear, actionable issue title",
  "description": "Detailed description with context from the conversation",
  "teamId": "team-id or null to use default",
  "priority": 3,
  "shouldCreate": true
}
\`\`\`
`;

export const createLinearIssueAction: Action = {
  name: 'CREATE_LINEAR_ISSUE',
  description: 'Create a new issue in Linear',
  similes: ['create issue', 'new issue', 'file issue', 'report issue', 'create ticket', 'new ticket'],
  
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
      
      // If we have explicit parameters, use them
      if (options?.title && options?.teamId) {
        const issueInput: LinearIssueInput = {
          title: String(options.title),
          description: options.description ? String(options.description) : undefined,
          teamId: String(options.teamId),
          priority: options.priority ? Number(options.priority) : 3,
          assigneeId: options.assigneeId ? String(options.assigneeId) : undefined,
          labelIds: options.labelIds ? (options.labelIds as string[]) : undefined,
          projectId: options.projectId ? String(options.projectId) : undefined,
        };
        
        const issue = await linearService.createIssue(issueInput);
        
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
          },
        };
      }
      
      // Otherwise, use LLM to extract information
      const response = await runtime.generateText({
        messages: state.messages || [],
        context: createIssueTemplate,
      });
      
      const parsed = JSON.parse(response.trim().replace(/```json\n?|\n?```/g, ''));
      
      if (!parsed.shouldCreate) {
        return {
          success: false,
          error: 'Not enough information to create an issue',
        };
      }
      
      // If no teamId specified, get the first available team
      let teamId = parsed.teamId;
      let teamName: string | undefined;
      
      if (!teamId) {
        const teams = await linearService.getTeams();
        if (teams.length === 0) {
          throw new Error('No teams available in Linear workspace');
        }
        teamId = teams[0].id;
        teamName = teams[0].name;
      } else {
        // Get team name if teamId was provided
        try {
          const team = await linearService.getTeam(teamId);
          teamName = team.name;
        } catch {
          // Team name is optional, continue without it
        }
      }
      
      const issueInput: LinearIssueInput = {
        title: parsed.title,
        description: parsed.description,
        teamId: teamId,
        priority: parsed.priority || 3,
      };
      
      const issue = await linearService.createIssue(issueInput);
      
      logger.info(`Created Linear issue: ${issue.identifier} - ${issue.title}`);
      
      return {
        success: true,
        data: {
          issue: {
            id: issue.id,
            identifier: issue.identifier,
            title: issue.title,
            url: issue.url,
            teamName: teamName,
          },
        },
        metadata: {
          issueId: issue.id,
          identifier: issue.identifier,
        },
      };
      
    } catch (error) {
      logger.error('Failed to create Linear issue:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create issue',
      };
    }
  },
  
  examples: [
    {
      input: 'Create a new issue: Fix login button not working on mobile devices',
      output: 'Created issue ENG-123: Fix login button not working on mobile devices',
      explanation: 'Creates a new issue with the provided title',
    },
    {
      input: 'File a bug report: Users cannot upload images larger than 5MB, getting timeout errors',
      output: 'Created issue BUG-456: Image upload timeout for files > 5MB',
      explanation: 'Creates a bug report with extracted details',
    },
    {
      input: 'Create a high priority ticket for the payment processing error we discussed',
      output: 'Created high priority issue PAY-789: Payment processing error investigation',
      explanation: 'Creates an issue with priority based on conversation context',
    },
  ] as ActionExample[],
}; 