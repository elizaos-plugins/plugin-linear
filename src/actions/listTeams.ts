import { Action, ActionResult, IAgentRuntime, Memory, State, logger } from '@elizaos/core';
import { LinearService } from '../services/linear';

export const listTeamsAction: Action = {
  name: 'LIST_LINEAR_TEAMS',
  description: 'List all teams in Linear',
  similes: ['list-linear-teams', 'show-linear-teams', 'get-linear-teams'],
  
  examples: [[
    {
      name: 'User',
      content: {
        text: 'Show me all teams'
      }
    },
    {
      name: 'Assistant',
      content: {
        text: 'I\'ll list all the teams in Linear for you.',
        actions: ['LIST_LINEAR_TEAMS']
      }
    }
  ], [
    {
      name: 'User',
      content: {
        text: 'What teams are available?'
      }
    },
    {
      name: 'Assistant',
      content: {
        text: 'Let me show you all the available teams.',
        actions: ['LIST_LINEAR_TEAMS']
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
      
      const teams = await linearService.getTeams();
      
      if (teams.length === 0) {
        return {
          text: 'No teams found in Linear.',
          success: true,
          data: {
            teams: []
          }
        };
      }
      
      const teamList = teams.map((team, index) => 
        `${index + 1}. ${team.name} (${team.key})${team.description ? ` - ${team.description}` : ''}`
      ).join('\n');
      
      return {
        text: `Found ${teams.length} team${teams.length === 1 ? '' : 's'}:\n${teamList}`,
        success: true,
        data: {
          teams: teams.map(t => ({
            id: t.id,
            name: t.name,
            key: t.key,
            description: t.description
          })),
          count: teams.length
        }
      };
    } catch (error) {
      logger.error('Failed to list teams:', error);
      return {
        text: `Failed to list teams: ${error instanceof Error ? error.message : 'Unknown error'}`,
        success: false
      };
    }
  }
}; 