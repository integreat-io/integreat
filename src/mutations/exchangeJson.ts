export default [
  {
    $direction: 'rev',
    $flip: true,
    '.': '.',
    options: {
      '.': 'options',
      headers: {
        '.': 'options.headers', // TODO: Find a better way
        'Content-Type': {
          $transform: 'value',
          value: 'application/json',
        },
      },
    },
  },
  {
    '.': '.',
    data: ['data', { $transform: 'json' }],
  },
]
