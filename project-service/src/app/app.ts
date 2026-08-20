import express from "express"
import morgan from "morgan"
import router from "./index.routes.js"
import type { Request, Response, NextFunction } from "express"
import { createProxyMiddleware } from "http-proxy-middleware"
import { onPreviewReaped, recordActivity } from "../service/activity.service.js"


const app = express()

/** Cached proxy middleware per preview id, keyed by `uniqueId`. */
const proxyMap: { [key: string]: Function } = {}
const proxyMapForFiles: { [key: string]: Function } = {}

// A reaped preview's service no longer exists, so its cached proxy must go too.
onPreviewReaped((uniqueId) => {
    delete proxyMap[uniqueId]
})

/**
 * Returns the proxy that forwards to a preview's Kubernetes service, creating
 * and caching it on first use.
 *
 * @param uniqueId Preview id taken from the request subdomain.
 */
function getProxy(uniqueId: string) {

    if (proxyMap[uniqueId]) {
        return proxyMap[uniqueId]
    }

    const targetUrl = `http://nextjs-service-${uniqueId}`

    const proxyMiddleware = createProxyMiddleware({
        target: targetUrl,
        changeOrigin: true,
        pathRewrite: {
            '^/': '/', // Rewrite the path if needed
        },
    })

    proxyMap[uniqueId] = proxyMiddleware

    return proxyMiddleware

}


function getProxyForFiles(uniqueId: string) {

    if (proxyMapForFiles[uniqueId]) {
        return proxyMapForFiles[uniqueId]
    }

    const targetUrl = `http://nextjs-service-${uniqueId}:8000`

    const proxyMiddleware = createProxyMiddleware({
        target: targetUrl,
        changeOrigin: true,
        pathRewrite: {
            '^/': '/', // Rewrite the path if needed
        },
    })

    proxyMapForFiles[uniqueId] = proxyMiddleware

    return proxyMiddleware

}


app.use(morgan("dev"))

/**
 * Routes preview traffic to its pod.
 *
 * Requests on a `*.preview.*` host are proxied to the matching Kubernetes
 * service; every such request also refreshes the preview's Redis activity key,
 * which is what keeps the idle reaper from tearing the pod down. Any other host
 * falls through to the regular API routes.
 */
app.use((req: Request, res: Response, next: NextFunction) => {

    const host = req.headers.host || ""

    console.log("Host:", host)

    if (!host.includes("preview") && !host.includes("file-system")) {
        return next()
    }

    const subdomains = host.split(".")

    const uniqueId = subdomains[0]

    if (!uniqueId) {
        return res.status(400).json({
            message: "Invalid preview URL"
        })
    }

    void recordActivity(uniqueId)


    if (host.includes("file-system")) {
        recordActivity(uniqueId)
        return getProxyForFiles(uniqueId)(req, res, next)
    }
    
    return getProxy(uniqueId)(req, res, next)
})


app.use('/api/projects', router)

app.get("/_status/healthz", (req: Request, res: Response) => {
    res.status(200).json({
        message: "Server is Healthy"
    })
})

app.get("/_status/readyz", (req: Request, res: Response) => {
    res.status(200).json({
        message: "Server is Healthy"
    })
})


export default app