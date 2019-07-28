export default {
  id: 'entries-entry',
  type: 'entry',
  service: 'entries',
  pipeline: [
    {
      $iterate: true,
      id: 'key',
      type: [
        { $transform: 'fixed', value: 'entry', $direction: 'fwd' },
        { $transform: 'fixed', value: undefined, $direction: 'rev' }
      ],
      attributes: {
        title: ['headline', { $alt: 'value', value: 'An entry' }],
        'title/1': 'originalTitle',
        text: 'body',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt'
      },
      relationships: {
        author: 'authorId',
        sections: 'sections[]'
      }
    },
    { $apply: 'cast_entry' }
  ]
}
