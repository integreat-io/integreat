require('dotenv').config()
const integreat = require('..')
const debug = require('debug')('great')

const defs = require('./defs')
const resources = integreat.resources()

const great = integreat(defs, resources)
debug('Integreat v' + great.version)

module.exports = great
