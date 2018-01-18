const deleteFn = require('./delete')

module.exports = {
  'GET': require('./get'),
  'GET_RAW': require('./getRaw'),
  'GET_UNMAPPED': require('./getUnmapped'),
  'GET_META': require('./getMeta'),
  'SET': require('./set'),
  'SET_META': require('./setMeta'),
  'DELETE': deleteFn,
  'DEL': deleteFn,
  'SYNC': require('./sync'),
  'EXPIRE': require('./expire')
}
