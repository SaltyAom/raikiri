import { Raikiri } from '../src'

const router = new Raikiri()
router.add('GET', '/v1/genres', '/g')
router.add('GET', '/v1/genres/:id', '/g/:id')
router.add('GET', '/v1/statuse', '/s')
router.add('GET', '/v1/statuse/:id', '/s/:id')

console.log(router.root)

console.log(router.match('GET', '/v1/statuse/ia'))
