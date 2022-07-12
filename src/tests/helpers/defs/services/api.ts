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
          $direction: 'from',
          payload: {
            $modify: 'payload',
            data: ['payload.data.article', { $apply: 'api-entry' }],
          },
        },
        {
          $direction: 'to',
          $flip: true,
          response: {
            $modify: 'response',
            data: ['response.data', { $apply: 'api-entry' }],
          },
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
            $modify: 'response',
            status: { $value: 'badrequest' },
            error: { $value: 'We failed!' },
          },
        },
        {
          $direction: 'to',
          $flip: true,
          response: {
            $modify: 'response',
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
        response: {
          $modify: 'response',
          data: ['response.data.article', { $apply: 'api-entry' }],
        },
      },
    },
    {
      match: { action: 'GET', incoming: true },
      mutation: [
        {
          $direction: 'from',
          payload: {
            $modify: 'payload',
            source: 'payload.source', // Just to have a from mutation
          },
        },
        {
          $direction: 'to',
          $flip: true,
          response: {
            $modify: 'response',
            data: ['response.data', { $apply: 'api-entry' }],
          },
        },
      ],
    },
  ],
}
