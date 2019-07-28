export default {
  id: 'entry',
  plural: 'entries',
  service: 'entries',
  fields: {
    title: 'string',
    text: 'string',
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
