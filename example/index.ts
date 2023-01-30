import Raikiri from '../src'

const router = new Raikiri()
// router.add('GET', '/abc', '/abc')
// router.add('GET', '/id/:id/book', 'book')
// router.add('GET', '/id/:id/bowl', 'bowl')

// router.add('GET', '/', '/')
// router.add('GET', '/id/:id', '/id/:id')
// router.add('GET', '/id/:id/abc/def', '/id/:id/abc/def')
// router.add('GET', '/id/:id/abd/efd', '/id/:id/abd/efd')
router.add('GET', '/id/:id/name/:name', '/id/:id/name/:name')
router.add('GET', '/id/:id/name/a', '/id/:id/name/a')
router.add('GET', '/*', 'ALL')
// router.add('GET', '/dynamic/:name/then/static', '/dynamic/:name/then/static')
// router.add('GET', '/deep/nested/route', '/deep/nested/route')
// router.add('GET', '/rest/*', '/rest/*')

// console.log(router.match('GET', '/id/1/name/a'))
// console.log(router.match('GET', '/id/1/name/ame'))
console.log(router.match('GET', '/'))

console.log(router)
