export default {
  schemas: [
    require('./schemas/entry').default,
    require('./schemas/user').default
  ],
  services: [
    require('./services/entries').default,
    require('./services/users').default
  ],
  mappings: [
    require('./mappings/entries-entry').default,
    require('./mappings/users-user').default
  ],
  ident: {
    type: 'user'
  }
}
