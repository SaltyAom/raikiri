interface RadixNode<T> {
    children: Map<string, RadixNode<T>>
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

        // Remove trailing slash
        if (path !== '/')
            paths[paths.length - 1] = paths[paths.length - 1].slice(
                0,
                paths[paths.length - 1].length - 1
            )

        if (paths.length > 1 && paths[paths.length - 1] === '') paths.pop()

        // Single path is always static
        if (paths.length === 1) {
            if (!node.static) node.static = {}
            node.static[paths[0]] = store

            return
        }

        for (let i = 0; i < paths.length; i++) {
            const path = paths[i]
            const isLast = i === paths.length - 1
            let iterated = false

            // console.log(path)

            // If done correctly, there should be only 1 static key
            for (const key of node.children.keys()) {
                let prefix = ''

                for (const [charIndex, charKey] of key.split('').entries()) {
                    if (path[charIndex] === charKey) prefix += charKey
                    else break
                }

                if (!prefix) {
                    iterated = true
                    break
                }

                if (node.children.has(prefix)) {
                    iterated = true
                    node = node.children.get(prefix)!

                    const fracture = path.slice(prefix.length)

                    if (prefix !== path && !prefix.startsWith(':')) {
                        const part = path.slice(prefix.length)

                        if (!node.children.has(fracture))
                            node.children.set(part, createNode<T>())

                        if (!node.static) node.static = {}
                        node.static[part] = store

                        node = node.children.get(fracture)!
                    }

                    break
                }

                if (prefix && prefix !== '/' && prefix !== path) {
                    iterated = true

                    let branchNode = createNode<T>()
                    const migrate = key.slice(prefix.length)
                    branchNode.children.set(migrate, {
                        ...node.children.get(key)!
                    })
                    node.children.delete(key)

                    if (!migrate.includes(':')) {
                        if (!node.static) node.static = {}
                        node.static[migrate] =
                            branchNode.children.get(migrate)?.store!
                    }

                    // Newly created path: is empty
                    const branch = path.slice(prefix.length)
                    branchNode.children.set(branch, createNode<T>())
                    node.children.set(prefix, branchNode)

                    if (isLast && !prefix.startsWith(':')) {
                        if (!node.static) node.static = {}
                        node.static[path] = store
                    }
                }
            }

            if (iterated || !path) continue

            if (path.startsWith(':')) {
                const paramNode = createNode<T>()
                paramNode.name = path.slice(1)
                node.children.set(':', paramNode)
                node = paramNode
            } else if (isLast && path === '*') {
                node.children.set('*', createNode())
                node = node.children.get(path)!
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

    match(method: string, path: string) {
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

        while (depth <= path.length - 1) {
            let isEnd = true
            const children = node.children

            for (const fracture of children.keys()) {
                const length = depth + fracture.length
                const part = path.slice(depth, length)

                const root = node.static?.[part]
                if (root && length > path.length - 2) {
                    return {
                        store: root,
                        params
                    }
                }

                if (children.has(part) && fracture !== ':') {
                    node = children.get(part)!
                    depth += part.length
                    isEnd = false
                    break
                }

                if (children.has(':')) {
                    const index = path.indexOf('/', depth + 1)
                    const value =
                        index === -1
                            ? path.slice(depth)
                            : path.slice(depth, index)

                    node = children.get(':')!
                    params[node.name!] = value

                    // console.log('dyn', node.name, value)

                    depth += value.length
                    isEnd = false
                    break
                }

                if (children.has('*')) {
                    params['*'] = path.slice(depth)

                    return {
                        store: node.children.get('*')!.store,
                        params
                    }
                }
            }

            if (isEnd) break
        }

        if (depth > path.length - 2) {
            const store = node.store

            if (store) {
                return { store: node.store, params }
            }
        }
    }
}

export default Raikiri
