import { Request, Response } from 'express';
import { ordersService } from './orders.service';

export const ordersController = {
  async create(req: Request, res: Response) {
    const order = await ordersService.create(req.user!.sub, req.body);
    res.status(201).json({ data: order });
  },
  async list(req: Request, res: Response) {
    res.json(await ordersService.list(req.query as never));
  },
  async getOne(req: Request, res: Response) {
    res.json({ data: await ordersService.getById(Number(req.params.id)) });
  },
  async updateStatus(req: Request, res: Response) {
    const order = await ordersService.updateStatus(Number(req.params.id), req.body.status, req.user!.sub);
    res.json({ data: order });
  },
};
