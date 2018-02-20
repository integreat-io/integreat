const is = require('@sindresorhus/is')

const doAuth = (scheme, ident, requireAuth) => {
  if (typeof scheme === 'string') {
    switch (scheme) {
      case 'all':
        return true
      case 'auth':
        return !!ident
    }
  } else if (scheme === null) {
    return !requireAuth
  }

  if (ident) {
    if (scheme.role) {
      return (ident.roles && ident.roles.includes(scheme.role))
    } else if (scheme.ident) {
      return (ident.id && ident.id === scheme.ident)
    } else if (scheme.roleFromField || scheme.identFromField) {
      return true
    }
  }

  // scheme === 'none' also ends here
  return false
}

const getScheme = (datatype, action) => {
  if (!datatype || is.empty(datatype.access)) {
    return null
  }

  // Get access object - directly from datatype or from the relevant action
  const {actions} = datatype.access
  const access = (actions && actions[action]) || datatype.access

  if (access.hasOwnProperty('access')) {
    // Scheme is string or null
    return access.access
  }
  // Some other scheme
  return access
}

module.exports = {
  doAuth,
  getScheme
}
