module.exports = {
  id: 'entry',
  source: 'entries',
  attributes: {
    title: 'string',
    text: 'string'
  },
  relationships: {
    author: 'user'
  },
  access: {
    access: 'all',
    actions: {
      SET: {role: 'admin'}
    }
  }
}
