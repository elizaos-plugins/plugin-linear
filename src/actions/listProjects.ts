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

export const listLinearProjectsAction: Action = {
  name: 'LIST_LINEAR_PROJECTS',
  description: 'List projects in Linear, optionally filtered by team',
  similes: ['show projects', 'get projects', 'list projects', 'view projects'],
  
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
      
      const teamId = options?.teamId ? String(options.teamId) : undefined;
      const projects = await linearService.getProjects(teamId);
      
      const projectsData = await Promise.all(
        projects.map(async (project: any) => {
          const team = await project.team;
          return {
            id: project.id,
            name: project.name,
            description: project.description,
            state: project.state,
            teamName: team?.name,
            startDate: project.startDate,
            targetDate: project.targetDate,
          };
        })
      );
      
      logger.info(`Retrieved ${projects.length} Linear projects`);
      
      return {
        success: true,
        data: {
          projects: projectsData,
          count: projects.length,
        },
        metadata: {
          projectCount: projects.length,
          teamFilter: teamId,
        },
      };
      
    } catch (error) {
      logger.error('Failed to list Linear projects:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list projects',
      };
    }
  },
  
  examples: [
    {
      input: 'Show me all projects',
      output: 'Found 5 projects:\n1. Q1 2024 Roadmap\n2. Mobile App Redesign\n3. API v2 Migration...',
      explanation: 'Lists all projects in the workspace',
    },
  ] as ActionExample[],
}; 