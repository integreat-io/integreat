export default [
  {
    $iterate: true,
    id: 'key',
    title: ['headline', { $alt: 'value', value: 'An entry' }],
    'title/1': 'originalTitle',
    text: 'body',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    'author.id': 'authorId',
    sections: 'sections[]',
    props: 'props[]',
  },
  { $apply: 'cast_entry' },
]
