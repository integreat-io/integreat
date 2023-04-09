import type { Definitions } from '../create.js'

const arrOrEmptyArr = <T>(arr?: T[]): T[] => (Array.isArray(arr) ? arr : [])

const mergeArrays = <T>(arr1?: T[], arr2?: T[]): T[] => [
  ...arrOrEmptyArr(arr1),
  ...arrOrEmptyArr(arr2),
]

const mergeDefs = (
  defs: Partial<Definitions>,
  def: Partial<Definitions>
): Definitions => ({
  ...defs,
  auths: mergeArrays(defs.auths, def.auths),
  schemas: mergeArrays(defs.schemas, def.schemas),
  services: mergeArrays(defs.services, def.services),
  mutations: { ...defs.mutations, ...def.mutations },
  dictionaries: { ...defs.dictionaries, ...def.dictionaries },
  jobs: mergeArrays(defs.jobs, def.jobs),
  identConfig: def.identConfig || defs.identConfig,
  queueService: def.queueService || defs.queueService,
})

export default function mergeDefinitions(
  ...defs: Partial<Definitions>[]
): Definitions {
  return defs.reduce<Definitions>(mergeDefs, {
    auths: [],
    schemas: [],
    services: [],
    mutations: {},
    dictionaries: {},
    jobs: [],
    identConfig: undefined,
    queueService: undefined,
  })
}
