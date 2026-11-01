import "dotenv/config"
import mongoose from "mongoose"
import { app } from "./app.js"
import { startKeepAlive } from "./utils/keepAlive.js"

const port = Number(process.env.PORT) || 3000;
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
    throw new Error("MONGODB_URI is not set. Check your .env file.");
}

async function start() {
    await mongoose.connect(mongoUri!, { dbName: 'study-room-booking' });
    console.log("Connected to MongoDB");

    app.listen(port, () => {
        console.log(`API listening on port ${port}`);
        startKeepAlive();
    })
}

start().catch((err) => {
    console.error("Failed to start:", err);
    process.exit(1);
})