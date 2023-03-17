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
          $direction: 'to',
          $flip: true,
          meta: {
            $modify: 'meta',
            options: {
              $modify: 'meta.options',
              'queryParams.tokens': 'payload.tokens',
            },
          },
        },
        {
          $direction: 'from',
          response: {
            $modify: 'response',
            data: ['response.data.data', { $apply: 'users-user' }],
          },
        },
      ],
      options: { uri: '/users' },
    },
    {
      match: { action: 'GET', scope: 'collection' },
      mutation: {
        $direction: 'from',
        response: {
          $modify: 'response',
          data: ['response.data.data', { $apply: 'users-user' }],
        },
      },
      options: { uri: '/users' },
    },
    {
      match: { action: 'SET', scope: 'collection' },
      mutation: {
        $direction: 'from',
        response: {
          $modify: 'response',
          data: ['response.data.data', { $apply: 'users-user' }],
        },
      },
      options: { uri: '/users', method: 'POST' },
    },
    {
      match: { action: 'GET', scope: 'member' },
      mutation: {
        $direction: 'from',
        response: {
          $modify: 'response',
          data: ['response.data.data', { $apply: 'users-user' }],
        },
      },
      options: { uri: '/users/{payload.id}' },
    },
  ],
}
