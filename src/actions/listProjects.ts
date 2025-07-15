import { Action, ActionResult, IAgentRuntime, Memory, State, logger } from '@elizaos/core';
import { LinearService } from '../services/linear';

export const listProjectsAction: Action = {
  name: 'LIST_LINEAR_PROJECTS',
  description: 'List all projects in Linear',
  similes: ['list-linear-projects', 'show-linear-projects', 'get-linear-projects'],
  
  examples: [[
    {
      name: 'User',
      content: {
        text: 'Show me all projects'
      }
    },
    {
      name: 'Assistant',
      content: {
        text: 'I\'ll list all the projects in Linear for you.',
        actions: ['LIST_LINEAR_PROJECTS']
      }
    }
  ], [
    {
      name: 'User',
      content: {
        text: 'What projects do we have?'
      }
    },
    {
      name: 'Assistant',
      content: {
        text: 'Let me show you all the available projects.',
        actions: ['LIST_LINEAR_PROJECTS']
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
      
      const projects = await linearService.getProjects();
      
      if (projects.length === 0) {
        return {
          text: 'No projects found in Linear.',
          success: true,
          data: {
            projects: []
          }
        };
      }
      
      // Get teams for each project
      const projectsWithDetails = await Promise.all(
        projects.map(async (project) => {
          const teamsQuery = await project.teams();
          const teams = await teamsQuery.nodes;
          return {
            ...project,
            teamsList: teams
          };
        })
      );
      
      const projectList = projectsWithDetails.map((project, index) => {
        const teamNames = project.teamsList.map((t: any) => t.name).join(', ') || 'No teams';
        return `${index + 1}. ${project.name}${project.description ? ` - ${project.description}` : ''} (Teams: ${teamNames})`;
      }).join('\n');
      
      return {
        text: `Found ${projects.length} project${projects.length === 1 ? '' : 's'}:\n${projectList}`,
        success: true,
        data: {
          projects: projectsWithDetails.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            url: p.url,
            teams: p.teamsList.map((t: any) => ({
              id: t.id,
              name: t.name,
              key: t.key
            })),
            state: p.state,
            progress: p.progress,
            startDate: p.startDate,
            targetDate: p.targetDate
          })),
          count: projects.length
        }
      };
    } catch (error) {
      logger.error('Failed to list projects:', error);
      return {
        text: `Failed to list projects: ${error instanceof Error ? error.message : 'Unknown error'}`,
        success: false
      };
    }
  }
}; 