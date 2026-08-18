import express from "express"
import morgan from "morgan"
import router from "./index.routes.js"
import type { Request, Response, NextFunction } from "express"
import { createProxyMiddleware } from "http-proxy-middleware"


const app = express()

const proxyMap: { [key: string]: Function } = {}

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


app.use(morgan("dev"))

app.use((req: Request, res: Response, next: NextFunction) => {

    const host = req.headers.host || ""

    console.log("Host:", host)

    if (!host.includes("preview")) {
        return next()
    }

    const subdomains = host.split(".")

    const uniqueId = subdomains[0]

    if(!uniqueId){
        return res.status(400).json({
            message: "Invalid preview URL"
        })
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