export default {
  id: 'entries',
  adapter: 'json',
  auth: true,
  options: { baseUri: 'http://some.api' },
  mappings: {
    entry: 'entries-entry',
    user: 'users-user',
  },
  endpoints: [
    {
      match: { action: 'GET', scope: 'collection', params: { offset: true } },
      responseMapping: [
        'data',
        {
          data: 'data[]',
          'paging.next.type': [{ $transform: 'fixed', value: 'entry' }],
          'paging.next.offset': 'offset',
        },
      ],
      options: { uri: '/entries{?offset=offset?}' },
    },
    {
      match: { action: 'GET', scope: 'collection' },
      responseMapping: [
        'data',
        {
          data: 'data[]',
          'paging.next.type': [{ $transform: 'fixed', value: 'entry' }],
          'paging.next.offset': 'offset',
        },
      ],
      options: { uri: '/entries' },
    },
    {
      match: { action: 'SET', scope: 'collection' },
      requestMapping: 'data[]',
      responseMapping: 'data[]',
      options: { uri: '/entries', method: 'POST' },
    },
    {
      match: { scope: 'member' },
      responseMapping: 'data',
      options: { uri: '/entries/{id}' },
    },
    {
      match: { action: 'GET', params: { author: true } },
      responseMapping: 'data',
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
      responseMapping: [
        {
          'params.id': 'data.key',
        },
      ],
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
      options: { actionType: 'SET', actionPayload: { type: 'entry' } },
    },
  ],
}
