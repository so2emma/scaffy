import { Router } from 'express';
<#list preparedEntities as entity>
import ${entity.name?uncap_first}Route from './${entity.name?uncap_first}Route';
</#list>

const router = Router();

<#list preparedEntities as entity>
router.use('/${entity.name?lower_case}s', ${entity.name?uncap_first}Route);
</#list>

export default router;
