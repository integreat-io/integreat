export default [
  {
    $direction: 'fwd',
    $modify: '.',
    payload: {
      $modify: 'payload',
      data: ['payload.data', { $transform: 'json' }],
    },
    response: {
      $modify: 'response',
      data: ['response.data', { $transform: 'json' }],
    },
  },
  {
    $direction: 'rev',
    $flip: true,
    $modify: '.',
    payload: {
      $modify: 'payload',
      data: ['payload.data', { $transform: 'json' }],
    },
    response: {
      $modify: 'response',
      data: ['response.data', { $transform: 'json' }],
    },
    meta: {
      $modify: 'meta',
      options: {
        $modify: 'meta.options',
        headers: {
          $modify: 'meta.options.headers',
          'Content-Type': {
            $value: 'application/json',
          },
        },
      },
    },
  },
]
