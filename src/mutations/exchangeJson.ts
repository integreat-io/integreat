export default [
  {
    $direction: 'rev',
    $flip: true,
    '.': '.',
    'options.headers.Content-Type': {
      $transform: 'value',
      value: 'application/json',
    },
  },
  {
    data: ['data', { $transform: 'json' }],
  },
]
