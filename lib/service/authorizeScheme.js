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

const getAccessObject = (access, method) => {
  const { methods } = access
  return (methods && methods[method]) || access
}

const getScheme = (schema, method) => {
  if (!schema || !schema.access || is.emptyObject(schema.access)) {
    return null
  }

  // Get access object - directly from schema or from the relevant method
  const access = getAccessObject(schema.access, method)

  // Return if string
  if (typeof access === 'string') {
    return access
  }

  // Return access prop if set
  if (access.hasOwnProperty('allow')) {
    return access.allow
  }

  // Some other scheme - return without any methods prop
  const { methods: _discard, ...rest } = access
  return rest
}

module.exports = {
  doAuth,
  getScheme
}
