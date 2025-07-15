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
import type { LinearSearchFilters } from '../types';

const searchIssuesTemplate = `Extract search criteria from the user's request to search Linear issues.

Recent conversation:
{{recentMessages}}

Extract search filters like:
- query: Text to search in title/description
- state: Issue states (todo, in-progress, done, canceled)
- assignee: Assignee names or IDs
- label: Label names
- priority: Priority levels (1=Urgent, 2=High, 3=Normal, 4=Low)
- team: Team name or ID
- project: Project name or ID

Response format should be a valid JSON block:
\`\`\`json
{
  "query": "search text or null",
  "state": ["state1", "state2"] or null,
  "assignee": ["assignee"] or null,
  "label": ["label1", "label2"] or null,
  "priority": [1, 2] or null,
  "team": "team-name" or null,
  "project": "project-name" or null,
  "limit": 20
}
\`\`\`
`;

export const searchLinearIssuesAction: Action = {
  name: 'SEARCH_LINEAR_ISSUES',
  description: 'Search for issues in Linear based on various criteria',
  similes: ['search issues', 'find issues', 'list issues', 'show issues', 'query issues', 'filter issues'],
  
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
      
      let filters: LinearSearchFilters;
      
      // If we have explicit parameters, use them
      if (options && Object.keys(options).length > 0) {
        filters = {
          query: options.query ? String(options.query) : undefined,
          state: options.state as string[] | undefined,
          assignee: options.assignee as string[] | undefined,
          label: options.label as string[] | undefined,
          priority: options.priority as number[] | undefined,
          team: options.team ? String(options.team) : undefined,
          project: options.project ? String(options.project) : undefined,
          limit: options.limit ? Number(options.limit) : 20,
        };
      } else {
        // Use LLM to extract search criteria
        const response = await runtime.generateText({
          messages: state.messages || [],
          context: searchIssuesTemplate,
        });
        
        filters = JSON.parse(response.trim().replace(/```json\n?|\n?```/g, ''));
      }
      
      // Set default limit if not provided
      if (!filters.limit) {
        filters.limit = 20;
      }
      
      const issues = await linearService.searchIssues(filters);
      
      // Fetch additional data for each issue
      const issuesWithDetails = await Promise.all(
        issues.map(async (issue: any) => {
          const [assignee, state, team] = await Promise.all([
            issue.assignee,
            issue.state,
            issue.team,
          ]);
          
          return {
            id: issue.id,
            identifier: issue.identifier,
            title: issue.title,
            url: issue.url,
            priority: issue.priority,
            priorityLabel: issue.priorityLabel,
            createdAt: issue.createdAt,
            updatedAt: issue.updatedAt,
            assignee: assignee ? assignee.name : 'Unassigned',
            state: state.name,
            team: team.name,
          };
        })
      );
      
      logger.info(`Found ${issues.length} Linear issues matching criteria`);
      
      return {
        success: true,
        data: {
          issues: issuesWithDetails,
          count: issues.length,
          filters: filters,
        },
        metadata: {
          searchFilters: filters,
          resultCount: issues.length,
        },
      };
      
    } catch (error) {
      logger.error('Failed to search Linear issues:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search issues',
      };
    }
  },
  
  examples: [
    {
      input: 'Show me all open bugs',
      output: 'Found 5 open issues labeled as "bug":\n1. BUG-123: Login timeout issue\n2. BUG-124: Image upload fails\n...',
      explanation: 'Searches for issues with bug label in open states',
    },
    {
      input: 'Find high priority issues assigned to me',
      output: 'Found 3 high priority issues assigned to you:\n1. FEAT-456: Implement user dashboard\n2. BUG-789: Fix payment processing\n...',
      explanation: 'Searches for high priority issues assigned to the current user',
    },
    {
      input: 'Search for issues related to authentication',
      output: 'Found 4 issues matching "authentication":\n1. SEC-001: Add 2FA support\n2. BUG-234: Password reset not working\n...',
      explanation: 'Performs text search across issue titles and descriptions',
    },
  ] as ActionExample[],
}; 