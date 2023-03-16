import { Raikiri } from '../src'

const foo = null

const router = new Raikiri()
router.add('GET', '/abc/def', foo)
router.add('GET', '/name/:name/awd/awd/awd/awd/aaabbb/a/:awd/a', foo)
router.add('GET', '/name/:name/awd/awd/awd/awd/aaabcd/a/:awd/a', foo)

// c
console.log(router.root)

// router.add('GET', '/v1/genres/:id', '/g/:id')
// router.add('GET', '/v1/statuse', '/s')
// router.add('GET', '/v1/statuse/:id', '/s/:id')

Bun.serve({
    port: 8080,
    fetch() {
        return new Response("A")
    }
})