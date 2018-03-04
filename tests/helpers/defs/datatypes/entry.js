module.exports = {
  id: 'entry',
  source: 'entries',
  attributes: {
    title: 'string',
    text: 'string'
  },
  relationships: {
    author: 'user',
    sections: 'section'
  },
  access: {
    allow: 'all',
    actions: {
      SET: {role: 'editor'}
    }
  }
}
