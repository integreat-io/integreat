export default {
  id: 'api',
  transporter: 'http',
  auth: true,
  mutation: [{ $apply: 'exchange:json' }],
  endpoints: [
    {
      match: { action: 'SET' },
      mutation: {
        data: ['data.article', { $apply: 'api-entry' }],
      },
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
