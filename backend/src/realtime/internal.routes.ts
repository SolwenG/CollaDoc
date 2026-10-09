import { timingSafeEqual } from "node:crypto";
import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import * as z from "zod";
import { checkSessionToken } from "../auth/authenticate.ts";
import { AppError } from "../errors/app-error.ts";
import { leaveDocument } from "./collaboration.handlers.ts";
import { runInOrder } from "./document-queue.ts";
import { forgetDocument } from "./open-documents.ts";
import { documentRoom, userRoom } from "./socket.types.ts";
import type { CollabServer } from "./socket.types.ts";

const idSchema = z.coerce.number().int().positive();

function requireInternalSecret(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const expected = process.env["INTERNAL_SECRET"];
  const received = req.get("x-internal-secret");
  if (
    !expected ||
    !received ||
    received.length !== expected.length ||
    !timingSafeEqual(Buffer.from(received), Buffer.from(expected))
  ) {
    throw new AppError("FORBIDDEN", "Internal route");
  }
  next();
}

export function internalRoutes(io: CollabServer): Router {
  const router = Router();
  router.use(requireInternalSecret);

  router.post("/users/:userId/sessions-changed", async (req, res) => {
    const userId = idSchema.parse(req.params["userId"]);
    for (const socket of await io.in(userRoom(userId)).fetchSockets()) {
      const check = await checkSessionToken(socket.data.token);
      if (check.status !== "valid") socket.disconnect(true);
    }
    res.status(204).end();
  });

  router.post("/documents/:documentId/deleted", async (req, res) => {
    const documentId = idSchema.parse(req.params["documentId"]);
    const room = documentRoom(documentId);
    io.to(room).emit("document:closed", { documentId, reason: "DELETED" });
    for (const socket of await io.in(room).fetchSockets())
      socket.data.documentIds.delete(documentId);
    io.socketsLeave(room);
    await runInOrder(documentId, async () => forgetDocument(documentId));
    res.status(204).end();
  });

  router.post(
    "/documents/:documentId/members/:userId/revoked",
    async (req, res) => {
      const documentId = idSchema.parse(req.params["documentId"]);
      const userId = idSchema.parse(req.params["userId"]);
      const room = documentRoom(documentId);
      for (const socket of await io.in(userRoom(userId)).fetchSockets()) {
        if (!socket.rooms.has(room)) continue;
        socket.emit("document:closed", {
          documentId,
          reason: "ACCESS_REVOKED",
        });
        socket.leave(room);
        socket.data.documentIds.delete(documentId);
        await leaveDocument(socket.id, documentId);
      }
      res.status(204).end();
    },
  );

  return router;
}
