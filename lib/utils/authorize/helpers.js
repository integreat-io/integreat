const grant = () => ({status: 'granted'})
const refuse = () => ({status: 'refused'})
const pending = () => ({status: 'pending'})
const grantIf = (doGrant) => (doGrant) ? grant() : refuse()

const prepareAccess = (access, scheme = null, ident) => {
  if (scheme && typeof scheme === 'object') {
    if (Object.keys(scheme).length === 0) {
      scheme = null
    } else {
      delete scheme.actions
    }
  }
  return {ident, scheme, ...access}
}

module.exports = {
  grant,
  refuse,
  pending,
  grantIf,
  prepareAccess
}
