import { Raikiri } from '../src'

const router = new Raikiri()

router.add('GET', '/users/:userId', '/users/:userId')
router.add('GET', '/game', '/game')
router.add('GET', '/game/:gameId/state', '/game/:gameId/state')
router.add('GET', '/game/:gameId', '/game/:gameId')

console.log('GOT', router.match('GET', '/game/1/state'))
