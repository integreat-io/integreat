export default {
  id: 'users',
  transporter: 'http',
  auth: true,
  options: { baseUri: 'http://some.api' },
  mutation: [{ $apply: 'exchange:json' }, { $apply: 'exchange:uri' }],
  endpoints: [
    {
      match: { action: 'GET', params: { tokens: true } },
      mutation: [
        {
          $direction: 'rev',
          $flip: true,
          meta: {
            '.': 'meta',
            options: {
              '.': 'meta.options', // TODO: Find a better way to do this?
              'queryParams.tokens': 'payload.tokens',
            },
          },
        },
        {
          $direction: 'fwd',
          response: 'response',
          'response.data': ['response.data.data', { $apply: 'users-user' }],
        },
      ],
      options: { uri: '/users' },
    },
    {
      match: { action: 'GET', scope: 'collection' },
      mutation: {
        $direction: 'fwd',
        response: 'response',
        'response.data': ['response.data.data', { $apply: 'users-user' }],
      },
      options: { uri: '/users' },
    },
    {
      match: { action: 'SET', scope: 'collection' },
      mutation: {
        $direction: 'fwd',
        response: 'response',
        'response.data': ['response.data.data', { $apply: 'users-user' }],
      },
      options: { uri: '/users', method: 'POST' },
    },
    {
      match: { action: 'GET', scope: 'member' },
      mutation: {
        $direction: 'fwd',
        response: 'response',
        'response.data': ['response.data.data', { $apply: 'users-user' }],
      },
      options: { uri: '/users/{{payload.id}}' },
    },
  ],
}
