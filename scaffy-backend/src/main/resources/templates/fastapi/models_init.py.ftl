# Import all models here so that Base.metadata.create_all works
from .base import Base
<#list preparedEntities as entity>
from .${toSnakeCase(entity.name)} import ${entity.name}
</#list>
