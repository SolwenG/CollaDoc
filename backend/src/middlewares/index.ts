import cookieParser from 'cookie-parser'
import express from 'express'

const jsonMiddleware = express.json();
const cookieMiddleware = cookieParser();

export const globalMiddlewares = [jsonMiddleware, cookieMiddleware]
