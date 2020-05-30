export default {
  id: 'exchange:json',
  mapping: {
    data: ['data', { $transform: 'json' }],
  },
}
