module.exports = {
  id: 'entry',
  service: 'entries',
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
    methods: {
      MUTATION: { role: 'editor' }
    }
  }
}
