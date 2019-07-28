export default {
  id: 'entry',
  plural: 'entries',
  service: 'entries',
  attributes: {
    title: 'string',
    text: 'string'
  },
  relationships: {
    author: 'user',
    sections: 'section[]'
  },
  access: {
    allow: 'all',
    actions: {
      SET: { role: 'editor' }
    }
  }
}
