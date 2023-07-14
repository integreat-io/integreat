export default {
  id: 'entries',
  transporter: 'http',
  auth: true,
  options: { baseUri: 'http://some.api', method: 'GET' },
  mutation: [{ $apply: 'exchange:json' }, { $apply: 'exchange:uri' }],
  endpoints: [
    {
      match: { action: 'GET', scope: 'collection', params: { offset: false } },
      mutation: [
        {
          $direction: 'to',
          $flip: true,
          meta: {
            $modify: 'meta',
            options: {
              $modify: 'meta.options',
              queryParams: {
                offset: 'payload.offset',
              },
            },
          },
        },
        {
          $direction: 'from',
          response: {
            $modify: 'response',
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
          $direction: 'to', // Keep `rev` to make sure it still works
          $flip: true,
          meta: {
            $modify: 'meta',
            options: {
              $modify: 'meta.options',
              queryParams: {
                'created\\[gte]': [
                  'payload.updatedSince',
                  { $transform: 'isoDate' },
                ],
                until: ['payload.updatedUntil', { $transform: 'isoDate' }],
              },
            },
          },
        },
        {
          $direction: 'fwd', // Keep `fwd` to make sure it still works
          response: {
            $modify: 'response',
            data: ['response.data.data[]', { $apply: 'entries-entry' }],
          },
        },
      ],
      options: {
        uri: '/entries',
      },
    },
    {
      match: { action: 'SET', scope: 'collection' },
      mutation: [
        {
          $direction: 'to',
          $flip: true,
          meta: {
            $modify: 'meta',
            options: {
              $modify: 'meta.options',
              'headers.x-correlation-id': 'meta.cid',
            },
          },
        },
        {
          $direction: 'from',
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
        $direction: 'from',
        response: {
          $modify: 'response',
          data: ['response.data.data[]', { $apply: 'entries-entry' }],
        },
      },
      options: { uri: '/entries', method: 'POST' },
      allowRawRequest: true,
    },
    {
      match: { action: 'GET', scope: 'member' },
      mutation: {
        $direction: 'from',
        response: {
          $modify: 'response',
          data: ['response.data.data', { $apply: 'entries-entry' }],
          headers: {
            'content-type': { $value: 'application/json' },
          },
        },
      },
      options: { uri: '/entries/{payload.id}' },
    },
    {
      // Endpoint that returns raw response for all users
      match: { action: 'GET', scope: 'member', params: { rawForAll: true } },
      mutation: {
        $direction: 'from',
        response: { $modify: 'response', data: 'response.data.data' },
      },
      allowRawResponse: true,
      options: { uri: '/entries/{payload.id}' },
    },
    {
      // Endpoint that returns raw response for root user only
      match: { action: 'GET', scope: 'member', params: { rawForRoot: true } },
      mutation: {
        $direction: 'from',
        response: { $modify: 'response', data: 'response.data.data' },
      },
      options: { uri: '/entries/{payload.id}' },
    },
    {
      match: { action: 'SET', scope: 'member' },
      mutation: [
        {
          $direction: 'to',
          $flip: true,
          payload: {
            $modify: 'payload',
            data: ['payload.data', { $apply: 'entries-entry' }],
          },
        },
        {
          $direction: 'from',
          response: {
            $modify: 'response',
            data: ['response.data.data', { $apply: 'entries-entry' }],
          },
        },
      ],
      options: { uri: '/entries/{payload.id}', method: 'PUT' },
    },
    // {
    //   match: { action: 'SET', scope: 'new' },
    //   mutation: [
    //     {
    //       $direction: 'to',
    //       $flip: true,
    //       payload: {
    //         $modify: 'payload',
    //         data: ['payload.data', { $apply: 'entries-entry' }],
    //       },
    //     },
    //     {
    //       $direction: 'from',
    //       response: {
    //         $modify: 'response',
    //         data: ['response.data.data', { $apply: 'entries-entry' }],
    //       },
    //     },
    //   ],
    //   options: { uri: '/entries', method: 'POST' },
    // },
    {
      match: { action: 'SET', scope: 'member', params: { doValidate: true } },
      validate: [
        {
          condition: { $transform: 'shouldHaveAuthor' }, // We use a transformer here to make sure it works, not because it's the most elegant
          failResponse: { status: 'badrequest', error: 'Error from validator' },
        },
      ],
      mutation: [
        {
          $direction: 'to',
          $flip: true,
          payload: {
            $modify: 'payload',
            data: ['payload.data', { $apply: 'entries-entry' }],
          },
        },
        {
          $direction: 'from',
          response: {
            $modify: 'response',
            data: ['response.data.data', { $apply: 'entries-entry' }],
          },
        },
      ],
      options: { uri: '/entries/{payload.id}', method: 'PUT' },
    },
    {
      match: { action: 'GET', params: { author: true } },
      mutation: {
        $direction: 'from',
        response: {
          $modify: 'response',
          data: ['response.data.data', { $apply: 'entries-entry' }],
        },
      },
      options: { uri: '/entries?author={payload.author}' },
    },
  ],
}
