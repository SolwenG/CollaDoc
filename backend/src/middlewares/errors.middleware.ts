import type { ErrorRequestHandler } from "express";
import { z } from "zod";
import { AppError } from "../errors/app-error.ts";
import type { ErrorCode } from "../errors/app-error.ts";

/** HTTP response format for every error returned by the API */
type ErrorBody = {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
};

function toErrorBody(err: AppError): ErrorBody {
  const body: ErrorBody = { error: { code: err.code, message: err.message } };
  if (err.details !== undefined) body.error.details = err.details;
  return body;
}

function normalizeError(err: unknown): AppError {
  if (err instanceof AppError) return err;

  if (err instanceof z.ZodError) {
    return new AppError(
      "VALIDATION_ERROR",
      "Données invalides",
      z.flattenError(err),
    );
  }

  if (isBodyParserError(err)) {
    return new AppError("VALIDATION_ERROR", "Corps de requête invalide");
  }

  return new AppError("INTERNAL_ERROR", "Erreur interne");
}

function isBodyParserError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "type" in err &&
    err.type === "entity.parse.failed"
  );
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const appError = normalizeError(err);
  if (appError.code === "INTERNAL_ERROR") console.error(err);
  res.status(appError.status).json(toErrorBody(appError));
};
