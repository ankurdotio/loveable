import app from "./app/app.js"
import { startIdleReaper } from "./service/activity.service.js"
import { connectDatabase } from "./config/database.js"
import { env } from "./config/env.js"


await connectDatabase()
await startIdleReaper()

app.listen(env.PORT,()=>{
    console.log(`Project Server is running on port ${env.PORT}`)
})