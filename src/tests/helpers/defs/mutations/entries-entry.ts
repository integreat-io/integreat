export default [
  {
    $iterate: true,
    id: 'key',
    title: { $alt: ['headline', { $value: 'An entry' }] },
    'title/1': 'originalTitle',
    text: 'body',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    'author.id': 'authorId',
    approvedBy: 'approver',
    sections: 'sections[]',
    props: 'props[]',
  },
  { $apply: 'cast_entry' },
]
