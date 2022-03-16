export default {
  id: 'entries',
  transporter: 'http',
  auth: true,
  options: { baseUri: 'http://some.api' },
  mutation: [{ $apply: 'exchange:json' }, { $apply: 'exchange:uri' }],
  endpoints: [
    {
      match: { action: 'GET', scope: 'collection', params: { offset: false } },
      mutation: [
        {
          $direction: 'to', // Alias for `rev`
          $flip: true,
          meta: {
            '.': 'meta',
            options: {
              '.': 'meta.options', // TODO: Find a better way to do this?
              queryParams: {
                offset: 'payload.offset',
              },
            },
          },
        },
        {
          $direction: 'from', // Alias for `fwd`
          response: {
            '.': 'response',
            data: ['response.data.data[]', { $apply: 'entries-entry' }],
            paging: {
              next: [
                {
                  $filter: 'compare',
                  path: 'response.data.next',
                  operator: '!=',
                  value: null,
                },
                {
                  type: 'payload.type',
                  offset: 'response.data.next',
                },
              ],
              prev: [
                {
                  $filter: 'compare',
                  path: 'response.data.prev',
                  operator: '!=',
                  value: null,
                },
                {
                  type: 'payload.type',
                  offset: 'response.data.prev',
                },
              ],
            },
          },
        },
      ],
      options: { uri: '/entries' },
    },
    {
      match: {
        action: 'GET',
        scope: 'collection',
        params: { updatedSince: true },
      },
      mutation: [
        {
          $direction: 'rev',
          $flip: true,
          payload: {
            '.': 'payload',
            updatedSince: [
              'payload.updatedSince',
              { $transform: 'formatDate', format: 'ISO' },
            ],
            updatedUntil: [
              'payload.updatedUntil',
              { $transform: 'formatDate', format: 'ISO' },
            ],
          },
        },
        {
          $direction: 'fwd',
          response: 'response',
          'response.data': [
            'response.data.data[]',
            { $apply: 'entries-entry' },
          ],
        },
      ],
      options: {
        method: 'GET',
        uri: '/entries?since={{{payload.updatedSince}}}&until={{{payload.updatedUntil}}}',
      },
    },
    {
      match: { action: 'SET', scope: 'collection' },
      mutation: [
        {
          $direction: 'rev',
          $flip: true,
          meta: {
            '.': 'meta',
            options: {
              '.': '^meta.options', // Not sure why we use the carret here
              'headers.x-correlation-id': 'meta.cid',
            },
          },
        },
        {
          $direction: 'fwd',
          response: 'response',
          'response.data': [
            'response.data.data[]',
            { $apply: 'entries-entry' },
          ],
        },
      ],
      options: { uri: '/entries', method: 'POST' },
    },
    {
      // Endpoint that allows raw request data for all users
      match: {
        action: 'SET',
        scope: 'collection',
        params: { rawForAll: true },
      },
      mutation: {
        $direction: 'fwd',
        response: 'response',
        'response.data': ['response.data.data[]', { $apply: 'entries-entry' }],
      },
      options: { uri: '/entries', method: 'POST' },
      allowRawRequest: true,
    },
    {
      match: { action: 'GET', scope: 'member' },
      mutation: {
        $direction: 'fwd',
        response: {
          '.': 'response',
          data: ['response.data.data', { $apply: 'entries-entry' }],
          headers: {
            'content-type': { $value: 'application/json' },
          },
        },
      },
      options: { uri: '/entries/{{payload.id}}' },
    },
    {
      // Endpoint that returns raw response for all users
      match: { action: 'GET', scope: 'member', params: { rawForAll: true } },
      mutation: {
        $direction: 'fwd',
        response: { '.': 'response', data: 'response.data.data' },
      },
      options: { uri: '/entries/{{payload.id}}' },
      allowRawResponse: true,
    },
    {
      // Endpoint that returns raw response for root user only
      match: { action: 'GET', scope: 'member', params: { rawForRoot: true } },
      mutation: {
        $direction: 'fwd',
        response: 'response',
        'response.data': 'response.data.data',
      },
      options: { uri: '/entries/{{payload.id}}' },
    },
    {
      match: { action: 'SET', scope: 'member' },
      mutation: [
        {
          $direction: 'rev',
          '.': '.',
          payload: 'payload',
          'payload.data': ['payload.data', { $apply: 'entries-entry' }],
        },
        {
          $direction: 'fwd',
          '.': '.',
          response: 'response',
          'response.data': ['response.data.data', { $apply: 'entries-entry' }],
        },
      ],
      options: { uri: '/entries/{{payload.id}}' },
    },
    {
      match: { action: 'SET', scope: 'member', params: { doValidate: true } },
      mutation: [
        {
          $direction: 'rev',
          payload: 'payload',
          'payload.data': ['payload.data', { $apply: 'entries-entry' }],
        },
        {
          $direction: 'fwd',
          response: 'response',
          'response.data': ['response.data.data', { $apply: 'entries-entry' }],
        },
        { $transform: 'shouldHaveAuthor', $direction: 'rev' },
      ],
      options: { uri: '/entries/{{payload.id}}' },
    },
    {
      match: { action: 'GET', params: { author: true } },
      mutation: {
        $direction: 'fwd',
        response: 'response',
        'response.data': ['response.data.data', { $apply: 'entries-entry' }],
      },
      options: { uri: '/entries?author={{payload.author}}' },
    },
  ],
}
