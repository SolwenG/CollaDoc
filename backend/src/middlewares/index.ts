import express from 'express'

const jsonMiddleware = express.json();

export const globalMiddlewares = [jsonMiddleware,]
