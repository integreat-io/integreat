export default {
  id: 'api',
  transporter: 'http',
  auth: true,
  mutation: [{ $apply: 'exchange:json' }],
  endpoints: [
    {
      // Endpoint for incoming requests
      match: { action: 'SET' },
      mutation: {
        data: ['data.article', { $apply: 'api-entry' }],
      },
    },
  ],
}
