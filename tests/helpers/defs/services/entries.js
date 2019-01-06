module.exports = {
  id: 'entries',
  adapter: 'json',
  options: { baseUri: 'http://some.api/entries' },
  endpoints: [
    {
      match: { action: 'GET', scope: 'collection', params: { offset: true } },
      responseMapping: {
        data: 'data[]',
        'paging.next.type': { path: 'none1', default: 'entry' },
        'paging.next.offset': 'offset'
      },
      options: { uri: '/{?offset=offset?}' }
    },
    {
      match: { action: 'GET', scope: 'collection' },
      responseMapping: {
        data: 'data[]',
        'paging.next.type': { path: 'none1', default: 'entry' },
        'paging.next.offset': 'offset'
      },
      options: { uri: '/' }
    },
    {
      match: { action: 'SET', scope: 'collection' },
      requestMapping: 'data[]',
      responseMapping: 'data[]',
      options: { uri: '/', method: 'POST' }
    },
    { match: { scope: 'member' }, responseMapping: 'data', options: { uri: '/{id}' } },
    { match: { action: 'GET', params: { author: true } }, responseMapping: 'data', options: { uri: '{?author}' } }
  ],
  mappings: {
    entry: 'entries-entry',
    user: 'users-user'
  }
}
