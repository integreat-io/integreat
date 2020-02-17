export default {
  id: 'entries',
  adapter: 'json',
  options: { baseUri: 'http://some.api' },
  mappings: {
    entry: 'entries-entry',
    user: 'users-user'
  },
  endpoints: [
    {
      match: { action: 'GET', scope: 'collection', params: { offset: true } },
      fromMapping: [
        'data',
        {
          data: 'data[]',
          'paging.next.type': [{ $transform: 'fixed', value: 'entry' }],
          'paging.next.offset': 'offset'
        }
      ],
      options: { uri: '/entries{?offset=offset?}' }
    },
    {
      match: { action: 'GET', scope: 'collection' },
      fromMapping: [
        'data',
        {
          data: 'data[]',
          'paging.next.type': [{ $transform: 'fixed', value: 'entry' }],
          'paging.next.offset': 'offset'
        }
      ],
      options: { uri: '/entries' }
    },
    {
      match: { action: 'SET', scope: 'collection' },
      toMapping: 'data[]',
      fromMapping: 'data[]',
      options: { uri: '/entries', method: 'POST' }
    },
    {
      match: { scope: 'member' },
      fromMapping: 'data',
      options: { uri: '/entries/{id}' }
    },
    {
      match: { action: 'GET', params: { author: true } },
      fromMapping: 'data',
      options: { uri: '/entries{?author}' }
    },
    {
      match: {
        action: 'REQUEST',
        filters: {
          data: { type: 'object', required: ['key'] },
          'request.requestMethod': { const: 'GET' }
        }
      },
      fromMapping: [
        {
          'params.id': 'data.key'
        }
      ],
      options: { actionType: 'GET', actionPayload: { type: 'entry' } }
    },
    {
      match: {
        action: 'REQUEST',
        filters: {
          'request.type': { const: 'entry' },
          'request.requestMethod': { const: 'POST' }
        }
      },
      options: { actionType: 'SET', actionPayload: { type: 'entry' } }
    }
  ]
}
