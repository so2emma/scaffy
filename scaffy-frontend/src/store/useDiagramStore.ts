import { create } from 'zustand';
import { 
  Connection, 
  Edge, 
  EdgeChange, 
  Node, 
  NodeChange, 
  addEdge, 
  applyEdgeChanges, 
  applyNodeChanges 
} from '@xyflow/react';
import dagre from '@dagrejs/dagre';

export interface ValidationConfig {
  required: boolean;
  minSize: number | null;
  maxSize: number | null;
  email: boolean;
}

export interface Attribute {
  name: string;
  type: string;
  enumValues?: string[];
  primaryKey: boolean;
  nullable: boolean;
  unique: boolean;
  defaultValue: string | null;
  validation?: ValidationConfig;
}

export interface EntityData extends Record<string, any> {
  name: string;
  tableName: string;
  softDelete?: boolean;
  attributes: Attribute[];
}

export interface RelationshipConfig extends Record<string, any> {
  type: 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_ONE' | 'MANY_TO_MANY';
  fromField: string;
  toField: string;
  fromNullable: boolean;
  toNullable: boolean;
  cascade: string[];
  joinTable: string | null;
}

export type EntityNode = Node<EntityData>;

interface DiagramState {
  projectName: string;
  basePackage: string;
  nodes: EntityNode[];
  edges: Edge[];
  selectedEdgeId: string | null;
  theme: 'light' | 'dark';
  openApiSupport: boolean;
  generateTestStubs: boolean;
  flywayMigration: boolean;
  
  // History State
  past: Array<{ nodes: EntityNode[]; edges: Edge[] }>;
  future: Array<{ nodes: EntityNode[]; edges: Edge[] }>;
  
  setProjectName: (name: string) => void;
  setBasePackage: (pkg: string) => void;
  setOpenApiSupport: (enabled: boolean) => void;
  setGenerateTestStubs: (enabled: boolean) => void;
  setFlywayMigration: (enabled: boolean) => void;
  
  addEntity: (name: string, x: number, y: number) => void;
  updateEntityName: (nodeId: string, name: string) => void;
  updateEntityTableName: (nodeId: string, tableName: string) => void;
  updateEntitySoftDelete: (nodeId: string, enabled: boolean) => void;
  removeEntity: (nodeId: string) => void;
  
  addAttribute: (nodeId: string) => void;
  updateAttribute: (nodeId: string, attrIndex: number, updated: Partial<Attribute>) => void;
  updateAttributeValidation: (nodeId: string, attrIndex: number, validation: Partial<ValidationConfig>) => void;
  removeAttribute: (nodeId: string, attrIndex: number) => void;
  
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  
  setSelectedEdgeId: (edgeId: string | null) => void;
  updateRelationship: (edgeId: string, config: Partial<RelationshipConfig>) => void;
  removeRelationship: (edgeId: string) => void;

  getDiagramSchema: () => any;
  toggleTheme: () => void;

  // History & Layout Actions
  takeSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  autoLayout: () => void;
  importDiagram: (schema: any) => void;
}

export const useDiagramStore = create<DiagramState>((set, get) => ({
  projectName: 'MyProject',
  basePackage: 'com.example.project',
  nodes: [],
  edges: [],
  selectedEdgeId: null,
  theme: 'dark',
  openApiSupport: false,
  generateTestStubs: false,
  flywayMigration: false,
  
  past: [],
  future: [],

  setProjectName: (projectName) => set({ projectName }),
  setBasePackage: (basePackage) => set({ basePackage }),
  setOpenApiSupport: (openApiSupport) => set({ openApiSupport }),
  setGenerateTestStubs: (generateTestStubs) => set({ generateTestStubs }),
  setFlywayMigration: (flywayMigration) => set({ flywayMigration }),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),

  takeSnapshot: () => {
    const { nodes, edges, past } = get();
    // Deep clone to cut object reference bounds
    const snapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges))
    };
    const newPast = [...past, snapshot];
    if (newPast.length > 50) newPast.shift();
    set({ past: newPast, future: [] });
  },

  undo: () => set((state) => {
    if (state.past.length === 0) return {};
    const previous = state.past[state.past.length - 1];
    const newPast = state.past.slice(0, state.past.length - 1);
    return {
      past: newPast,
      future: [{ nodes: state.nodes, edges: state.edges }, ...state.future],
      nodes: previous.nodes,
      edges: previous.edges,
      selectedEdgeId: null
    };
  }),

  redo: () => set((state) => {
    if (state.future.length === 0) return {};
    const next = state.future[0];
    const newFuture = state.future.slice(1);
    return {
      past: [...state.past, { nodes: state.nodes, edges: state.edges }],
      future: newFuture,
      nodes: next.nodes,
      edges: next.edges,
      selectedEdgeId: null
    };
  }),

  autoLayout: () => {
    get().takeSnapshot();
    const { nodes, edges } = get();
    if (nodes.length === 0) return;

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'LR', nodesep: 80, ranksep: 100 });

    nodes.forEach((node) => {
      const height = 100 + (node.data.attributes ? node.data.attributes.length : 1) * 35;
      dagreGraph.setNode(node.id, { width: 320, height });
    });

    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      const height = 100 + (node.data.attributes ? node.data.attributes.length : 1) * 35;
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - 160,
          y: nodeWithPosition.y - height / 2
        }
      };
    });

    set({ nodes: layoutedNodes });
  },

  importDiagram: (schema) => {
    const { entities = [], relationships = [] } = schema;

    const nodes = entities.map((entity: any, index: number) => {
      const x = 50 + (index % 3) * 380;
      const y = 50 + Math.floor(index / 3) * 320;

      const attributes = (entity.attributes || []).map((attr: any) => ({
        name: attr.name,
        type: attr.type,
        enumValues: attr.enumValues || undefined,
        primaryKey: !!attr.primaryKey,
        nullable: attr.nullable !== false,
        unique: !!attr.unique,
        defaultValue: attr.defaultValue || null,
        validation: attr.validation || undefined
      }));

      return {
        id: `entity_${entity.name.toLowerCase()}`,
        type: 'entityNode',
        position: { x, y },
        data: {
          name: entity.name,
          tableName: entity.tableName || '',
          softDelete: !!entity.softDelete,
          attributes
        }
      };
    });

    const edges = relationships.map((rel: any, index: number) => {
      const sourceId = `entity_${rel.from.toLowerCase()}`;
      const targetId = `entity_${rel.to.toLowerCase()}`;

      return {
        id: `edge_imported_${index}_${Date.now()}`,
        source: sourceId,
        target: targetId,
        animated: true,
        data: {
          type: rel.type,
          fromField: rel.fromField,
          toField: rel.toField,
          fromNullable: rel.fromNullable !== false,
          toNullable: rel.toNullable !== false,
          cascade: rel.cascade || ['PERSIST', 'MERGE'],
          joinTable: rel.joinTable || null
        },
        label: rel.type,
        style: { strokeWidth: 2 }
      };
    });

    set({
      projectName: schema.projectName || 'MyProject',
      basePackage: schema.basePackage || 'com.example.project',
      openApiSupport: !!schema.openApiSupport,
      generateTestStubs: !!schema.generateTestStubs,
      flywayMigration: !!schema.flywayMigration,
      nodes,
      edges,
      selectedEdgeId: null,
      past: [],
      future: []
    });

    // Auto-arrange nodes using Dagre and clean baseline history
    get().autoLayout();
    set({ past: [], future: [] });
  },

  addEntity: (name, x, y) => {
    get().takeSnapshot();
    const id = `entity_${Date.now()}`;
    const newEntity: EntityNode = {
      id,
      type: 'entityNode',
      position: { x, y },
      data: {
        name,
        tableName: '',
        attributes: [
          {
            name: 'id',
            type: 'Long',
            primaryKey: true,
            nullable: false,
            unique: true,
            defaultValue: null
          }
        ]
      }
    };
    set((state) => ({ nodes: [...state.nodes, newEntity] }));
  },

  updateEntityName: (nodeId, name) => {
    get().takeSnapshot();
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, name }
          };
        }
        return node;
      })
    }));
  },

  updateEntityTableName: (nodeId, tableName) => {
    get().takeSnapshot();
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, tableName }
          };
        }
        return node;
      })
    }));
  },

  updateEntitySoftDelete: (nodeId, softDelete) => {
    get().takeSnapshot();
    set((state) => ({
      nodes: state.nodes.map((node) => 
        node.id === nodeId 
          ? { ...node, data: { ...node.data, softDelete } }
          : node
      )
    }));
  },

  removeEntity: (nodeId) => {
    get().takeSnapshot();
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== nodeId),
      edges: state.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
    }));
  },

  addAttribute: (nodeId) => {
    get().takeSnapshot();
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id === nodeId) {
          const defaultAttr: Attribute = {
            name: `field${node.data.attributes.length}`,
            type: 'String',
            primaryKey: false,
            nullable: true,
            unique: false,
            defaultValue: null
          };
          return {
            ...node,
            data: {
              ...node.data,
              attributes: [...node.data.attributes, defaultAttr]
            }
          };
        }
        return node;
      })
    }));
  },

  updateAttribute: (nodeId, attrIndex, updated) => {
    get().takeSnapshot();
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id === nodeId) {
          const attributes = [...node.data.attributes];
          attributes[attrIndex] = { ...attributes[attrIndex], ...updated };
          if (updated.type && updated.type !== 'Enum') {
            delete attributes[attrIndex].enumValues;
          } else if (updated.type === 'Enum' && !attributes[attrIndex].enumValues) {
            attributes[attrIndex].enumValues = ['PENDING', 'APPROVED', 'CANCELLED'];
          }
          return {
            ...node,
            data: { ...node.data, attributes }
          };
        }
        return node;
      })
    }));
  },

  updateAttributeValidation: (nodeId, attrIndex, validation) => {
    get().takeSnapshot();
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id !== nodeId) return node;
        const attributes = [...node.data.attributes];
        const attr = attributes[attrIndex];
        const currentValidation = attr.validation || { required: false, minSize: null, maxSize: null, email: false };
        attributes[attrIndex] = {
          ...attr,
          validation: { ...currentValidation, ...validation }
        };
        return { ...node, data: { ...node.data, attributes } };
      })
    }));
  },

  removeAttribute: (nodeId, attrIndex) => {
    get().takeSnapshot();
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              attributes: node.data.attributes.filter((_, idx) => idx !== attrIndex)
            }
          };
        }
        return node;
      })
    }));
  },

  onNodesChange: (changes) => set((state) => ({
    nodes: applyNodeChanges(changes as any, state.nodes) as EntityNode[]
  })),

  onEdgesChange: (changes) => set((state) => ({
    edges: applyEdgeChanges(changes, state.edges)
  })),

  onConnect: (connection) => {
    get().takeSnapshot();
    set((state) => {
      const sourceNode = state.nodes.find(n => n.id === connection.source);
      const targetNode = state.nodes.find(n => n.id === connection.target);
      
      if (!sourceNode || !targetNode) return state;

      const fromField = targetNode.data.name.toLowerCase();
      const toField = sourceNode.data.name.toLowerCase() + 's';

      const defaultRelationConfig: RelationshipConfig = {
        type: 'ONE_TO_MANY',
        fromField,
        toField,
        fromNullable: true,
        toNullable: true,
        cascade: ['PERSIST', 'MERGE'],
        joinTable: null
      };

      const newEdge: Edge = {
        ...connection,
        id: `edge_${Date.now()}`,
        animated: true,
        data: defaultRelationConfig,
        label: 'ONE_TO_MANY',
        style: { strokeWidth: 2 }
      };

      return {
        edges: addEdge(newEdge, state.edges),
        selectedEdgeId: newEdge.id
      };
    });
  },

  setSelectedEdgeId: (selectedEdgeId) => set({ selectedEdgeId }),

  updateRelationship: (edgeId, config) => {
    get().takeSnapshot();
    set((state) => ({
      edges: state.edges.map((edge) => {
        if (edge.id === edgeId) {
          const updatedData = { ...edge.data, ...config };
          
          if (config.type && config.type !== 'MANY_TO_MANY') {
            updatedData.joinTable = null;
          } else if (config.type === 'MANY_TO_MANY' && !updatedData.joinTable) {
            const sourceNode = state.nodes.find(n => n.id === edge.source);
            const targetNode = state.nodes.find(n => n.id === edge.target);
            if (sourceNode && targetNode) {
              updatedData.joinTable = `${sourceNode.data.name.toLowerCase()}_${targetNode.data.name.toLowerCase()}`;
            }
          }

          return {
            ...edge,
            label: config.type || edge.label,
            data: updatedData
          };
        }
        return edge;
      })
    }));
  },

  removeRelationship: (edgeId) => {
    get().takeSnapshot();
    set((state) => ({
      edges: state.edges.filter((edge) => edge.id !== edgeId),
      selectedEdgeId: state.selectedEdgeId === edgeId ? null : state.selectedEdgeId
    }));
  },

  getDiagramSchema: () => {
    const state = get();
    
    const entities = state.nodes.map((node) => {
      return {
        name: node.data.name,
        tableName: node.data.tableName || undefined,
        softDelete: !!node.data.softDelete,
        attributes: node.data.attributes.map((attr) => ({
          name: attr.name,
          type: attr.type,
          enumValues: attr.type === 'Enum' ? attr.enumValues : undefined,
          primaryKey: attr.primaryKey,
          nullable: attr.nullable,
          unique: attr.unique,
          defaultValue: attr.defaultValue,
          validation: attr.validation || undefined
        }))
      };
    });

    const relationships = state.edges.map((edge) => {
      const sourceNode = state.nodes.find((n) => n.id === edge.source);
      const targetNode = state.nodes.find((n) => n.id === edge.target);
      const config = edge.data as unknown as RelationshipConfig;

      return {
        from: sourceNode ? sourceNode.data.name : '',
        to: targetNode ? targetNode.data.name : '',
        type: config.type,
        fromField: config.fromField,
        toField: config.toField || null,
        fromNullable: config.fromNullable,
        toNullable: config.toNullable,
        cascade: config.cascade,
        joinTable: config.joinTable || null
      };
    });

    return {
      projectName: state.projectName,
      basePackage: state.basePackage,
      openApiSupport: state.openApiSupport,
      generateTestStubs: state.generateTestStubs,
      flywayMigration: state.flywayMigration,
      entities,
      relationships
    };
  }
}));
