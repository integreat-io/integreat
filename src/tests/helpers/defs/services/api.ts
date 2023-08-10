export default {
  id: 'api',
  transporter: 'http',
  auth: true,
  adapters: ['json'],
  options: {
    someFlag: true,
    transporter: {
      url: 'http://localhost:3000',
    },
  },
  endpoints: [
    {
      match: { action: 'SET', incoming: true },
      mutation: [
        {
          $direction: 'from',
          payload: {
            $modify: 'payload',
            data: ['payload.data.article', { $apply: 'api-entry' }],
            flag: 'meta.options.someFlag',
            uri: 'meta.options.url',
          },
        },
        {
          $direction: 'to',
          $flip: true,
          response: {
            $modify: 'response',
            data: ['response.data', { $apply: 'api-entry' }],
            params: {
              flag: 'meta.options.someFlag',
              author: 'payload.data.author.id',
            },
          },
        },
      ],
    },
    {
      match: {
        action: 'SET',
        incoming: true,
        conditions: [
          {
            $transform: 'compare',
            path: 'payload.data',
            match: null,
          },
        ],
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
