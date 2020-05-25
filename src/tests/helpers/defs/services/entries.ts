export default {
  id: 'entries',
  adapter: 'json',
  // transport: 'http',
  auth: true,
  options: { baseUri: 'http://some.api' },
  // mutation: ['json'],
  endpoints: [
    {
      match: { action: 'GET', scope: 'collection', params: { offset: false } },
      mutation: {
        $direction: 'fwd',
        data: ['data.data[]', { $apply: 'entries-entry' }],
        paging: {
          next: [
            {
              $filter: 'compare',
              path: 'data.next',
              operator: '!=',
              value: null,
            },
            {
              type: 'params.type',
              offset: 'data.next',
            },
          ],
          prev: [
            {
              $filter: 'compare',
              path: 'data.prev',
              operator: '!=',
              value: null,
            },
            {
              type: 'params.type',
              offset: 'data.prev',
            },
          ],
        },
      },
      options: { uri: '/entries{?offset=offset?}' },
    },
    {
      match: { action: 'SET', scope: 'collection' },
      mutation: {
        $direction: 'fwd',
        data: ['data.data[]', { $apply: 'entries-entry' }],
      },
      options: { uri: '/entries', method: 'POST' },
    },
    {
      match: { action: 'GET', scope: 'member' },
      mutation: {
        $direction: 'fwd',
        data: ['data.data', { $apply: 'entries-entry' }],
      },
      options: { uri: '/entries/{id}' },
    },
    {
      match: { action: 'SET', scope: 'member' },
      mutation: [
        {
          $direction: 'rev',
          data: ['data', { $apply: 'entries-entry' }],
        },
        {
          $direction: 'fwd',
          data: ['data.data', { $apply: 'entries-entry' }],
        },
      ],
      options: { uri: '/entries/{id}' },
    },
    {
      match: { action: 'GET', params: { author: true } },
      mutation: {
        $direction: 'fwd',
        data: ['data.data', { $apply: 'entries-entry' }],
      },
      options: { uri: '/entries{?author}' },
    },
    {
      match: {
        action: 'REQUEST',
        filters: {
          'request.data': { type: 'object', required: ['key'] },
          'request.params.requestMethod': { const: 'GET' },
        },
      },
      mutation: { $direction: 'fwd', params: { id: 'data.key' } },
      options: { actionType: 'GET', actionPayload: { type: 'entry' } },
    },
    {
      match: {
        action: 'REQUEST',
        filters: {
          'request.type': { const: 'entry' },
          'request.params.requestMethod': { const: 'POST' },
        },
      },
      mutation: { data: ['data', { $apply: 'entries-entry' }] },
      options: { actionType: 'SET', actionPayload: { type: 'entry' } },
    },
  ],
}
