export default {
  id: 'users',
  adapter: 'json',
  auth: true,
  options: { baseUri: 'http://some.api' },
  endpoints: [
    {
      match: { action: 'GET', params: { tokens: true } },
      responseMapping: 'data',
      options: { uri: '/users{?tokens}' },
    },
    {
      match: { action: 'GET', scope: 'collection' },
      responseMapping: 'data',
      options: { uri: '/users' },
    },
    {
      match: { action: 'SET', scope: 'collection' },
      responseMapping: 'data',
      options: { uri: '/users', method: 'POST' },
    },
    {
      match: { action: 'GET', scope: 'member' },
      responseMapping: 'data',
      options: { uri: '/users/{id}' },
    },
  ],
  mappings: {
    user: 'users-user',
  },
}
