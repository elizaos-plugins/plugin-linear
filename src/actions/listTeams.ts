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

export const listLinearTeamsAction: Action = {
  name: 'LIST_LINEAR_TEAMS',
  description: 'List all teams in the Linear workspace',
  similes: ['show teams', 'get teams', 'list teams', 'view teams'],
  
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
      
      const teams = await linearService.getTeams();
      
      const teamsData = teams.map((team: any) => ({
        id: team.id,
        name: team.name,
        key: team.key,
        description: team.description,
      }));
      
      logger.info(`Retrieved ${teams.length} Linear teams`);
      
      return {
        success: true,
        data: {
          teams: teamsData,
          count: teams.length,
        },
        metadata: {
          teamCount: teams.length,
        },
      };
      
    } catch (error) {
      logger.error('Failed to list Linear teams:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list teams',
      };
    }
  },
  
  examples: [
    {
      input: 'Show me all teams',
      output: 'Found 3 teams:\n1. Engineering (ENG)\n2. Design (DES)\n3. Product (PROD)',
      explanation: 'Lists all teams in the workspace',
    },
  ] as ActionExample[],
}; 