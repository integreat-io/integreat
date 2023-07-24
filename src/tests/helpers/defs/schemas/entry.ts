export default {
  id: 'entry',
  plural: 'entries',
  service: 'entries',
  shape: {
    title: 'string',
    text: 'string',
    author: 'user',
    approvedBy: 'user',
    sections: 'section[]',
    'props[]': {
      key: 'string',
      value: 'string',
    },
    createdAt: 'date',
    updatedAt: 'date',
  },
  access: {
    allow: 'all',
    actions: {
      SET: { role: 'editor' },
    },
  },
}
