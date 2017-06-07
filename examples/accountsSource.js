module.exports = {
  id: 'accounts',
  adapter: 'json',
  endpoints: {
    all: 'http://api.feednstatus.com/1.0/accounts',
    one: 'http://api.feednstatus.com/1.0/accounts/{id}'
  },
  items: [{
    type: 'account',
    path: 'data',
    attributes: [
      {key: 'id', path: 'id'},
      {key: 'username', path: 'attributes.name'},
      {key: 'createdAt', path: 'attributes.createdAt'},
      {key: 'updatedAt', path: 'attributes.updatedAt'}
    ]
  }]
}
