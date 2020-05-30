import { MapDefinition, CustomFunction, Dictionaries } from 'map-transform'
import { Schema } from '../schema'
import { Dictionary } from '../types'

const pipelinesFromSchemas = (
  schemas: Dictionary<Schema>
): Dictionary<MapDefinition> =>
  Object.entries(schemas).reduce(
    (pipelines, [id, def]) => ({ ...pipelines, [`cast_${id}`]: def.mapping }),
    {}
  )

export default function createMapOptions(
  schemas: Dictionary<Schema>,
  mutations?: Record<string, MapDefinition>,
  functions?: Dictionary<CustomFunction>,
  dictionaries?: Dictionaries
) {
  return {
    pipelines: {
      ...mutations,
      ...pipelinesFromSchemas(schemas),
    },
    functions,
    dictionaries,
  }
}
