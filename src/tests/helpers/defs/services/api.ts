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
          data: ['data.article', { $apply: 'api-entry' }],
        },
        {
          $direction: 'rev',
          data: ['data', { $apply: 'api-entry' }],
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
          $direction: 'fwd',
          status: { $transform: 'value', value: 'badrequest' },
          error: { $transform: 'value', value: 'We failed!' },
        },
        {
          $direction: 'rev',
          $flip: true,
          data: {
            code: 'status',
            error: 'error',
          },
        },
      ],
    },
    {
      match: { action: 'GET' },
      mutation: {
        data: ['data.article', { $apply: 'api-entry' }],
      },
    },
    {
      match: { action: 'GET', incoming: true },
      mutation: [
        {
          $direction: 'fwd',
          'params.source': 'params.source', // Just to have a fwd mutation
        },
        {
          $direction: 'rev',
          data: ['data', { $apply: 'api-entry' }],
        },
      ],
    },
  ],
}
