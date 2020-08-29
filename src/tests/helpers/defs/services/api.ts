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
      mutation: {
        data: ['data', { $apply: 'api-entry' }],
      },
    },
  ],
}
