import { Raikiri } from '../src'

const foo = null

const router = new Raikiri()

router.add('GET', '/public/*', 'foo')
router.add('GET', '/public-aliased/*', 'foo')

// c
console.log(router.match('GET', '/public/takodachi.png'))

// router.add('GET', '/v1/genres/:id', '/g/:id')
// router.add('GET', '/v1/statuse', '/s')
// router.add('GET', '/v1/statuse/:id', '/s/:id')

Bun.serve({
    port: 8080,
    fetch() {
        return new Response('A')
    }
})
