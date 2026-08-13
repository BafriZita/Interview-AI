export function buildOpenApiDocument() {
  return {
    openapi: '3.0.3',
    info: {
      title: 'InterviewAI Backend API',
      version: '1.0.0',
      description: 'Authentication, profile, resume, jobs, interviews, reports, and recommendation endpoints for InterviewAI.',
    },
    servers: [{ url: 'http://localhost:5000' }],
    paths: {
      '/api/v1/health': {
        get: {
          summary: 'Health check',
          responses: {
            200: { description: 'Service is healthy' },
          },
        },
      },
      '/api/v1/auth/register': {
        post: {
          summary: 'Register a new user',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
          responses: { 201: { description: 'User created' } },
        },
      },
      '/api/v1/auth/login': {
        post: {
          summary: 'Log in a user',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
          responses: { 200: { description: 'User authenticated' } },
        },
      },
      '/api/v1/auth/me': {
        get: {
          summary: 'Get current user',
          responses: { 200: { description: 'Current user profile' } },
        },
      },
      '/api/v1/profile': {
        get: {
          summary: 'Get current profile',
          responses: { 200: { description: 'User profile response' } },
        },
        put: {
          summary: 'Update current profile',
          responses: { 200: { description: 'Profile updated' } },
        },
      },
      '/api/v1/resumes': {
        get: {
          summary: 'List resumes',
          responses: { 200: { description: 'Resume list' } },
        },
        post: {
          summary: 'Upload a resume',
          responses: { 201: { description: 'Resume uploaded' } },
        },
      },
      '/api/v1/resumes/{id}': {
        get: {
          summary: 'Get a resume',
          responses: { 200: { description: 'Resume details' } },
        },
        delete: {
          summary: 'Delete a resume',
          responses: { 204: { description: 'Resume deleted' } },
        },
      },
      '/api/v1/jobs': {
        get: {
          summary: 'List job descriptions',
          responses: { 200: { description: 'Job descriptions' } },
        },
        post: {
          summary: 'Create a job description',
          responses: { 201: { description: 'Job description created' } },
        },
      },
      '/api/v1/jobs/{id}': {
        get: {
          summary: 'Get a job description',
          responses: { 200: { description: 'Job description details' } },
        },
        delete: {
          summary: 'Delete a job description',
          responses: { 204: { description: 'Job description deleted' } },
        },
      },
      '/api/v1/jobs/match/calculate': {
        post: {
          summary: 'Calculate resume-job match',
          responses: { 201: { description: 'Match stored' } },
        },
      },
      '/api/v1/interviews': {
        get: {
          summary: 'List interview sessions',
          responses: { 200: { description: 'Interview sessions' } },
        },
        post: {
          summary: 'Start a new interview',
          responses: { 201: { description: 'Interview created' } },
        },
      },
      '/api/v1/interviews/{id}': {
        get: {
          summary: 'Get an interview session',
          responses: { 200: { description: 'Interview details' } },
        },
      },
      '/api/v1/interviews/{id}/questions/{questionId}/answer': {
        post: {
          summary: 'Save an interview answer',
          responses: { 201: { description: 'Answer saved' } },
        },
      },
      '/api/v1/interviews/{id}/complete': {
        post: {
          summary: 'Complete an interview',
          responses: { 200: { description: 'Interview completed' } },
        },
      },
      '/api/v1/reports': {
        get: {
          summary: 'List completed reports',
          responses: { 200: { description: 'Completed reports' } },
        },
      },
      '/api/v1/reports/{sessionId}': {
        get: {
          summary: 'Get a report by session id',
          responses: { 200: { description: 'Detailed report' } },
        },
      },
      '/api/v1/recommendations': {
        get: {
          summary: 'List career recommendations',
          responses: { 200: { description: 'Recommendations' } },
        },
      },
    },
  }
}
