// src/types/express.d.ts

declare global {
  namespace Express {
    interface Request {
      validated?:unknown;
    }
  }
}

export {};