const COLON = 58
const WILDCARD = 42

interface RadixNode<T> {
    part: string
    static?: Record<string, T>
    children: Map<number, RadixNode<T>>
    store?: T
    param?: string
}

const unionChars = (target: string, value: string) => {
    let unioned = ''

    for (let i = 0; i < target.length; i++) {
        if (value[i] === target[i]) unioned += value[i]
        else break
    }

    return unioned
}

const createNode = <T>({
    children = null,
    part = '',
    static: staticChildren = null
}: {
    children?: Record<number, RadixNode<T>> | null
    part?: string
    static?: Record<string, T> | null
} = {}): RadixNode<T> => {
    const node: RadixNode<T> = Object.create(null)

    if (part) node.part = part

    node.children = new Map()
    if (children)
        for (const child of Object.keys(children))
            node.children.set(+child, children[+child])

    if (staticChildren) node.static = staticChildren

    return node
}

const createParamNode = <T>(
    param: string,
    children: Record<string | number, RadixNode<T>> | null = null,
    statiChildren: Record<string, T> | null = null
): RadixNode<T> => {
    const node: RadixNode<T> = Object.create(null)
    node.param = param

    node.children = new Map()
    if (children)
        for (const child of Object.keys(children))
            node.children.set(+child, children[+child])

    if (statiChildren) node.static = statiChildren

    return node
}

export class Raikiri<T> {
    root: Record<string, RadixNode<T>> = {}
    history: [string, string, T][] = []

    add(method: string, path: string, store: T) {
        this.history.push([method, path, store])

        if (!(method in this.root)) this.root[method] = createNode()

        let node = this.root[method]
        const paths: string[] = ['']

        path.split('/').forEach((part) => {
            if (!part) return

            if (part.startsWith(':') || part.startsWith('*')) {
                paths.push(part)
                paths.push('/')
                return
            }

            paths[paths.length - 1] += `${part}/`
        })

        if (!path.endsWith('/') && path !== '/') {
            paths[paths.length - 1] = paths[paths.length - 1].slice(
                0,
                paths[paths.length - 1].length - 1
            )
        }

        if (paths.length > 1 && paths[paths.length - 1] === '') paths.pop()

        // Single path is always static
        if (paths.length === 1) {
            const staticPath = '/' + paths[0]

            if (!node.static) node.static = {}
            node.static[staticPath] = store

            return
        }

        // Catch all root wildcard
        if (paths[1] === '*' && paths[0] === '/' && paths.length === 2) {
            const wildcardNode = createNode<T>()
            wildcardNode.store = store
            this.root[method].children.set(WILDCARD, wildcardNode)

            return
        }

        // console.log('>', path)
        operation: for (let i = 0; i < paths.length; i++) {
            const path = paths[i]
            const isLast = i === paths.length - 1

            for (const key of node.children.keys()) {
                const keyNode = node.children.get(key)!
                const keyPart = keyNode.part

                const unioned = unionChars(node.part, path)

                if (unioned === path) {
                    if (node.part !== path) {
                        const migrateNode = { ...node }
                        migrateNode.part = node.part.slice(path.length + 1)

                        const newNode = createNode<T>({
                            children: {
                                [node.part.charCodeAt(path.length)]: migrateNode
                            }
                        })

                        node.part = path
                        node.children = newNode.children

                        node
                    }

                    continue operation
                }

                if (
                    !unioned &&
                    (path.charCodeAt(0) === COLON ||
                        path.charCodeAt(0) === WILDCARD)
                )
                    continue

                if (unioned) {
                    const newKey = path.charCodeAt(unioned.length)

                    const migrateNode = node.children.get(key)!
                    const migratePart = node.part.slice(unioned.length + 1)
                    const migrateKey = node.part.charCodeAt(unioned.length)

                    const needMigrate = node.part !== unioned

                    if (needMigrate) {
                        const newChildNode = createNode<T>({
                            part: path.slice(unioned.length + 1)
                        })

                        node.part = unioned
                        node.children.set(newKey, newChildNode)

                        node.children.set(
                            migrateKey,
                            createNode({
                                part: migratePart,
                                children: {
                                    [key]: migrateNode
                                }
                            })
                        )

                        node.children.delete(key)
                        node = newChildNode
                    } else {
                        const candidate = node.children.get(newKey)!

                        // key has same prefix
                        if (candidate) {
                            const left = path.slice(unioned.length + 1)

                            // key is duplicated
                            if (left === candidate.part) {
                                node = candidate
                                continue operation
                            }

                            if (!candidate.part) {
                                node = candidate.children.get(key)!
                                continue operation
                            }

                            const migrateKey = candidate.part.charCodeAt(0)

                            const innerUnioned = unionChars(
                                left,
                                candidate.part
                            )

                            candidate.part = candidate.part.slice(
                                innerUnioned.length
                            )

                            const newNode = createNode<T>({
                                part: left.slice(innerUnioned.length)
                            })

                            node.children.set(
                                newKey,
                                createNode<T>({
                                    part: left.slice(0, -1),
                                    children: {
                                        [candidate.part.charCodeAt(
                                            innerUnioned.length - 1
                                        )]: candidate,
                                        [left.charCodeAt(
                                            innerUnioned.length - 1
                                        )]: newNode
                                    }
                                })
                            )

                            node = newNode

                            continue operation
                        }

                        if (isLast) break

                        const newChildNode = createNode<T>({
                            part: path.slice(unioned.length + 1)
                        })

                        node.children.set(newKey, newChildNode)

                        node = newChildNode
                    }
                } else if (node.part) {
                    const newChildNode = createNode<T>({
                        part: path.slice(1)
                    })

                    const migrateNode = { ...node }
                    migrateNode.part = migrateNode.part.slice(1)

                    const newNode = createNode<T>({
                        children: {
                            [node.part.charCodeAt(0)]: migrateNode,
                            [path.charCodeAt(0)]: newChildNode
                        }
                    })

                    node.part = ''
                    node.children = newNode.children
                    node = newChildNode
                } else {
                    if (node.children.size) {
                        if (!node.children.has(path.charCodeAt(0)))
                            node.children.set(
                                path.charCodeAt(0),
                                createNode<T>({
                                    part: path.slice(1)
                                })
                            )

                        node = node.children.get(path.charCodeAt(0))!
                    } else {
                        const newChildNode = createNode<T>({
                            part: path.slice(1)
                        })

                        node.children.set(path.charCodeAt(0), newChildNode)

                        node = newChildNode
                    }
                }

                continue operation
            }

            if (path.includes(':')) {
                if (node.children.has(COLON)) {
                    node = node.children.get(COLON)!
                    continue
                }

                // Is :<paramName>
                node.children.set(COLON, createParamNode<T>(path.slice(1)))
                node = node.children.get(COLON)!
            } else if (path.includes('*')) {
                node.children.set(WILDCARD, createNode())
                node = node.children.get(WILDCARD)!

                break operation
            } else {
                if (isLast) {
                    if (!node.static) node.static = {}
                    node.static[path] = store

                    return
                }

                node.part = path
            }

            continue
        }

        node.store = store
    }

    remove(_method: string, _path: string) {
        const router = new Raikiri<T>()

        for (let i = 0; i < this.history.length; i++) {
            const [method, path, store] = this.history[i]

            if (method === _method && path === _path) continue

            router.add(method, path, store)
        }

        this.history = router.history
        this.root = router.root
    }

    match(method: string, path: string) {
        const node = this.root[method]
        if (!node) return

        const root = node.static?.[path]
        if (root)
            return {
                store: root,
                params: {}
            }

        return iterateFirst(path, node, {})
    }

    private _m(method: string, path: string) {
        const node = this.root[method]
        if (!node) return

        return iterateFirst(path.slice(1), node, {})
    }
}

const iterateFirst = <T>(
    path: string,
    node: RadixNode<T>,
    params: Record<string, string>
):
    | {
          store: T
          params: Record<string, string>
      }
    | undefined => {
    path = path.slice(1)
    const child = node.children.get(path.charCodeAt(node.part?.length))

    if (node.part && path.slice(0, node.part.length) !== node.part) return

    if (!child) {
        const dynamic = node.children.get(COLON)
        if (dynamic) {
            const nextSlash = path.indexOf('/', node.part.length)

            if (nextSlash === -1) {
                params[dynamic.param!] = path.slice(node.part.length)

                if (dynamic.store)
                    return {
                        store: dynamic.store!,
                        params
                    }
                else return
            }

            params[dynamic.param!] = path.slice(node.part.length, nextSlash)

            return iterate(
                path.slice(nextSlash),
                node.children.get(COLON)!,
                params
            )
        } else if (node.children.has(WILDCARD)) {
            params['*'] = path.slice(node.part.length)

            const store = node.children.get(WILDCARD)!.store

            if (store)
                return {
                    store,
                    params
                }
            else return
        }

        if (node.store) {
            return {
                store: node.store,
                params
            }
        } else return
    }

    return iterate(path.slice(node.part.length + 1), child, params)
}

const iterate = <T>(
    path: string,
    node: RadixNode<T>,
    params: Record<string, string>
):
    | {
          store: T
          params: Record<string, string>
      }
    | undefined => {
    const store = node.static?.[path]
    if (store)
        return {
            store,
            params
        }

    if (node.part && path.slice(0, node.part.length) !== node.part) return

    const child = node.children.get(path.charCodeAt(node.part?.length))

    if (!child) {
        const dynamic = node.children.get(COLON)
        if (dynamic) {
            const nextSlash = path.indexOf('/', node.part?.length)

            if (nextSlash === -1) {
                params[dynamic.param!] = path.slice(node.part?.length)

                if (dynamic.store)
                    return {
                        store: dynamic.store,
                        params
                    }
                return
            }

            params[dynamic.param!] = path.slice(node.part?.length, nextSlash)

            return iterate(
                path.slice(nextSlash),
                node.children.get(COLON)!,
                params
            )
        } else if (node.children.has(WILDCARD)) {
            if (node.part) params['*'] = path.slice(node.part?.length)
            else params['*'] = path

            const store = node.children.get(WILDCARD)!.store

            if (store)
                return {
                    store,
                    params
                }
            else return
        }

        if (node.store) {
            return {
                store: node.store,
                params
            }
        } else return
    }

    return iterate(path.slice(node.part.length + 1), child, params)
}

export default Raikiri
