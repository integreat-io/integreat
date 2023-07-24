export default {
  $iterate: true,
  id: 'id',
  title: 'content.title',
  text: 'content.main',
  '^^payload.section': 'content.sections[]',
  createdAt: 'meta.created',
  updatedAt: 'meta.updated',
  'author.id': 'meta.author.id',
}
