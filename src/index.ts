import type { Plugin } from '@elizaos/core';
import { LinearService } from './services/linear';
import * as actions from './actions';
import * as providers from './providers';

export const linearPlugin: Plugin = {
  name: 'linear',
  description: 'Linear integration plugin for issue tracking and project management',
  
  services: [LinearService],
  
  actions: [
    actions.createLinearIssueAction,
    actions.getLinearIssueAction,
    actions.updateLinearIssueAction,
    actions.searchLinearIssuesAction,
    actions.createLinearCommentAction,
    actions.listLinearTeamsAction,
    actions.listLinearProjectsAction,
    actions.getLinearActivityAction,
    actions.clearLinearActivityAction,
  ],
  
  providers: [
    providers.linearIssuesProvider,
    providers.linearTeamsProvider,
    providers.linearProjectsProvider,
    providers.linearActivityProvider,
  ],
  
  // No evaluators or events for this plugin
  evaluators: [],
  events: {},
};

// Re-export types and service for external use
export * from './types';
export { LinearService } from './services/linear'; 