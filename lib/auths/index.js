const gatherResources = require('../utils/gatherResources')

const auth = [
  'options',
  'token',
  'oauth2',
  'couchdb'
]

module.exports = gatherResources(auth, __dirname)
