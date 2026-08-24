import express from 'express';
import morgan from 'morgan';
import router from './index.routes.js';


const app = express();

app.use(morgan('dev'));
app.use(express.json());


app.use('/api/ai', router);

app.get("/_status/healthz", (req, res) => {
    res.status(200).json({
        status: "ok",
    });
});

app.get("/_status/readyz", (req, res) => {
    res.status(200).json({
        status: "ok",
    });
});


export default app;