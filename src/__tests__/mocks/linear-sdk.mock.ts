// Enhanced mock implementation for Linear SDK

// Create a proper viewer object that will be accessible as a property
const mockViewer = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  active: true,
  displayName: 'Test User',
};

// Enhanced mock client with better promise handling
export const mockLinearClient = {
  // Viewer property that returns a promise (simulates API call)
  viewer: Promise.resolve(mockViewer),
  
  // Teams method that returns a promise
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
  
  // Issue creation method that returns a promise
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

// Factory function to create a mock LinearClient
export const createMockLinearClient = (apiKey?: string) => {
  // If no API key is provided, we should still return a mock that will pass validation
  // The actual validation happens in LinearService.validateConnection()
  return mockLinearClient;
};
