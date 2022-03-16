export default {
  id: 'api',
  transporter: 'http',
  auth: true,
  mutation: [{ $apply: 'exchange:json' }],
  endpoints: [
    {
      match: { action: 'SET', incoming: true },
      mutation: [
        {
          $direction: 'fwd',
          payload: 'payload',
          'payload.data': ['payload.data.article', { $apply: 'api-entry' }],
        },
        {
          $direction: 'rev',
          response: 'response',
          'response.data': ['response.data', { $apply: 'api-entry' }],
        },
      ],
    },
    {
      match: {
        action: 'SET',
        incoming: true,
        filters: { 'payload.data': { type: 'null' } },
      },
      mutation: [
        {
          $direction: 'from',
          response: {
            '.': 'response',
            status: { $value: 'badrequest' },
            error: { $value: 'We failed!' },
          },
        },
        {
          $direction: 'to',
          $flip: true,
          response: {
            '.': 'response',
            data: {
              code: 'response.status',
              error: 'response.error',
            },
          },
        },
      ],
    },
    {
      match: { action: 'GET' },
      mutation: {
        response: 'response',
        'response.data': ['response.data.article', { $apply: 'api-entry' }],
      },
    },
    {
      match: { action: 'GET', incoming: true },
      mutation: [
        {
          $direction: 'from',
          payload: 'payload',
          'payload.source': 'payload.source', // Just to have a from mutation
        },
        {
          $direction: 'to',
          response: 'response',
          'response.data': ['response.data', { $apply: 'api-entry' }],
        },
      ],
    },
  ],
}
