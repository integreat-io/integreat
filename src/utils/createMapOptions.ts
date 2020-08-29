import { MapDefinition, CustomFunction, Dictionaries } from 'map-transform'
import { Schema } from '../schema'
import { MapOptions } from '../service/types'

const pipelinesFromSchemas = (
  schemas: Record<string, Schema>
): Record<string, MapDefinition> =>
  Object.entries(schemas).reduce(
    (pipelines, [id, def]) => ({ ...pipelines, [`cast_${id}`]: def.mapping }),
    {}
  )

export default function createMapOptions(
  schemas: Record<string, Schema>,
  mutations?: Record<string, MapDefinition>,
  functions?: Record<string, CustomFunction>,
  dictionaries?: Dictionaries
): MapOptions {
  return {
    pipelines: {
      ...mutations,
      ...pipelinesFromSchemas(schemas),
    },
    functions,
    dictionaries,
  }
}