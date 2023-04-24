import { Raikiri } from '../src'

import { describe, expect, it } from 'bun:test'
import { execPath } from 'process'

const router = new Raikiri()
router.add('GET', '/abc', '/abc')
router.add('GET', '/id/:id/book', 'book')
router.add('GET', '/id/:id/bowl', 'bowl')

router.add('GET', '/', '/')
router.add('GET', '/id/:id', '/id/:id')
router.add('GET', '/id/:id/abc/def', '/id/:id/abc/def')
router.add('GET', '/id/:id/abd/efd', '/id/:id/abd/efd')
router.add('GET', '/id/:id/name/:name', '/id/:id/name/:name')
router.add('GET', '/id/:id/name/a', '/id/:id/name/a')
router.add('GET', '/dynamic/:name/then/static', '/dynamic/:name/then/static')
router.add('GET', '/deep/nested/route', '/deep/nested/route')
router.add('GET', '/rest/*', '/rest/*')

describe('Raikiri', () => {
    it('match root', () => {
        expect(router.match('GET', '/')).toEqual({
            store: '/',
            params: {}
        })
    })

    it('get path parameter', () => {
        expect(router.match('GET', '/id/1')).toEqual({
            store: '/id/:id',
            params: {
                id: '1'
            }
        })
    })

    it('get multiple path parameters', () => {
        expect(router.match('GET', '/id/1/name/name')).toEqual({
            store: '/id/:id/name/:name',
            params: {
                id: '1',
                name: 'name'
            }
        })
    })

    it('get deep static route', () => {
        expect(router.match('GET', '/deep/nested/route')).toEqual({
            store: '/deep/nested/route',
            params: {}
        })
    })

    it('match wildcard', () => {
        expect(router.match('GET', '/rest/a/b/c')).toEqual({
            store: '/rest/*',
            params: {
                '*': 'a/b/c'
            }
        })
    })

    it('handle mixed dynamic and static', () => {
        expect(router.match('GET', '/dynamic/param/then/static')).toEqual({
            store: '/dynamic/:name/then/static',
            params: {
                name: 'param'
            }
        })
    })

    it('handle static path in dynamic', () => {
        expect(router.match('GET', '/id/1/name/a')).toEqual({
            store: '/id/:id/name/a',
            params: {
                id: '1'
            }
        })
    })

    it('handle dynamic as fallback', () => {
        expect(router.match('GET', '/id/1/name/ame')).toEqual({
            store: '/id/:id/name/:name',
            params: {
                id: '1',
                name: 'ame'
            }
        })
    })

    it('wildcard on root path', () => {
        const router = new Raikiri()

        router.add('GET', '/a/b', 'ok')
        router.add('GET', '/*', 'all')

        expect(router.match('GET', '/a/b/c/d')).toEqual({
            store: 'all',
            params: {
                '*': 'a/b/c/d'
            }
        })

        expect(router.match('GET', '/')).toEqual({
            store: 'all',
            params: {
                '*': ''
            }
        })
    })

    it('can overwrite wildcard', () => {
        const router = new Raikiri()

        router.add('GET', '/', 'ok')
        router.add('GET', '/*', 'all')

        expect(router.match('GET', '/a/b/c/d')).toEqual({
            store: 'all',
            params: {
                '*': 'a/b/c/d'
            }
        })

        expect(router.match('GET', '/')).toEqual({
            store: 'ok',
            params: {}
        })
    })

    it('handle trailing slash', () => {
        const router = new Raikiri()

        router.add('GET', '/abc/def', 'A')
        router.add('GET', '/abc/def/', 'A')

        expect(router.match('GET', '/abc/def')).toEqual({
            store: 'A',
            params: {}
        })

        expect(router.match('GET', '/abc/def/')).toEqual({
            store: 'A',
            params: {}
        })
    })

    it('handle static prefix wildcard', () => {
        const router = new Raikiri()
        router.add('GET', '/a/b', 'ok')
        router.add('GET', '/*', 'all')

        expect(router.match('GET', '/a/b/c/d')).toEqual({
            store: 'all',
            params: {
                '*': 'a/b/c/d'
            }
        })

        expect(router.match('GET', '/')).toEqual({
            store: 'all',
            params: {
                '*': ''
            }
        })
    })

    // ? https://github.com/SaltyAom/raikiri/issues/2
    // Migrate from mei to ei should work
    it('dynamic root', () => {
        const router = new Raikiri()
        router.add('GET', '/', 'root')
        router.add('GET', '/:param', 'it worked')

        expect(router.match('GET', '/')).toEqual({
            store: 'root',
            params: {}
        })

        expect(router.match('GET', '/bruh')).toEqual({
            store: 'it worked',
            params: {
                param: 'bruh'
            }
        })
    })

    it('handle wildcard without static fallback', () => {
        const router = new Raikiri()
        router.add('GET', '/public/*', 'foo')
        router.add('GET', '/public-aliased/*', 'foo')

        expect(router.match('GET', '/public/takodachi.png')?.params['*']).toBe(
            'takodachi.png'
        )
        expect(
            router.match('GET', '/public/takodachi/ina.png')?.params['*']
        ).toBe('takodachi/ina.png')
    })

    it('restore mangled path', () => {
        const router = new Raikiri()

        router.add('GET', '/users/:userId', '/users/:userId')
        router.add('GET', '/game', '/game')
        router.add('GET', '/game/:gameId/state', '/game/:gameId/state')
        router.add('GET', '/game/:gameId', '/game/:gameId')

        expect(router.match('GET', '/game/1/state')?.store).toBe(
            '/game/:gameId/state'
        )
        expect(router.match('GET', '/game/1')?.store).toBe('/game/:gameId')
    })

    it('should be a ble to register param after same prefix', () => {
        const router = new Raikiri()

        router.add('GET', '/api/abc/view/:id', '/api/abc/view/:id')
        router.add('GET', '/api/abc/:type', '/api/abc/:type')

        expect(router.match('GET', '/api/abc/type')).toEqual({
            store: '/api/abc/:type',
            params: {
                type: 'type'
            }
        })

        expect(router.match('GET', '/api/abc/view/1')).toEqual({
            store: '/api/abc/view/:id',
            params: {
                id: '1'
            }
        })
    })

    it('use exact match for part', () => {
        const router = new Raikiri()

        router.add('GET', '/api/search/:term', '/api/search/:term')
        router.add('GET', '/api/abc/view/:id', '/api/abc/view/:id')
        router.add('GET', '/api/abc/:type', '/api/abc/:type')

        expect(router.match('GET', '/api/abc/type')?.store).toBe(
            '/api/abc/:type'
        )
        expect(router.match('GET', '/api/awd/type')).toBe(undefined)
    })
})
