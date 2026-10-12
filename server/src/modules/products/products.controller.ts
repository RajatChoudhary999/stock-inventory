import { Request, Response } from 'express';
import { productsService } from './products.service';

export const productsController = {
  async list(req: Request, res: Response) {
    res.json(await productsService.list(req.query as never));
  },
  async lowStock(_req: Request, res: Response) {
    res.json({ data: await productsService.lowStock() });
  },
  async getOne(req: Request, res: Response) {
    res.json({ data: await productsService.getById(Number(req.params.id)) });
  },
  async create(req: Request, res: Response) {
    res.status(201).json({ data: await productsService.create(req.body) });
  },
  async update(req: Request, res: Response) {
    res.json({ data: await productsService.update(Number(req.params.id), req.body) });
  },
  async remove(req: Request, res: Response) {
    await productsService.remove(Number(req.params.id));
    res.status(204).send();
  },
  async adjustStock(req: Request, res: Response) {
    const result = await productsService.adjustStock(
      Number(req.params.id),
      req.user!.sub,
      req.body,
    );
    res.status(200).json({ data: result });
  },
  async getMovements(req: Request, res: Response) {
    res.json(await productsService.getMovements(undefined, req.query as never));
  },
  async getProductMovements(req: Request, res: Response) {
    res.json(await productsService.getMovements(Number(req.params.id), req.query as never));
  },
};

