module.exports = {
  id: 'accounts',
  adapter: 'json',
  endpoints: {
    get: 'http://api.feednstatus.com/1.0/accounts',
    getOne: 'http://api.feednstatus.com/1.0/accounts/{id}'
  },
  mappings: {
    account: {
      path: 'data',
      attributes: {
        id: {path: 'id'},
        username: {path: 'attributes.name'},
        createdAt: {path: 'attributes.createdAt'},
        updatedAt: {path: 'attributes.updatedAt'}
      }
    }
  }
}
