const is = require('@sindresorhus/is')

const doAuthGrant = (scheme, ident) => {
  switch (scheme) {
    case 'all':
      return true
    case 'auth':
      return !!ident
  }
  // 'none' also ends here
  return false
}

const doAuthIdent = (scheme, ident) => {
  if (scheme.role) {
    return (ident.roles && ident.roles.includes(scheme.role))
  } else if (scheme.ident) {
    return (ident.id && ident.id === scheme.ident)
  } else if (scheme.roleFromField || scheme.identFromField) {
    return true
  }

  return false
}

const doAuth = (scheme, ident, requireAuth) => {
  if (typeof scheme === 'string') {
    return doAuthGrant(scheme, ident)
  } else if (scheme === null) {
    return !requireAuth
  }

  if (ident) {
    return doAuthIdent(scheme, ident)
  }

  return false
}

const getAccessObject = (access, action) => {
  const {actions} = access
  return (actions && actions[action]) || access
}

const getScheme = (datatype, action) => {
  if (!datatype || is.empty(datatype.access)) {
    return null
  }

  // Get access object - directly from datatype or from the relevant action
  const access = getAccessObject(datatype.access, action)

  // Return if string
  if (typeof access === 'string') {
    return access
  }

  // Return access prop if set
  if (access.hasOwnProperty('access')) {
    return access.access
  }

  // Some other scheme - return without any actions prop
  const {actions: discard, ...rest} = access
  return rest
}

module.exports = {
  doAuth,
  getScheme
}
