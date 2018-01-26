import test from 'ava'

import authorizeRequest from './request'

// Tests

test('should exist', (t) => {
  t.is(typeof authorizeRequest, 'function')
})

test('should grant request when authorized', (t) => {
  const datatypes = {entry: {id: 'entry', access: 'auth'}}
  const request = {
    action: 'GET',
    params: {type: 'entry'},
    ident: {id: 'ident1'}
  }
  const expected = {
    status: 'granted',
    scheme: 'auth',
    ident: {id: 'ident1'}
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret, expected)
})

test('should refuse request when not authorized', (t) => {
  const datatypes = {entry: {id: 'entry', access: 'auth'}}
  const request = {
    action: 'GET',
    params: {type: 'entry'}
  }
  const expected = {
    status: 'refused',
    scheme: 'auth',
    ident: null
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret, expected)
})

test('should grant request for all', (t) => {
  const datatypes = {entry: {id: 'entry', access: 'all'}}
  const request = {
    action: 'GET',
    params: {type: 'entry'}
  }
  const expected = {
    status: 'granted',
    scheme: 'all',
    ident: null
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret, expected)
})

test('should refuse request for none', (t) => {
  const datatypes = {entry: {id: 'entry', access: 'none'}}
  const request = {
    action: 'GET',
    params: {type: 'entry'},
    ident: {id: 'ident1'}
  }
  const expected = {
    status: 'refused',
    scheme: 'none',
    ident: {id: 'ident1'}
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret, expected)
})

test('should grant without an access scheme', (t) => {
  const datatypes = {entry: {id: 'entry'}}
  const request = {
    action: 'GET',
    params: {type: 'entry'}
  }
  const expected = {
    status: 'granted',
    scheme: null,
    ident: null
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret, expected)
})

test('should refuse without an access scheme when request has auth', (t) => {
  const datatypes = {entry: {id: 'entry'}}
  const request = {
    action: 'GET',
    params: {type: 'entry'},
    auth: {}
  }
  const expected = {
    status: 'refused',
    scheme: null,
    ident: null
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret, expected)
})

test('should grant request without datatype', (t) => {
  const datatypes = {}
  const request = {
    action: 'GET',
    params: {type: 'entry'}
  }
  const expected = {
    status: 'granted',
    scheme: null,
    ident: null
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret, expected)
})

test('should refuse request without datatype when request has auth', (t) => {
  const datatypes = {}
  const request = {
    action: 'GET',
    params: {type: 'entry'},
    auth: {}
  }
  const expected = {
    status: 'refused',
    scheme: null,
    ident: null
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret, expected)
})

test('should grant with role scheme', (t) => {
  const datatypes = {entry: {id: 'entry', access: {role: 'admin'}}}
  const request = {
    action: 'GET',
    params: {type: 'entry'},
    ident: {id: 'ident1', roles: ['admin']}
  }
  const expected = {
    status: 'granted',
    scheme: {role: 'admin'},
    ident: {id: 'ident1', roles: ['admin']}
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret, expected)
})

test('should refuse with role scheme', (t) => {
  const datatypes = {entry: {id: 'entry', access: {role: 'admin'}}}
  const request = {
    action: 'GET',
    params: {type: 'entry'},
    ident: {id: 'ident1'}
  }
  const expected = {
    status: 'refused',
    scheme: {role: 'admin'},
    ident: {id: 'ident1'}
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret, expected)
})

test('should grant with ident scheme', (t) => {
  const datatypes = {entry: {id: 'entry', access: {ident: 'ident1'}}}
  const request = {
    action: 'GET',
    params: {type: 'entry'},
    ident: {id: 'ident1'}
  }
  const expected = {
    status: 'granted',
    scheme: {ident: 'ident1'},
    ident: {id: 'ident1'}
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret, expected)
})

test('should refuse with ident scheme', (t) => {
  const datatypes = {entry: {id: 'entry', access: {ident: 'ident1'}}}
  const request = {
    action: 'GET',
    params: {type: 'entry'},
    ident: {id: 'ident2'}
  }
  const expected = {
    status: 'refused',
    scheme: {ident: 'ident1'},
    ident: {id: 'ident2'}
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret, expected)
})

test('should grant request for auth scheme', (t) => {
  const datatypes = {entry: {id: 'entry', access: {access: 'auth'}}}
  const request = {
    action: 'GET',
    params: {type: 'entry'},
    ident: {id: 'ident1'}
  }
  const expected = {
    status: 'granted',
    scheme: {access: 'auth'},
    ident: {id: 'ident1'}
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret, expected)
})

test('should grant request for all scheme', (t) => {
  const datatypes = {entry: {id: 'entry', access: {access: 'all'}}}
  const request = {
    action: 'GET',
    params: {type: 'entry'}
  }
  const expected = {
    status: 'granted',
    scheme: {access: 'all'},
    ident: null
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret, expected)
})

test('should refuse request for none scheme', (t) => {
  const datatypes = {entry: {id: 'entry', access: {access: 'none'}}}
  const request = {
    action: 'GET',
    params: {type: 'entry'},
    ident: {id: 'ident1'}
  }
  const expected = {
    status: 'refused',
    scheme: {access: 'none'},
    ident: {id: 'ident1'}
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret, expected)
})

test('should grant request for empty scheme', (t) => {
  const datatypes = {entry: {id: 'entry', access: {}}}
  const request = {
    action: 'GET',
    params: {type: 'entry'}
  }
  const expected = {
    status: 'granted',
    scheme: null,
    ident: null
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret, expected)
})

test('should refuse request for empty scheme when request has auth', (t) => {
  const datatypes = {entry: {id: 'entry', access: {}}}
  const request = {
    action: 'GET',
    params: {type: 'entry'},
    auth: {}
  }
  const expected = {
    status: 'refused',
    scheme: null,
    ident: null
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret, expected)
})

test('should return pending for roleFromField', (t) => {
  const datatypes = {entry: {id: 'entry', access: {roleFromField: 'role'}}}
  const request = {
    action: 'GET',
    params: {type: 'entry'},
    ident: {id: 'ident1'}
  }
  const expected = {
    status: 'pending',
    scheme: {roleFromField: 'role'},
    ident: {id: 'ident1'}
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret, expected)
})

test('should refuse request for roleFromField when not authenticated', (t) => {
  const datatypes = {entry: {id: 'entry', access: {roleFromField: 'role'}}}
  const request = {
    action: 'GET',
    params: {type: 'entry'}
  }
  const expected = {
    status: 'refused',
    scheme: {roleFromField: 'role'},
    ident: null
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret, expected)
})

test('should return pending for identFromField', (t) => {
  const datatypes = {entry: {id: 'entry', access: {identFromField: 'id'}}}
  const request = {
    action: 'GET',
    params: {type: 'entry'},
    ident: {id: 'ident1'}
  }
  const expected = {
    status: 'pending',
    scheme: {identFromField: 'id'},
    ident: {id: 'ident1'}
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret, expected)
})

test('should refuse request for identFromField when not authenticated', (t) => {
  const datatypes = {entry: {id: 'entry', access: {identFromField: 'id'}}}
  const request = {
    action: 'GET',
    params: {type: 'entry'}
  }
  const expected = {
    status: 'refused',
    scheme: {identFromField: 'id'},
    ident: null
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret, expected)
})

test('should grant for action', (t) => {
  const datatypes = {entry: {
    id: 'entry',
    access: {access: 'none', actions: {'GET': {access: 'all'}}}
  }}
  const request = {
    action: 'GET',
    params: {type: 'entry'}
  }
  const expected = {
    status: 'granted',
    scheme: {access: 'all'},
    ident: null
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret, expected)
})

test('should refuse for action', (t) => {
  const datatypes = {entry: {
    id: 'entry',
    access: {access: 'none', actions: {'GET': {access: 'all'}}}
  }}
  const request = {
    action: 'SET',
    params: {type: 'entry'}
  }
  const expected = {
    status: 'refused',
    scheme: {access: 'none'},
    ident: null
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret, expected)
})

test('should grant for action with short form', (t) => {
  const datatypes = {entry: {
    id: 'entry',
    access: {access: 'none', actions: {'GET': 'all'}}
  }}
  const request = {
    action: 'GET',
    params: {type: 'entry'}
  }
  const expected = {
    status: 'granted',
    scheme: 'all',
    ident: null
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret, expected)
})

test('should refuse for action with short form', (t) => {
  const datatypes = {entry: {
    id: 'entry',
    access: {access: 'all', actions: {'SET': 'none'}}
  }}
  const request = {
    action: 'SET',
    params: {type: 'entry'}
  }
  const expected = {
    status: 'refused',
    scheme: 'none',
    ident: null
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret, expected)
})
