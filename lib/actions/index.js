const deleteFn = require('./delete')

module.exports = {
  'GET': require('./get'),
  'GET_META': require('./getMeta'),
  'GET_IDENT': require('./getIdent'),
  'SET': require('./set'),
  'SET_META': require('./setMeta'),
  'DELETE': deleteFn,
  'DEL': deleteFn,
  'SYNC': require('./sync'),
  'EXPIRE': require('./expire')
}
