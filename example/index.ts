import { Raikiri } from '../src'

const router = new Raikiri()

// router.add('GET', '/api/search/:term', '/api/search/:term')
router.add('GET', '/api/abc/view/:id', '/api/abc/view/:id')
router.add(
    'GET',
    '/api/abc/:type',
    '/api/abc/:type'
)

console.log('GOT', router.match('GET', '/api/abc/type'))
