import { Entity, Column, PrimaryGeneratedColumn, PrimaryColumn<#if hasRelations>, OneToMany, ManyToOne, ManyToMany, OneToOne, JoinColumn, JoinTable</#if><#if softDelete>, DeleteDateColumn</#if> } from 'typeorm';
<#list relationImports as imp>
import { ${imp} } from '../../${imp?uncap_first}/entities/${imp?uncap_first}.entity';
</#list>

@Entity('${tableName}')
export class ${name} {
<#list attributes as attr>
<#if attr.primaryKey>
<#if attr.type?lower_case == "uuid">
  @PrimaryGeneratedColumn('uuid')
  ${attr.name}: string;
<#elseif attr.type?lower_case == "long" || attr.type?lower_case == "integer" || attr.type?lower_case == "int">
  @PrimaryGeneratedColumn()
  ${attr.name}: number;
<#else>
  @PrimaryColumn()
  ${attr.name}: ${attr.tsType};
</#if>
<#else>
<#if attr.type?lower_case == "enum">
  @Column({ type: 'enum', enum: [<#list attr.enumValues as v>'${v}'<#if v?has_next>, </#if></#list>]<#if attr.nullable>, nullable: true</#if><#if attr.defaultValue??>, default: '${attr.defaultValue}'</#if> })
  ${attr.name}: string;
<#else>
  @Column(<#if attr.columnOptions != "">{ ${attr.columnOptions} }</#if>)
  ${attr.name}: ${attr.tsType};
</#if>
</#if>

</#list>
<#if softDelete>
  @DeleteDateColumn()
  deletedAt?: Date;

</#if>
<#list relations as rel>
<#if rel.relationType == "OneToMany">
  @OneToMany(() => ${rel.targetEntity}, (${rel.targetEntity?uncap_first}) => ${rel.targetEntity?uncap_first}.${rel.inverseSide})
  ${rel.fieldName}: ${rel.targetEntity}[];

<#elseif rel.relationType == "ManyToOne">
  @ManyToOne(() => ${rel.targetEntity}<#if rel.nullable>, { nullable: true }</#if>)
  @JoinColumn({ name: '${rel.joinColumnName}' })
  ${rel.fieldName}: ${rel.targetEntity};

  @Column(<#if rel.nullable>{ nullable: true }</#if>)
  ${rel.joinColumnName}: ${rel.joinColumnType};

<#elseif rel.relationType == "OneToOne">
<#if rel.isOwner>
  @OneToOne(() => ${rel.targetEntity}<#if rel.nullable>, { nullable: true }</#if>)
  @JoinColumn({ name: '${rel.joinColumnName}' })
  ${rel.fieldName}: ${rel.targetEntity};

  @Column(<#if rel.nullable>{ nullable: true }</#if><#if rel.isUnique> { unique: true }</#if>)
  ${rel.joinColumnName}: ${rel.joinColumnType};

<#else>
  @OneToOne(() => ${rel.targetEntity}, (${rel.targetEntity?uncap_first}) => ${rel.targetEntity?uncap_first}.${rel.inverseSide})
  ${rel.fieldName}: ${rel.targetEntity};

</#if>
<#elseif rel.relationType == "ManyToMany">
<#if rel.isOwner>
  @ManyToMany(() => ${rel.targetEntity})
  @JoinTable()
  ${rel.fieldName}: ${rel.targetEntity}[];

<#else>
  @ManyToMany(() => ${rel.targetEntity}, (${rel.targetEntity?uncap_first}) => ${rel.targetEntity?uncap_first}.${rel.inverseSide})
  ${rel.fieldName}: ${rel.targetEntity}[];

</#if>
</#if>
</#list>
}
