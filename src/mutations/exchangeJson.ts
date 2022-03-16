export default [
  {
    $direction: 'rev',
    $flip: true,
    '.': '.',
    'meta.options': {
      '.': 'meta.options',
      headers: {
        '.': 'meta.options.headers', // TODO: Find a better way
        'Content-Type': {
          $transform: 'value',
          value: 'application/json',
        },
      },
    },
  },
  {
    '.': '.',
    payload: { '.': 'payload', data: ['payload.data', { $transform: 'json' }] },
    response: {
      '.': 'response',
      data: ['response.data', { $transform: 'json' }],
    },
  },
]
