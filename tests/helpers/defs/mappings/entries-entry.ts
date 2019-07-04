module.exports = {
  id: 'entries-entry',
  type: 'entry',
  service: 'entries',
  attributes: {
    id: 'key',
    title: { path: 'headline', default: 'An entry' },
    'title/1': 'originalTitle',
    text: 'body',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  },
  relationships: {
    'author.id': 'authorId',
    'sections.id': 'sections[]'
  }
}
