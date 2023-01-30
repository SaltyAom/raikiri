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
})
