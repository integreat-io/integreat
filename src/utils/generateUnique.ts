import { nanoid } from 'nanoid'

import type { GenerateUnique } from '../types.js'

/**
 * The default generator of unique ids, used when no `generateUnique` function
 * is provided in the resources. Uses `nanoid`.
 */
const generateUnique: GenerateUnique = () => nanoid()

export default generateUnique
