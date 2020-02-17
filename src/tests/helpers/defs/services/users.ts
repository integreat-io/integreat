export default {
  id: 'users',
  adapter: 'json',
  options: { baseUri: 'http://some.api' },
  endpoints: [
    {
      match: { action: 'GET', params: { tokens: true } },
      fromMapping: 'data',
      options: { uri: '/users{?tokens}' }
    },
    {
      match: { action: 'GET', scope: 'collection' },
      fromMapping: 'data',
      options: { uri: '/users' }
    },
    {
      match: { action: 'SET', scope: 'collection' },
      fromMapping: 'data',
      options: { uri: '/users', method: 'POST' }
    },
    {
      match: { action: 'GET', scope: 'member' },
      fromMapping: 'data',
      options: { uri: '/users/{id}' }
    }
  ],
  mappings: {
    user: 'users-user'
  }
}
