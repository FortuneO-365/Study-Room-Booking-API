import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import authRoutes from './routes/auth.routes.js';
import roomRoutes from './routes/rooms.routes.js';
import { errorHandler } from './utils/errorHandler.js';
import fs from 'node:fs';
import YAML from 'yaml';
import swaggerUi from 'swagger-ui-express';

const openApiDocument = YAML.parse(
    fs.readFileSync(new URL('./docs/openapi.yaml', import.meta.url), 'utf8'),
)

export const app = express();

app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN
}))
app.use(express.json());

app.get("/health", (req, res) => {
    res.status(200).json({ status : "OK"});
})

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes)
app.use(errorHandler);
app.use(
    '/docs',
    helmet({ contentSecurityPolicy: false}),
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument),
);
