import app from './app/app.js';
import { connectToMessageBroker, setupConsumers } from './service/broker.service.js';
import { connectDatabase } from './config/database.js';





await connectToMessageBroker();
await connectDatabase();
await setupConsumers();


app.listen(3001, () => {
    console.log('AI service is running on port 3001');
})