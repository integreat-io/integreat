export default [
  {
    $iterate: true,
    id: 'id',
    title: 'content.title',
    text: 'content.main',
    createdAt: 'meta.created',
    updatedAt: 'meta.updated',
    'author.id': 'meta.author.id',
  },
  { $apply: 'cast_entry' },
]
