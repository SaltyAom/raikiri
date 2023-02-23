const COLON = 58
const WILDCARD = 42

interface RadixNode<T> {
    children: Map<string | number, RadixNode<T>>
    static?: Record<string, T>
    store?: T
    name?: string
}

const createNode = <T>(
    children: Record<string | number, RadixNode<T>> | null = null
): RadixNode<T> => {
    const node: RadixNode<T> = Object.create(null)

    node.children = new Map()
    if (children)
        for (const child in children) node.children.set(child, children[child])

    return node
}

export class Raikiri<T> {
    root: Record<string, RadixNode<T>> = {}

    add(method: string, path: string, store: T) {
        if (!(method in this.root)) this.root[method] = createNode()

        let node = this.root[method]
        const paths: string[] = ['/']

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
            if (!node.static) node.static = {}
            node.static[paths[0]] = store

            return
        }

        // Catch all root wildcard
        if (paths[1] === '*' && paths[0] === '/' && paths.length === 2) {
            const wildcardNode = createNode<T>()
            wildcardNode.store = store
            this.root[method].children.set(WILDCARD, wildcardNode)

            return
        }

        for (let i = 0; i < paths.length; i++) {
            const path = paths[i]
            const isLast = i === paths.length - 1
            let iterated = false

            for (const key of node.children.keys()) {
                let prefix: string | number = ''

                if (typeof key === 'string')
                    for (const [charIndex, charKey] of key
                        .split('')
                        .entries()) {
                        if (path[charIndex] === charKey) prefix += charKey
                        else break
                    }
                else prefix = 58

                if (!prefix) {
                    iterated = true
                    break
                }

                const prefixLength =
                    typeof prefix === 'number' ? 1 : prefix.length

                if (node.children.has(prefix)) {
                    iterated = true
                    node = node.children.get(prefix)!

                    const fracture = path.slice(prefixLength)

                    if (prefix !== path && prefix !== COLON) {
                        const part = path.slice(prefixLength)

                        iterated = true

                        if (!node.children.has(fracture))
                            if (
                                node.children.has(COLON) ||
                                node.children.has(WILDCARD)
                            ) {
                                // Move static above colon and wildcard
                                const ordered = new Map()

                                ordered.set(part, createNode<T>())

                                for (const [
                                    key,
                                    value
                                ] of node.children.entries())
                                    ordered.set(key, value)

                                node.children = ordered
                            } else {
                                node.children.set(part, createNode<T>())
                            }

                        if (isLast) {
                            if (!node.static) node.static = {}
                            node.static[part] = store
                        }

                        node = node.children.get(fracture)!
                    }

                    break
                }

                if (prefix && prefix !== '/' && prefix !== path) {
                    iterated = true

                    // Newly created path: is empty
                    const branch = path.slice(prefixLength)
                    const migrate =
                        typeof key === 'number' ? key : key.slice(prefixLength)

                    const branchNode = createNode<T>({
                        [migrate]: node.children.get(key)!,
                        [branch]: createNode()
                    })

                    node.children.delete(key)

                    if (migrate !== COLON) {
                        const migrateStore =
                            branchNode.children.get(migrate)?.store!

                        if (migrateStore) {
                            if (!branchNode.static) branchNode.static = {}
                            branchNode.static[migrate] = migrateStore
                        }
                    }

                    node.children.set(prefix, branchNode)

                    if (isLast && prefix !== COLON) {
                        if (!node.static) node.static = {}
                        node.static[path] = store
                    }
                }
            }

            if (iterated || !path) continue

            if (path.startsWith(':')) {
                const paramNode = createNode<T>()
                paramNode.name = path.slice(1)
                node.children.set(COLON, paramNode)
                node = paramNode
            } else if (isLast && path === '*') {
                node.children.set(WILDCARD, createNode())
                node = node.children.get(WILDCARD)!
            } else {
                if (isLast) {
                    if (!node.static) node.static = {}
                    node.static[path] = store
                }

                // Leaf for possible nested dynamic path
                node.children.set(path, createNode())
                node = node.children.get(path)!
            }
        }

        node.store = store
    }

    match = (method: string, path: string) => {
        let node = this.root[method]
        if (!node) return

        const root = node.static?.[path]
        if (root)
            return {
                store: root,
                params: {}
            }

        let params: { [key: string]: string } = {}
        let depth = 0

        find: while (true) {
            const children = node.children

            for (const fracture of children.keys()) {
                if (typeof fracture === 'number') {
                    if (fracture === COLON) {
                        node = children.get(COLON)!

                        const index = path.indexOf('/', depth + 1)
                        const value =
                            index === -1
                                ? path.slice(depth)
                                : path.slice(depth, index)

                        params[node.name!] = value

                        depth += value.length
                    }
                    // Since it's special characters and not : then it's wildcard
                    else {
                        params['*'] = path.slice(depth)

                        return {
                            store: children.get(WILDCARD)!.store,
                            params
                        }
                    }

                    // Special characters should all be matched above, abort if not
                    continue find
                }

                const current = depth + fracture.length
                const part = path.slice(depth, current)

                const root = node.static?.[part]
                if (root) {
                    /**
                     * Suppose there are:
                     * - /id/:id/name/:name
                     * - /id/:id/name/a
                     *
                     * Then if you pass in
                     * - /id/1/name/ame
                     *
                     * Since fracture is /a, path is /ame then part become /a
                     * It will be matched in node.static[part]
                     *
                     * This means we need to check path left by using current <= clear
                     */
                    if (current <= path.length - 2) continue

                    return {
                        store: root,
                        params
                    }
                }

                if (children.has(part)) {
                    node = children.get(part)!
                    depth += part.length
                    continue find
                }
            }

            break
        }

        if (node.store) return { store: node.store, params }
    }
}

export default Raikiri
