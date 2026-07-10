import { Router } from 'express';
import { ${name}Controller } from '../controllers/${name?uncap_first}Controller';

const router = Router();
const controller = new ${name}Controller();

router.post('/', (req, res, next) => controller.create(req, res, next));
router.get('/', (req, res, next) => controller.findAll(req, res, next));
router.get('/:id', (req, res, next) => controller.findById(req, res, next));
router.put('/:id', (req, res, next) => controller.update(req, res, next));
router.delete('/:id', (req, res, next) => controller.delete(req, res, next));

export default router;
