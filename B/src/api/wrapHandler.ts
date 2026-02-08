import type { Request, Response } from "express";

type AsyncRequestHandler = (req: Request, res: Response) => Promise<void>;
type SyncRequestHandler = (req: Request, res: Response) => void;

export function wrapHandler(fn: AsyncRequestHandler | SyncRequestHandler) {
  return (req: Request, res: Response): void => {
    Promise.resolve(fn(req, res)).catch((e: unknown) => {
      const message = e instanceof Error ? e.message : String(e);
      res.status(500).json({ success: false, error: message });
    });
  };
}
