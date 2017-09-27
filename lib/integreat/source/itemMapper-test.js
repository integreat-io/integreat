import test from 'ava'
import datatype from '../datatype'

import itemMapper from './itemMapper'

// Tests

test('should exist', (t) => {
  t.is(typeof itemMapper, 'function')
})

test('should set type', (t) => {
  const item = itemMapper({type: 'entry'})

  t.truthy(item)
  t.is(item.type, 'entry')
})

test('should set default values', (t) => {
  const item = itemMapper()

  t.is(item.type, 'unset')
})

// Tests -- fromSource

test('fromSource should exist', (t) => {
  const item = itemMapper()

  t.is(typeof item.fromSource, 'function')
})

test('fromSource should return null when no data', (t) => {
  const item = itemMapper()

  const ret = item.fromSource()

  t.is(ret, null)
})

test('fromSource should return null when mapping to non-existing property', (t) => {
  const dtype = datatype({id: 'entry', attributes: {title: 'string'}})
  const path = 'unknown'
  const item = itemMapper({type: 'entry', path, attributes: {title: {}}}, {datatype: dtype})

  const ret = item.fromSource({item: {}})

  t.is(ret, null)
})

test('fromSource should return item with type', (t) => {
  const dtype = datatype({id: 'entry', attributes: {title: 'string'}})
  const attributes = {title: {}}
  const path = 'item'
  const item = itemMapper({type: 'entry', path, attributes}, {datatype: dtype})

  const ret = item.fromSource({item: {}})

  t.truthy(ret)
  t.is(ret.type, 'entry')
})

test('fromSource should generate random id', (t) => {
  const dtype = datatype({id: 'entry', attributes: {title: 'string'}})
  const attributes = {title: {}}
  const path = 'item'
  const item = itemMapper({type: 'entry', path, attributes}, {datatype: dtype})

  const ret1 = item.fromSource({item: {}})
  const ret2 = item.fromSource({item: {}})

  t.is(typeof ret1.id, 'string')
  t.is(typeof ret2.id, 'string')
  t.not(ret1.id, ret2.id)
})

test('fromSource should set createdAt and updatedAt to current Date when not specified', (t) => {
  const dtype = datatype({id: 'entry', attributes: {title: 'string'}})
  const attributes = {title: {}}
  const path = 'item'
  const item = itemMapper({type: 'entry', path, attributes}, {datatype: dtype})
  const before = Date.now()

  const ret = item.fromSource({item: {}})

  const after = Date.now()
  t.truthy(ret.createdAt)
  t.true(ret.createdAt.getTime() >= before)
  t.true(ret.createdAt.getTime() <= after)
  t.is(ret.createdAt.getTime(), ret.updatedAt.getTime())
})

test('fromSource should map attributes for item', (t) => {
  const data = {item: {values: {first: 1, second: {value: 2}}}}
  const attributes = {
    one: {path: 'values.first'},
    two: {path: 'values.second.value'}
  }
  const type = datatype({attributes: {one: 'integer', two: 'integer'}})
  const path = 'item'
  const item = itemMapper({type: 'entry', path, attributes}, {datatype: type})

  const ret = item.fromSource(data)

  t.deepEqual(ret.attributes, {one: 1, two: 2})
})

test('fromSource should map attributes for array of items', (t) => {
  const data = {items: [{values: {first: 1}}, {values: {first: 2}}]}
  const attributes = {
    one: {path: 'values.first'}
  }
  const type = datatype({attributes: {one: 'integer'}})
  const path = 'items[]'
  const item = itemMapper({type: 'entry', path, attributes}, {datatype: type})

  const ret = item.fromSource(data)

  t.true(Array.isArray(ret))
  t.is(ret.length, 2)
  t.deepEqual(ret[0].attributes, {one: 1})
  t.deepEqual(ret[1].attributes, {one: 2})
})

test('fromSource should use string attribute def as path', (t) => {
  const data = {values: {first: 1}}
  const attributes = {one: 'values.first'}
  const type = datatype({attributes: {one: 'integer'}})
  const item = itemMapper({type: 'entry', attributes}, {datatype: type})

  const ret = item.fromSource(data)

  t.deepEqual(ret.attributes, {one: 1})
})

test('fromSource should use alternative attribute path', (t) => {
  const data = {values: {first: 1}}
  const attributes = {one: {path: ['values.unknown', 'values.first']}}
  const type = datatype({attributes: {one: 'integer'}})
  const item = itemMapper({type: 'entry', attributes}, {datatype: type})

  const ret = item.fromSource(data)

  t.deepEqual(ret.attributes, {one: 1})
})

test('fromSource should use param instead of attribute path', (t) => {
  const data = {values: {first: 1}}
  const attributes = {one: {param: 'first'}}
  const type = datatype({attributes: {one: 'integer'}})
  const item = itemMapper({type: 'entry', attributes}, {datatype: type})
  const params = {first: 10}

  const ret = item.fromSource(data, {params})

  t.deepEqual(ret.attributes, {one: 10})
})

test('fromSource should use id attribute as id for item', (t) => {
  const data = {key: 'item1'}
  const attributes = {id: {path: 'key'}}
  const type = datatype({attributes: {id: {}}})
  const item = itemMapper({type: 'entry', attributes}, {datatype: type})

  const ret = item.fromSource(data)

  t.is(ret.id, 'item1')
  t.is(ret.attributes.id, undefined)
})

test('fromSource should not use source type as type for item', (t) => {
  const data = {key: 'item1', type: 'wrong'}
  const type = datatype({id: 'entry'})
  const attributes = {type: {path: 'type'}}
  const item = itemMapper({type: 'entry', attributes}, {datatype: type})

  const ret = item.fromSource(data)

  t.is(ret.type, 'entry')
  t.is(ret.attributes.type, undefined)
})

test('fromSource should use createAt and updatedAt attributes as dates for item', (t) => {
  const createdAt = new Date('2016-11-01')
  const updatedAt = new Date('2016-11-13')
  const data = {createdAt, updatedAt}
  const attributes = {
    createdAt: {type: 'date', path: 'createdAt'},
    updatedAt: {type: 'date', path: 'updatedAt'}
  }
  const type = datatype({attributes: {createdAt: {}, updatedAt: {}}})
  const item = itemMapper({type: 'entry', attributes}, {datatype: type})

  const ret = item.fromSource(data)

  t.is(ret.createdAt.getTime(), createdAt.getTime())
  t.is(ret.updatedAt.getTime(), updatedAt.getTime())
  t.is(ret.attributes.createdAt, undefined)
  t.is(ret.attributes.updatedAt, undefined)
})

test('fromSource should use createdAt when updatedAt is not set', (t) => {
  const createdAt = new Date('2016-11-01')
  const data = {createdAt}
  const attributes = {createdAt: {path: 'createdAt'}}
  const type = datatype({attributes: {createdAt: {}}})
  const item = itemMapper({type: 'entry', attributes}, {datatype: type})

  const ret = item.fromSource(data)

  t.is(ret.updatedAt.getTime(), createdAt.getTime())
})

test('fromSource should use updatedAt when createdAt is not set', (t) => {
  const updatedAt = new Date('2016-11-01')
  const data = {updatedAt}
  const attributes = {updatedAt: {path: 'updatedAt'}}
  const type = datatype({attributes: {updatedAt: {type: 'date'}}})
  const item = itemMapper({type: 'entry', attributes}, {datatype: type})

  const ret = item.fromSource(data)

  t.is(ret.createdAt.getTime(), updatedAt.getTime())
})

test('fromSource should use type from type def', (t) => {
  const data = {values: {first: '1'}}
  const type = datatype({
    id: 'entry',
    attributes: {
      first: {type: 'integer'}
    }
  })
  const formatters = {integer: () => 1}
  const attributes = {
    first: {path: 'values.first'}
  }
  const item = itemMapper({type: 'entry', attributes}, {datatype: type, formatters})

  const ret = item.fromSource(data)

  t.truthy(ret.attributes)
  t.is(ret.attributes.first, 1)
})

test('fromSource should set relationships', (t) => {
  const data = {item: {note: 'no1'}}
  const type = datatype({
    relationships: {comments: {type: 'comment'}}
  })
  const relationships = {comments: {path: 'item.note'}}
  const item = itemMapper({type: 'entry', relationships}, {datatype: type})

  const ret = item.fromSource(data)

  t.truthy(ret.relationships)
  t.deepEqual(ret.relationships.comments, {id: 'no1', type: 'comment'})
})

test('fromSource should use string relationships def as path', (t) => {
  const data = {item: {note: 'no1'}}
  const type = datatype({
    relationships: {comments: {type: 'comment'}}
  })
  const relationships = {comments: 'item.note'}
  const item = itemMapper({type: 'entry', relationships}, {datatype: type})

  const ret = item.fromSource(data)

  t.truthy(ret.relationships)
  t.deepEqual(ret.relationships.comments, {id: 'no1', type: 'comment'})
})

test('fromSource should set relationship with array', (t) => {
  const data = {item: {notes: ['no1', 'no3']}}
  const type = datatype({
    relationships: {comments: {type: 'comment'}}
  })
  const relationships = {comments: {type: 'comment', path: 'item.notes'}}
  const item = itemMapper({type: 'entry', relationships}, {datatype: type})
  const expected = [{id: 'no1', type: 'comment'}, {id: 'no3', type: 'comment'}]

  const ret = item.fromSource(data)

  t.deepEqual(ret.relationships.comments, expected)
})

test('fromSource should use param instead of relationship path', (t) => {
  const data = {item: {notes: 'no1'}}
  const type = datatype({
    relationships: {comments: {type: 'comment'}}
  })
  const relationships = {comments: {type: 'comment', param: 'comment'}}
  const item = itemMapper({type: 'entry', relationships}, {datatype: type})
  const params = {comment: 'no3'}

  const ret = item.fromSource(data, {params})

  t.deepEqual(ret.relationships.comments, {id: 'no3', type: 'comment'})
})

test('fromSource should only map attributes and relationships defined in type', (t) => {
  const data = {values: {first: 1, second: 2, author: 'johnf'}}
  const type = datatype({
    id: 'entry',
    attributes: {
      first: {type: 'integer'}
    },
    relationships: {}
  })
  const attributes = {
    first: {path: 'values.first'},
    second: {path: 'values.second'}
  }
  const relationships = {
    author: {path: 'values.author'}
  }
  const item = itemMapper({type: 'entry', attributes, relationships}, {datatype: type})

  const ret = item.fromSource(data)

  t.truthy(ret.attributes)
  t.is(ret.attributes.first, 1)
  t.is(ret.attributes.second, undefined)
  t.truthy(ret.relationships)
  t.falsy(ret.relationships.author)
})

test('fromSource should always map id, createdAt, and updatedAt', (t) => {
  const createdAt = new Date('2017-02-27T12:00:00Z')
  const updatedAt = new Date('2017-03-05T18:00:00Z')
  const data = {id: 'ent1', createdAt, updatedAt}
  const type = datatype({attributes: {}})
  const attributes = {id: {}, createdAt: {}, updatedAt: {}}
  const item = itemMapper({type: 'entry', attributes}, {datatype: type})

  const ret = item.fromSource(data)

  t.truthy(ret.attributes)
  t.is(ret.id, 'ent1')
  t.is(ret.createdAt.getTime(), createdAt.getTime())
  t.is(ret.updatedAt.getTime(), updatedAt.getTime())
})

test('fromSource should include all values from type', (t) => {
  const data = {values: {first: 1, second: {value: 2}}}
  const attributes = {
    one: {path: 'values.first'},
    two: {path: 'values.second.value'}
  }
  const type = datatype({
    attributes: {
      one: 'integer',
      two: 'integer',
      three: {default: 3}
    },
    relationships: {
      author: {type: 'user', default: 'admin'}
    }
  })
  const item = itemMapper({type: 'entry', attributes}, {datatype: type})

  const ret = item.fromSource(data, {useDefaults: true})

  t.deepEqual(ret.attributes, {one: 1, two: 2, three: 3})
  t.deepEqual(ret.relationships, {author: {id: 'admin', type: 'user'}})
})

test('fromSource should not include all values from type', (t) => {
  const data = {values: {first: 1, second: {value: 2}}}
  const attributes = {
    one: {path: 'values.first'},
    two: {path: 'values.second.value'}
  }
  const type = datatype({
    attributes: {
      one: 'integer',
      two: 'integer',
      three: {default: 3}
    },
    relationships: {
      author: {type: 'user', default: 'admin'}
    }
  })
  const item = itemMapper({type: 'entry', attributes}, {datatype: type})

  const ret = item.fromSource(data, {useDefaults: false})

  t.deepEqual(ret.attributes, {one: 1, two: 2})
  t.deepEqual(ret.relationships, {})
})

test('fromSource should use transform pipeline', (t) => {
  const data = {id: 'item1', title: 'First item'}
  const attributes = {
    id: {},
    name: {path: 'title'}
  }
  const type = datatype({attributes: {id: {}, name: {}}})
  const transformers = {
    second: (item) => Object.assign({}, item, {
      attributes: Object.assign({}, item.attributes, {
        test2: 'Second too'
      })
    })
  }
  const transform = [
    {from: (item) => Object.assign({}, item, {test1: 'First was here'})},
    'second'
  ]
  const item = itemMapper({type: 'entry', attributes, transform}, {datatype: type, transformers})

  const ret = item.fromSource(data)

  t.is(ret.test1, 'First was here')
  t.is(ret.attributes.test2, 'Second too')
})

test('fromSource should return null when filtering item', (t) => {
  const data = {item: {id: 'ent1'}}
  const attributes = {id: 'id'}
  const type = datatype({})
  const path = 'item'
  const filterFrom = [() => true, () => false]
  const item = itemMapper({type: 'entry', path, attributes, filterFrom}, {datatype: type})

  const ret = item.fromSource(data)

  t.is(ret, null)
})

test('fromSource should filter away items in array', (t) => {
  const data = {items: [{id: 'ent1'}, {id: 'ent2'}]}
  const type = datatype({})
  const attributes = {id: 'id'}
  const path = 'items[]'
  const filterFrom = [(obj) => obj.id === 'ent2']
  const item = itemMapper({type: 'entry', path, attributes, filterFrom}, {datatype: type})

  const ret = item.fromSource(data)

  t.true(Array.isArray(ret))
  t.is(ret.length, 1)
  t.is(ret[0].id, 'ent2')
})

test('fromSource should use data as item when no attr/rel mappers', (t) => {
  const data = {
    id: 'item',
    type: 'other',
    createdAt: new Date(),
    updatedAt: new Date(),
    attributes: {title: 'Other entry'},
    relationships: {author: {id: 'theman', type: 'user'}}
  }
  const item = itemMapper({type: '*'})
  const dtype = datatype({
    id: 'other',
    attributes: {title: 'string'},
    relationships: {author: 'user'}
  })

  const ret = item.fromSource(data, {datatype: dtype})

  t.deepEqual(ret, data)
})

test('fromSource should set dates when no attr/rel mappers', (t) => {
  const before = Date.now()
  const data = {id: 'item', type: 'other'}
  const item = itemMapper({type: '*'})
  const dtype = datatype({id: 'other'})

  const ret = item.fromSource(data, {datatype: dtype})

  t.true(ret.createdAt >= before)
  t.true(ret.createdAt <= Date.now())
  t.is(ret.createdAt.getTime(), ret.updatedAt.getTime())
})

test('fromSource should use transform when no attr/rel mappers', (t) => {
  const data = {id: 'item', type: 'other'}
  const transform = [
    (item) => Object.assign({}, item, {custom: 'data'})
  ]
  const item = itemMapper({type: '*', transform})
  const dtype = datatype({id: 'other'})

  const ret = item.fromSource(data, {datatype: dtype})

  t.is(ret.id, 'item')
  t.is(ret.custom, 'data')
})

test('fromSource should not use data with wrong type when no attr/rel mappers', (t) => {
  const data = {
    id: 'item',
    type: 'wrong',
    attributes: {title: 'Other entry'}
  }
  const item = itemMapper({type: '*'})
  const dtype = datatype({
    id: 'other',
    attributes: {title: 'string'}
  })

  const ret = item.fromSource(data, {datatype: dtype})

  t.is(ret, null)
})

test('fromSource should not throw when no datatype', (t) => {
  const data = {id: 'item', type: 'other'}
  const attributes = {title: 'title'}
  const item = itemMapper({type: '*', attributes})

  t.notThrows(() => {
    item.fromSource(data)
  })
})

// Tests -- toSource

test('toSource should exist', (t) => {
  const item = itemMapper({type: 'entry'})

  t.is(typeof item.toSource, 'function')
})

test('toSource should return null when no data', (t) => {
  const item = itemMapper()

  const ret = item.toSource()

  t.is(ret, null)
})

test('toSource should map attributes to given item', (t) => {
  const data = {id: 'ent1', type: 'entry', attributes: {one: 1, two: 2}}
  const attributes = {
    one: {path: 'values.first'},
    two: {path: 'values.second.value'}
  }
  const type = datatype({attributes: {one: 'integer', two: 'integer'}})
  const path = 'item'
  const item = itemMapper({type: 'entry', path, attributes}, {datatype: type})
  const target = {old: true}
  const expected = {item: {values: {first: 1, second: {value: 2}}}, old: true}

  const ret = item.toSource(data, {target})

  t.deepEqual(ret, expected)
})

test('toSource should format attributes', (t) => {
  const data = {id: 'ent1', type: 'entry', attributes: {one: 1}}
  const format = [{to: (value) => value + 2}]
  const attributes = {one: {path: 'values.first', format}}
  const type = datatype({attributes: {one: 'integer'}})
  const item = itemMapper({type: 'entry', attributes}, {datatype: type})

  const ret = item.toSource(data)

  t.is(ret.values.first, 3)
})

test('toSource should not throw on missing attributes', (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const attributes = {one: {path: 'values.first'}}
  const type = datatype({attributes: {one: {}}})
  const item = itemMapper({type: 'entry', attributes}, {datatype: type})

  t.notThrows(() => {
    item.toSource(data)
  })
})

test('toSource should map id', (t) => {
  const data = {id: 'item1', type: 'entry'}
  const attributes = {id: {path: 'key'}}
  const type = datatype({attributes: {id: {}}})
  const item = itemMapper({type: 'entry', attributes}, {datatype: type})

  const ret = item.toSource(data)

  t.is(ret.key, 'item1')
})

test('toSource should map type', (t) => {
  const data = {id: 'item1', type: 'entry', attributes: {othertype: 'other'}}
  const attributes = {othertype: {path: 'type'}}
  const type = datatype({id: 'entry', attributes: {othertype: 'string'}})
  const item = itemMapper({type: 'entry', attributes}, {datatype: type})

  const ret = item.toSource(data)

  t.is(ret.type, 'other')
})

test('toSource should map createdAt and updatedAt', (t) => {
  const createdAt = new Date('2016-11-01')
  const updatedAt = new Date('2016-11-13')
  const data = {id: 'item1', type: 'entry', createdAt, updatedAt}
  const attributes = {
    createdAt: {path: 'createdDate'},
    updatedAt: {path: 'updatedDate'}
  }
  const type = datatype({attributes: {createdAt: {}, updatedAt: {}}})
  const item = itemMapper({type: 'entry', attributes}, {datatype: type})

  const ret = item.toSource(data)

  t.truthy(ret.createdDate)
  t.is(ret.createdDate.getTime(), createdAt.getTime())
  t.truthy(ret.updatedDate)
  t.is(ret.updatedDate.getTime(), updatedAt.getTime())
})

test('toSource should map relationships', (t) => {
  const data = {id: 'ent1', type: 'entry', relationships: {comments: {id: 'no1', type: 'comment'}}}
  const type = datatype({relationships: {comments: {type: 'comment'}}})
  const relationships = {comments: {path: 'item.note'}}
  const item = itemMapper({type: 'entry', relationships}, {datatype: type})

  const ret = item.toSource(data)

  t.truthy(ret)
  t.deepEqual(ret.item, {note: 'no1'})
})

test('toSource should map relationships array', (t) => {
  const data = {
    id: 'ent1',
    type: 'entry',
    relationships: {comments: [
      {id: 'no1', type: 'comment'},
      {id: 'no3', type: 'comment'}
    ]}
  }
  const type = datatype({relationships: {comments: 'comment'}})
  const relationships = {comments: {path: 'item.notes'}}
  const item = itemMapper({type: 'entry', relationships}, {datatype: type})

  const ret = item.toSource(data)

  t.truthy(ret)
  t.deepEqual(ret.item, {notes: ['no1', 'no3']})
})

test('toSource should map relationships', (t) => {
  const data = {id: 'ent1', type: 'entry', relationships: {comments: {id: 'no1', type: 'comment'}}}
  const type = datatype({relationships: {comments: 'comment'}})
  const format = [{to: (value) => 'com_' + value}]
  const relationships = {comments: {path: 'item.note', format}}
  const item = itemMapper({type: 'entry', relationships}, {datatype: type})

  const ret = item.toSource(data)

  t.truthy(ret)
  t.deepEqual(ret.item, {note: 'com_no1'})
})

test('toSource should not throw on missing relationships', (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const type = datatype({relationships: {comments: 'comment'}})
  const relationships = {comments: {path: 'item.note'}}
  const item = itemMapper({type: 'entry', relationships}, {datatype: type})

  t.notThrows(() => {
    item.toSource(data)
  })
})

test('toSource should include default values', (t) => {
  const data = {id: 'ent1', type: 'entry', attributes: {one: 1}}
  const type = datatype({
    attributes: {one: 'integer', two: {type: 'integer', default: 3}},
    relationships: {author: {type: 'user', default: 'admin'}}
  })
  const attributes = {one: 'values.first', two: 'values.second.value'}
  const relationships = {author: 'values.writer'}
  const item = itemMapper({type: 'entry', attributes, relationships}, {datatype: type})
  const expected = {values: {first: 1, second: {value: 3}, writer: 'admin'}}

  const ret = item.toSource(data, {useDefaults: true})

  t.deepEqual(ret, expected)
})

test('toSource should transform item', (t) => {
  const data = {id: 'ent1', type: 'entry', attributes: {one: 1}}
  const attributes = {one: {path: 'values.first'}}
  const type = datatype({attributes: {one: {}}})
  const transformers = {
    first: {to: (item) => Object.assign({}, item, {title: 'First was here'})}
  }
  const transform = ['first']
  const item = itemMapper({type: 'entry', attributes, transform}, {datatype: type, transformers})

  const ret = item.toSource(data)

  t.truthy(ret)
  t.is(ret.title, 'First was here')
})

test('toSource should return null when filter returns false', (t) => {
  const data = {id: 'ent1', type: 'entry', attributes: {one: 1}}
  const attributes = {
    one: {path: 'values.first'}
  }
  const type = datatype({attributes: {one: 'integer'}})
  const path = 'item'
  const filterTo = [() => true, () => false]
  const item = itemMapper({type: 'entry', path, attributes, filterTo}, {datatype: type})

  const ret = item.toSource(data, {old: true})

  t.is(ret, null)
})

test('toSource should use data as item when no attr/rel mappers', (t) => {
  const data = {
    id: 'item',
    type: 'other',
    createdAt: new Date(),
    updatedAt: new Date(),
    attributes: {title: 'Other entry'},
    relationships: {author: {id: 'theman', type: 'user'}}
  }
  const dtype = datatype({
    id: 'other',
    attributes: {title: 'string'},
    relationships: {author: 'user'}
  })
  const item = itemMapper({type: '*'})

  const ret = item.toSource(data, {datatype: dtype})

  t.deepEqual(ret, data)
})

test('toSource should use transform when no attr/rel mappers', (t) => {
  const data = {id: 'item', type: 'other'}
  const transform = [
    {to: (item) => Object.assign({}, item, {custom: 'data'})}
  ]
  const dtype = datatype({id: 'other'})
  const item = itemMapper({type: '*', transform})

  const ret = item.toSource(data, {datatype: dtype})

  t.is(ret.id, 'item')
  t.is(ret.custom, 'data')
})

test('toSource should not throw when no datatype', (t) => {
  const data = {id: 'item', type: 'other'}
  const attributes = {title: 'title'}
  const item = itemMapper({type: '*', attributes})

  t.notThrows(() => {
    item.toSource(data)
  })
})
