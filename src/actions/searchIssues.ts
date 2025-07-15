import {
  Action,
  ActionResult,
  IAgentRuntime,
  Memory,
  State,
  ModelType,
  logger,
  HandlerCallback,
} from '@elizaos/core';
import { LinearService } from '../services/linear';
import type { LinearSearchFilters } from '../types';

const searchTemplate = `Extract search criteria from the user's request for Linear issues.

User request: "{{userMessage}}"

Extract and return ONLY a JSON object (no markdown formatting, no code blocks) with these possible filters:
{
  "query": "general search text",
  "state": "filter by state name (e.g., 'In Progress', 'Done', 'Todo')",
  "assignee": "filter by assignee name or email",
  "priority": "filter by priority (1=urgent, 2=high, 3=normal, 4=low)",
  "team": "filter by team name or key",
  "label": "filter by label name",
  "hasAssignee": true/false - whether issue should have an assignee,
  "limit": number of results to return (default 10)
}

Only include fields that are mentioned. Return only the JSON object.`;

export const searchIssuesAction: Action = {
  name: 'SEARCH_LINEAR_ISSUES',
  description: 'Search for issues in Linear with various filters',
  similes: ['search-linear-issues', 'find-linear-issues', 'query-linear-issues'],
  
  examples: [[
    {
      name: 'User',
      content: {
        text: 'Show me all open bugs'
      }
    },
    {
      name: 'Assistant',
      content: {
        text: 'I\'ll search for all open bug issues in Linear.',
        actions: ['SEARCH_LINEAR_ISSUES']
      }
    }
  ], [
    {
      name: 'User',
      content: {
        text: 'Find high priority issues assigned to me'
      }
    },
    {
      name: 'Assistant',
      content: {
        text: 'I\'ll search for high priority issues assigned to you.',
        actions: ['SEARCH_LINEAR_ISSUES']
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
        const errorMessage = 'Please provide search criteria for issues.';
        await callback?.({
          text: errorMessage,
          source: message.content.source
        });
        return {
          text: errorMessage,
          success: false
        };
      }
      
      let filters: LinearSearchFilters = {};
      
      // Check if we have explicit filters in options
      if (_options?.filters) {
        filters = _options.filters as LinearSearchFilters;
      } else {
        // Use LLM to extract search filters
        const prompt = searchTemplate.replace('{{userMessage}}', content);
        
        const response = await runtime.useModel(ModelType.TEXT_LARGE, {
          prompt: prompt
        });
        
        if (!response) {
          // Fallback to simple keyword search
          filters = { query: content };
        } else {
          try {
            // Strip markdown code blocks if present
            const cleanedResponse = response.replace(/^```(?:json)?\n?/,'').replace(/\n?```$/,'').trim();
            const parsed = JSON.parse(cleanedResponse);
            filters = {
              query: parsed.query,
              state: parsed.state ? [parsed.state] : undefined,
              assignee: parsed.assignee ? [parsed.assignee] : undefined,
              priority: parsed.priority ? [parsed.priority] : undefined,
              team: parsed.team,
              label: parsed.label ? [parsed.label] : undefined,
              limit: parsed.limit
            };
            
            // Clean up undefined values
            Object.keys(filters).forEach(key => {
              if (filters[key as keyof LinearSearchFilters] === undefined) {
                delete filters[key as keyof LinearSearchFilters];
              }
            });
          } catch (parseError) {
            logger.error('Failed to parse search filters:', parseError);
            // Fallback to simple search
            filters = { query: content };
          }
        }
      }
      
      filters.limit = (_options?.limit as number) || 10;
      const issues = await linearService.searchIssues(filters);
      
      if (issues.length === 0) {
        const noResultsMessage = 'No issues found matching your search criteria.';
        await callback?.({
          text: noResultsMessage,
          source: message.content.source
        });
        return {
          text: noResultsMessage,
          success: true,
          data: {
            issues: [],
            filters,
            count: 0
          }
        };
      }
      
      const issueList = await Promise.all(issues.map(async (issue, index) => {
        const state = await issue.state;
        return `${index + 1}. ${issue.identifier}: ${issue.title} (${state?.name || 'No state'})`;
      }));
      const issueText = issueList.join('\n');
      
      const resultMessage = `📋 Found ${issues.length} issue${issues.length === 1 ? '' : 's'}:\n${issueText}`;
      await callback?.({
        text: resultMessage,
        source: message.content.source
      });
      
      return {
        text: `Found ${issues.length} issue${issues.length === 1 ? '' : 's'}:\n${issueText}`,
        success: true,
        data: {
          issues: issues.map(i => ({
            id: i.id,
            identifier: i.identifier,
            title: i.title,
            description: i.description,
            url: i.url,
            state: i.state,
            priority: i.priority,
            priorityLabel: i.priorityLabel,
            assignee: i.assignee
          })),
          filters,
          count: issues.length
        }
      };
    } catch (error) {
      logger.error('Failed to search issues:', error);
      const errorMessage = `❌ Failed to search issues: ${error instanceof Error ? error.message : 'Unknown error'}`;
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