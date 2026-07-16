import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ${name}Service } from './${entityFolder}.service';
import { ${name} } from './entities/${entityFolder}.entity';

describe('${name}Service', () => {
  let service: ${name}Service;
  let repository: jest.Mocked<Repository<${name}>>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    remove: jest.fn(),
<#if softDelete>
    softDelete: jest.fn(),
</#if>
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ${name}Service,
        {
          provide: getRepositoryToken(${name}),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<${name}Service>(${name}Service);
    repository = module.get(getRepositoryToken(${name}));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new ${name?uncap_first}', async () => {
      const dto = {};
      const entity = { ${primaryKeyName}: 1, ...dto } as any;
      mockRepository.create.mockReturnValue(entity);
      mockRepository.save.mockResolvedValue(entity);

      const result = await service.create(dto as any);

      expect(mockRepository.create).toHaveBeenCalledWith(dto);
      expect(mockRepository.save).toHaveBeenCalledWith(entity);
      expect(result).toEqual(entity);
    });
  });

  describe('findAll', () => {
    it('should return paginated results', async () => {
      const entities = [{ ${primaryKeyName}: 1 }] as any[];
      mockRepository.findAndCount.mockResolvedValue([entities, 1]);

      const result = await service.findAll(1, 10);

      expect(result.data).toEqual(entities);
      expect(result.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a ${name?uncap_first} by id', async () => {
      const entity = { ${primaryKeyName}: 1 } as any;
      mockRepository.findOne.mockResolvedValue(entity);

      const result = await service.findOne(1 as any);

      expect(result).toEqual(entity);
    });

    it('should throw NotFoundException if not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999 as any)).rejects.toThrow();
    });
  });

  describe('remove', () => {
    it('should remove a ${name?uncap_first}', async () => {
<#if softDelete>
      mockRepository.softDelete.mockResolvedValue({ affected: 1 } as any);
      await expect(service.remove(1 as any)).resolves.not.toThrow();
<#else>
      const entity = { ${primaryKeyName}: 1 } as any;
      mockRepository.findOne.mockResolvedValue(entity);
      mockRepository.remove.mockResolvedValue(entity);

      await expect(service.remove(1 as any)).resolves.not.toThrow();
</#if>
    });
  });
});
