import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes.js';
import roomRoutes from './routes/rooms.routes.js';
import bookingRoutes from './routes/booking.routes.js'
import { errorHandler } from './utils/errorHandler.js';
import swaggerUi from 'swagger-ui-express';
import { openapiDocument } from './docs/openApi.js';


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
app.use('/api/rooms', roomRoutes);
app.use('/api/booking', bookingRoutes);
app.use(errorHandler);
if (openapiDocument) {
    app.get('/openapi.json', (_req, res) => {
      res.json(openapiDocument);
    });
  
    app.use(
      '/docs',
      helmet({ contentSecurityPolicy: false }),
      swaggerUi.serve,
      swaggerUi.setup(null, {
        swaggerOptions: { url: '/openapi.json' },
      }),
    );
  }