module.exports = {
  type: 'entry',
  service: 'entries',
  attributes: {
    id: 'key',
    title: {path: 'heading', default: 'An entry'},
    text: 'body',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  },
  relationships: {
    author: 'authorId',
    sections: 'sections[]'
  }
}
