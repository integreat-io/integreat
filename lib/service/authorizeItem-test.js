import test from 'ava'
import createItem from '../../tests/helpers/createItem'

import authorizeItem from './authorizeItem'

// Tests

test('should exist', (t) => {
  t.is(typeof authorizeItem, 'function')
})

test('should refuse if access is alreay refused', (t) => {
  const datatypes = {entry: {id: 'entry', access: {roleFromField: 'role'}}}
  const access = {
    status: 'refused',
    ident: {id: 'ident1'}
  }
  const data = createItem('ent1', 'entry', {role: 'admin'})

  const ret = authorizeItem(data, access, {datatypes})

  t.false(ret)
})

test('should authorize data with roleFromField', (t) => {
  const datatypes = {entry: {id: 'entry', access: {roleFromField: 'role'}}}
  const ident = {id: 'ident1', roles: ['admin']}
  const data = createItem('ent1', 'entry', {role: 'admin'})

  const ret = authorizeItem(data, {ident}, {datatypes})

  t.true(ret)
})

test('should refuse data with roleFromField', (t) => {
  const datatypes = {entry: {id: 'entry', access: {roleFromField: 'role'}}}
  const ident = {id: 'ident1'}
  const data = createItem('ent1', 'entry', {role: 'admin'})

  const ret = authorizeItem(data, {ident}, {datatypes})

  t.false(ret)
})

test('should authorize data with identFromField', (t) => {
  const datatypes = {entry: {id: 'entry', access: {identFromField: 'author'}}}
  const ident = {id: 'ident1'}
  const data = createItem('ent1', 'entry', undefined, {author: {id: 'ident1', type: 'user'}})

  const ret = authorizeItem(data, {ident}, {datatypes})

  t.true(ret)
})

test('should refuse data with identFromField', (t) => {
  const datatypes = {entry: {id: 'entry', access: {identFromField: 'author'}}}
  const ident = {id: 'ident2'}
  const data = createItem('ent1', 'entry', {author: 'ident1'})

  const ret = authorizeItem(data, {ident}, {datatypes})

  t.false(ret)
})

test('should grant when no scheme', (t) => {
  const datatypes = {entry: {id: 'entry'}}
  const ident = {id: 'ident1'}
  const data = createItem('ent1', 'entry')

  const ret = authorizeItem(data, {ident}, {datatypes})

  t.true(ret)
})

test('should refuse when no scheme and auth is required', (t) => {
  const datatypes = {entry: {id: 'entry'}}
  const ident = {id: 'ident1'}
  const data = createItem('ent1', 'entry')

  const ret = authorizeItem(data, {ident}, {datatypes, requireAuth: true})

  t.false(ret)
})

test('should authorize data null', (t) => {
  const datatypes = {entry: {id: 'entry', access: {roleFromField: 'role'}}}
  const ident = {id: 'ident1'}
  const data = null

  const ret = authorizeItem(data, {ident}, {datatypes})

  t.true(ret)
})

test('should authorize for specified action', (t) => {
  const access = {access: 'none', actions: {GET: {roleFromField: 'role'}}}
  const datatypes = {entry: {id: 'entry', access}}
  const ident = {id: 'ident1', roles: ['admin']}
  const data = createItem('ent1', 'entry', {role: 'admin'})

  const ret = authorizeItem(data, {ident}, {datatypes, action: 'GET'})

  t.true(ret)
})

test('should authorize root ident', (t) => {
  const access = {access: 'none', actions: {GET: {roleFromField: 'role'}}}
  const datatypes = {entry: {id: 'entry', access}}
  const ident = {root: true}
  const data = createItem('ent1', 'entry', {role: 'admin'})

  const ret = authorizeItem(data, {ident}, {datatypes, action: 'GET'})

  t.true(ret)
})

test('should grant when no datatype and not requireAuth', (t) => {
  const datatypes = {}
  const ident = {id: 'ident1'}
  const data = createItem('ent1', 'entry', {role: 'admin'})

  const ret = authorizeItem(data, {ident}, {datatypes})

  t.true(ret)
})

test('should refuse when no datatype and requireAuth', (t) => {
  const datatypes = {}
  const ident = {id: 'ident1'}
  const data = createItem('ent1', 'entry', {role: 'admin'})

  const ret = authorizeItem(data, {ident}, {datatypes, requireAuth: true})

  t.false(ret)
})
