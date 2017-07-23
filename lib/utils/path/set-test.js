import test from 'ava'

import set from './set'

test('should exist', (t) => {
  t.is(typeof set, 'function')
})

test('should return value when no path', (t) => {
  const path = null
  const value = 'Someone'
  const expected = 'Someone'

  const ret = set({}, path, value)

  t.deepEqual(ret, expected)
})

test('should return value when empty path', (t) => {
  const path = []
  const value = 'Someone'
  const expected = 'Someone'

  const ret = set({}, path, value)

  t.deepEqual(ret, expected)
})

test('should set meta.author', (t) => {
  const path = ['meta', 'author']
  const value = 'Someone'
  const expected = {
    meta: {
      author: 'Someone'
    }
  }

  const ret = set({}, path, value)

  t.deepEqual(ret, expected)
})

test('should set meta.author on existing object', (t) => {
  const path = ['meta', 'author']
  const value = 'Someone'
  const object = {
    meta: {
      subject: 'Something'
    }
  }
  const expected = {
    meta: {
      subject: 'Something',
      author: 'Someone'
    }
  }

  const ret = set(object, path, value)

  t.deepEqual(ret, expected)
})

test('should set meta.author by replacing value', (t) => {
  const path = ['meta', 'author']
  const value = 'Someone'
  const object = {
    meta: {
      subject: 'Something',
      author: 'No one'
    }
  }
  const expected = {
    meta: {
      subject: 'Something',
      author: 'Someone'
    }
  }

  const ret = set(object, path, value)

  t.deepEqual(ret, expected)
})

test('should set data.items[]', (t) => {
  const path = ['data', {prop: 'items', type: 'all', spread: true}]
  const value = [{id: 'item1'}, {id: 'item2'}]
  const expected = {
    data: {
      items: [
        {id: 'item1'},
        {id: 'item2'}
      ]
    }
  }

  const ret = set({}, path, value)

  t.deepEqual(ret, expected)
})

test('should set data.items[] on existing array', (t) => {
  const path = ['data', {prop: 'items', type: 'all', spread: true}]
  const value = [{id: 'item1'}, {id: 'item2'}]
  const object = {data: {items: []}}
  const expected = {
    data: {
      items: [
        {id: 'item1'},
        {id: 'item2'}
      ]
    }
  }

  const ret = set(object, path, value)

  t.deepEqual(ret, expected)
})

test('should set data.items[] on existing array with objects', (t) => {
  const path = ['data', {prop: 'items', type: 'all', spread: true}]
  const value = [{id: 'item1'}, {id: 'item2'}]
  const object = {data: {items: [{id: 'item3'}]}}
  const expected = {
    data: {
      items: [
        {id: 'item1'},
        {id: 'item2'}
      ]
    }
  }

  const ret = set(object, path, value)

  t.deepEqual(ret, expected)
})

test('should set data.items on existing array with objects', (t) => {
  const path = ['data', 'items']
  const value = [{id: 'item1'}, {id: 'item2'}]
  const object = {data: {items: [{id: 'item3'}]}}
  const expected = {
    data: {
      items: [
        {id: 'item1'},
        {id: 'item2'}
      ]
    }
  }

  const ret = set(object, path, value)

  t.deepEqual(ret, expected)
})

test('should set data.items[].title', (t) => {
  const path = ['data', {prop: 'items', type: 'all', spread: true}, 'title']
  const value = 'Item 1'
  const expected = {
    data: {
      items: [
        {title: 'Item 1'}
      ]
    }
  }

  const ret = set({}, path, value)

  t.deepEqual(ret, expected)
})

test('should set data.items[].title on existing array with object', (t) => {
  const path = ['data', {prop: 'items', type: 'all', spread: true}, 'title']
  const value = ['Item 1']
  const object = {data: {items: [{title: 'Item 2'}]}}
  const expected = {
    data: {
      items: [
        {title: 'Item 1'}
      ]
    }
  }

  const ret = set(object, path, value)

  t.deepEqual(ret, expected)
})

test('should set data.items[1].title', (t) => {
  const path = ['data', {prop: 'items', type: 'one', index: 1}, 'title']
  const value = 'Item 1'
  const expected = {data: {items: [
    undefined,
    {title: 'Item 1'}
  ]}}

  const ret = set({}, path, value)

  t.deepEqual(ret, expected)
})

test('should set data.items[-1].title', (t) => {
  const path = ['data', {prop: 'items', type: 'one', index: -1}, 'title']
  const value = 'Item 1'
  const expected = {data: {items: [
    {title: 'Item 1'}
  ]}}

  const ret = set({}, path, value)

  t.deepEqual(ret, expected)
})

test('should set data.items[1:3].title', (t) => {
  const path = ['data', {prop: 'items', type: 'range', begin: 1, end: 3, spread: true}, 'title']
  const value = ['Item 2', 'Item 3']
  const expected = {
    data: {
      items: [
        {title: 'Item 2'},
        {title: 'Item 3'}
      ]
    }
  }

  const ret = set({}, path, value)

  t.deepEqual(ret, expected)
})

test('should set data.items[0].tags[0]', (t) => {
  const path = ['data', {prop: 'items', type: 'one', index: 0}, {prop: 'tags', type: 'one', index: 0}]
  const value = 'one'
  const expected = {
    data: {
      items: [
        {tags: ['one']}
      ]
    }
  }

  const ret = set({}, path, value)

  t.deepEqual(ret, expected)
})

test('should set data.items[].tags[0]', (t) => {
  const path = ['data', {prop: 'items', type: 'all', spread: true}, {prop: 'tags', type: 'one', index: 0, sub: true}]
  const value = ['one', 'two', 'three', 'four']
  const expected = {
    data: {
      items: [
        {tags: ['one']},
        {tags: ['two']},
        {tags: ['three']},
        {tags: ['four']}
      ]
    }
  }

  const ret = set({}, path, value)

  t.deepEqual(ret, expected)
})

test('should set data.items[].tags[]', (t) => {
  const path = ['data', {prop: 'items', type: 'all'}, {prop: 'tags', type: 'all', sub: true, spread: true}]
  const value = ['one', 'two', 'three', 'four']
  const expected = {
    data: {
      items: [
        {tags: ['one', 'two', 'three', 'four']}
      ]
    }
  }

  const ret = set({}, path, value)

  t.deepEqual(ret, expected)
})

test('should set data.items[].tags[] on existing items array', (t) => {
  const path = ['data', {prop: 'items', type: 'all'}, {prop: 'tags', type: 'all', sub: true, spread: true}]
  const value = ['one', 'two', 'three', 'four']
  const object = {data: {items: []}}
  const expected = {
    data: {
      items: [
        {tags: ['one', 'two', 'three', 'four']}
      ]
    }
  }

  const ret = set(object, path, value)

  t.deepEqual(ret, expected)
})

test('should set data.items[].tags[] on existing tags array', (t) => {
  const path = ['data', {prop: 'items', type: 'all'}, {prop: 'tags', type: 'all', sub: true, spread: true}]
  const value = ['one', 'two', 'three', 'four']
  const object = {data: {items: [{tags: []}]}}
  const expected = {
    data: {
      items: [
        {tags: ['one', 'two', 'three', 'four']}
      ]
    }
  }

  const ret = set(object, path, value)

  t.deepEqual(ret, expected)
})

test('should set data.items[*].tags[]', (t) => {
  const path = ['data', {prop: 'items', type: 'all', spread: true}, {prop: 'tags', type: 'all', sub: true}]
  const value = ['one', 'two', 'three', 'four']
  const expected = {
    data: {
      items: [
        {tags: ['one']},
        {tags: ['two']},
        {tags: ['three']},
        {tags: ['four']}
      ]
    }
  }

  const ret = set({}, path, value)

  t.deepEqual(ret, expected)
})

test('should set data.items[*].tags[] on exist items array', (t) => {
  const path = ['data', {prop: 'items', type: 'all', spread: true}, {prop: 'tags', type: 'all', sub: true}]
  const value = ['one', 'two', 'three', 'four']
  const object = {data: {items: [{id: 'item1'}]}}
  const expected = {
    data: {
      items: [
        {id: 'item1', tags: ['one']},
        {tags: ['two']},
        {tags: ['three']},
        {tags: ['four']}
      ]
    }
  }

  const ret = set(object, path, value)

  t.deepEqual(ret, expected)
})

test('should set data.items[tags[]="odd"]', (t) => {
  const path = ['data', {prop: 'items', type: 'filter', path: [{prop: 'tags', type: 'all'}], value: 'odd', spread: true}]
  const value = [{id: 'item1'}, {id: 'item3'}]
  const expected = {
    data: {
      items: [
        {id: 'item1'},
        {id: 'item3'}
      ]
    }
  }

  const ret = set({}, path, value)

  t.deepEqual(ret, expected)
})
