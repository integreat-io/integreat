module.exports = {
  type: 'entry',
  source: 'entries',
  attributes: {
    id: 'key',
    title: {path: 'heading', default: 'An entry'},
    text: 'body'
  },
  relationships: {
    author: 'authorId'
  }
}
