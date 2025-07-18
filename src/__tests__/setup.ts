// Test setup file for Bun
import { mock } from 'bun:test';

// Define our mock LinearClient implementation
const mockLinearClient = {
  viewer: Promise.resolve({
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    active: true,
    displayName: 'Test User',
  }),
  
  teams: () => Promise.resolve({
    nodes: [
      {
        id: 'team-123',
        name: 'Engineering',
        key: 'ENG',
        description: 'Engineering team',
        active: true,
      },
    ],
  }),
  
  createIssue: () => Promise.resolve({
    issue: Promise.resolve({
      id: 'issue-123',
      identifier: 'ENG-123',
      title: 'Test Issue',
      url: 'https://linear.app/test/issue/ENG-123',
      description: 'Test description',
      priority: 3,
    }),
  }),
};

// Mock function for the LinearClient constructor
function MockLinearClient() {
  return mockLinearClient;
}

// Using Bun's mock API to mock modules
// Note: This approach requires Bun's module mocking capabilities
mock.module('@linear/sdk', () => {
  return {
    LinearClient: MockLinearClient,
  };
});

export { mockLinearClient, MockLinearClient };
