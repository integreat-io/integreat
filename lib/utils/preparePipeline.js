/**
 * Prepare pipeline by replacing keys with functions or function objects from
 * the collection object, and remove anything that is not functions or function
 * objects.
 * @param {array} pipeline - The pipeline definition
 * @param {Object} collection - Object with pipeline function
 * @returns {array} Prepared pipeline
 */
function preparePipeline (pipeline, collection = {}) {
  if (!Array.isArray(pipeline)) {
    return []
  }

  const fromKey = (key) => collection[key.replace('[]', '')]

  const replaceWithFunction = (key) => (typeof key === 'string') ? fromKey(key) : key
  const isFunctionOrObject = (obj) => obj && ['function', 'object'].includes(typeof obj)

  return pipeline.map(replaceWithFunction).filter(isFunctionOrObject)
}

module.exports = preparePipeline
