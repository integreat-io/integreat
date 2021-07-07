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
          $direction: 'rev',
          $flip: true,
          options: {
            '.': 'options', // TODO: Find a better way to do this?
            queryParams: {
              offset: 'params.offset',
            },
          },
        },
        {
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
          params: {
            updatedSince: [
              'params.updatedSince',
              { $transform: 'formatDate', format: 'ISO' },
            ],
            updatedUntil: [
              'params.updatedUntil',
              { $transform: 'formatDate', format: 'ISO' },
            ],
          },
        },
        {
          $direction: 'fwd',
          data: ['data.data[]', { $apply: 'entries-entry' }],
        },
      ],
      options: {
        method: 'GET',
        uri: '/entries?since={{{params.updatedSince}}}&until={{{params.updatedUntil}}}',
      },
    },
    {
      match: { action: 'SET', scope: 'collection' },
      mutation: [
        {
          $direction: 'rev',
          $flip: true,
          options: {
            '.': '^options',
            'headers.x-correlation-id': 'meta.cid',
          },
        },
        {
          $direction: 'fwd',
          data: ['data.data[]', { $apply: 'entries-entry' }],
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
        data: ['data.data[]', { $apply: 'entries-entry' }],
      },
      options: { uri: '/entries', method: 'POST' },
      allowRawRequest: true,
    },
    {
      match: { action: 'GET', scope: 'member' },
      mutation: {
        $direction: 'fwd',
        data: ['data.data', { $apply: 'entries-entry' }],
      },
      options: { uri: '/entries/{{params.id}}' },
    },
    {
      // Endpoint that returns raw response for all users
      match: { action: 'GET', scope: 'member', params: { rawForAll: true } },
      mutation: { $direction: 'fwd', data: 'data.data' },
      options: { uri: '/entries/{{params.id}}' },
      allowRawResponse: true,
    },
    {
      // Endpoint that returns raw response for root user only
      match: { action: 'GET', scope: 'member', params: { rawForRoot: true } },
      mutation: { $direction: 'fwd', data: 'data.data' },
      options: { uri: '/entries/{{params.id}}' },
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
      options: { uri: '/entries/{{params.id}}' },
    },
    {
      match: { action: 'SET', scope: 'member', params: { doValidate: true } },
      mutation: [
        {
          $direction: 'rev',
          data: ['data', { $apply: 'entries-entry' }],
          status: 'status', // TODO: Find a way to remove the need for this type of through-mapping
          error: 'error',
        },
        {
          $direction: 'fwd',
          data: ['data.data', { $apply: 'entries-entry' }],
        },
        { $transform: 'shouldHaveAuthor', $direction: 'rev' },
      ],
      options: { uri: '/entries/{{params.id}}' },
    },
    {
      match: { action: 'GET', params: { author: true } },
      mutation: {
        $direction: 'fwd',
        data: ['data.data', { $apply: 'entries-entry' }],
      },
      options: { uri: '/entries?author={{params.author}}' },
    },
  ],
}
