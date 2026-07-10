import { Request, Response, NextFunction } from 'express';
import { ${name}Service } from '../services/${name?uncap_first}Service';
import { ApiError } from '../errors/apiError';

<#assign isNumericId = (primaryKeyType == "Long" || primaryKeyType == "Integer" || primaryKeyType == "Int")>

const service = new ${name}Service();

export class ${name}Controller {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await service.create(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const result = await service.findAll(page, limit);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = <#if isNumericId>Number(req.params.id)<#else>req.params.id</#if>;
      if (<#if isNumericId>isNaN(id)<#else>!id</#if>) {
        throw new ApiError(400, 'Invalid ID format');
      }
      const record = await service.findById(id);
      if (!record) {
        throw new ApiError(404, '${name} not found');
      }
      res.json(record);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = <#if isNumericId>Number(req.params.id)<#else>req.params.id</#if>;
      if (<#if isNumericId>isNaN(id)<#else>!id</#if>) {
        throw new ApiError(400, 'Invalid ID format');
      }
      const record = await service.update(id, req.body);
      res.json(record);
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = <#if isNumericId>Number(req.params.id)<#else>req.params.id</#if>;
      if (<#if isNumericId>isNaN(id)<#else>!id</#if>) {
        throw new ApiError(400, 'Invalid ID format');
      }
      await service.delete(id);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
}
