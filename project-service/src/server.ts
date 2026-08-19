import app from "./app/app.js"
import { startIdleReaper } from "./service/activity.service.js"


await startIdleReaper()

app.listen(3000,()=>{
    console.log("Project Server is running on port 3000")
})