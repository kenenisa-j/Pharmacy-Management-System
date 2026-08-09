import dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

if (!process.env.PORT) {
    console.warn("⚠️ PORT not specified in environment variables, defaulting to 5000");
}

export const env = {
    port: Number(PORT),
    nodeEnv: NODE_ENV,
};