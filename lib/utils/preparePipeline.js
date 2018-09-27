const { compose } = require('ramda')
const { transform, rev } = require('map-transform')

/**
 * Prepare pipeline by replacing keys with functions or function objects from
 * the collection object, and remove anything that is not functions or function
 * objects.
 * @param {array} pipeline - The pipeline definition
 * @param {Object} collection - Object with pipeline functions
 * @returns {array} Prepared pipeline
 */
function preparePipeline (pipeline, collection = {}) {
  pipeline = [].concat(pipeline)

  const fromKey = (key) => collection[key]
  const replaceWithFunction = (key) => (typeof key === 'string') ? fromKey(key) : key
  const isFunctionOrObject = (obj) => obj && ['function', 'object'].includes(typeof obj)

  return pipeline
    .map(replaceWithFunction)
    .filter(isFunctionOrObject)
}

/**
 * Prepare reverse pipeline by either running the `revPipeline` through the
 * regular preparePipeline() or – if `revPipeline` is not set - pick `.rev()`
 * functions from the `fwdPipeline`.
 * @param {array} revPipeline - The reverse pipeline definition or undefined
 * @param {array} fwdPipeline - A pipeline to pick `.rev()` from (already prepared)
 * @param {Object} collection - Object with pipeline functions
 * @returns {array} Prepared reverse pipeline
 */
function prepareRevPipeline (revPipeline, fwdPipeline, collection) {
  return (revPipeline)
    ? preparePipeline(revPipeline, collection).map(compose(rev, transform))
    : fwdPipeline.map((fn) => (fn.rev) ? rev(transform(fn.rev)) : null).filter(Boolean)
}

module.exports = { preparePipeline, prepareRevPipeline }
