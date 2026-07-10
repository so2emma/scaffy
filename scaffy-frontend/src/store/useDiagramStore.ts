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

export interface Attribute {
  name: string;
  type: string;
  enumValues?: string[];
  primaryKey: boolean;
  nullable: boolean;
  unique: boolean;
  defaultValue: string | null;
}

export interface EntityData extends Record<string, any> {
  name: string;
  tableName: string;
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
  
  setProjectName: (name: string) => void;
  setBasePackage: (pkg: string) => void;
  
  addEntity: (name: string, x: number, y: number) => void;
  updateEntityName: (nodeId: string, name: string) => void;
  updateEntityTableName: (nodeId: string, tableName: string) => void;
  removeEntity: (nodeId: string) => void;
  
  addAttribute: (nodeId: string) => void;
  updateAttribute: (nodeId: string, attrIndex: number, updated: Partial<Attribute>) => void;
  removeAttribute: (nodeId: string, attrIndex: number) => void;
  
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  
  setSelectedEdgeId: (edgeId: string | null) => void;
  updateRelationship: (edgeId: string, config: Partial<RelationshipConfig>) => void;
  removeRelationship: (edgeId: string) => void;

  getDiagramSchema: () => any;
  toggleTheme: () => void;
}

export const useDiagramStore = create<DiagramState>((set, get) => ({
  projectName: 'MyProject',
  basePackage: 'com.example.project',
  nodes: [],
  edges: [],
  selectedEdgeId: null,
  theme: 'dark',

  setProjectName: (projectName) => set({ projectName }),
  setBasePackage: (basePackage) => set({ basePackage }),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),

  addEntity: (name, x, y) => {
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

  updateEntityName: (nodeId, name) => set((state) => ({
    nodes: state.nodes.map((node) => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: { ...node.data, name }
        };
      }
      return node;
    })
  })),

  updateEntityTableName: (nodeId, tableName) => set((state) => ({
    nodes: state.nodes.map((node) => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: { ...node.data, tableName }
        };
      }
      return node;
    })
  })),

  removeEntity: (nodeId) => set((state) => {
    // Also remove any edges connected to this node
    return {
      nodes: state.nodes.filter((node) => node.id !== nodeId),
      edges: state.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
    };
  }),

  addAttribute: (nodeId) => set((state) => ({
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
  })),

  updateAttribute: (nodeId, attrIndex, updated) => set((state) => ({
    nodes: state.nodes.map((node) => {
      if (node.id === nodeId) {
        const attributes = [...node.data.attributes];
        attributes[attrIndex] = { ...attributes[attrIndex], ...updated };
        // Clean up enumValues if type changes to non-Enum
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
  })),

  removeAttribute: (nodeId, attrIndex) => set((state) => ({
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
  })),

  onNodesChange: (changes) => set((state) => ({
    nodes: applyNodeChanges(changes as any, state.nodes) as EntityNode[]
  })),

  onEdgesChange: (changes) => set((state) => ({
    edges: applyEdgeChanges(changes, state.edges)
  })),

  onConnect: (connection) => set((state) => {
    const sourceNode = state.nodes.find(n => n.id === connection.source);
    const targetNode = state.nodes.find(n => n.id === connection.target);
    
    if (!sourceNode || !targetNode) return state;

    // Generate standard default fields names for relationship
    const fromField = targetNode.data.name.toLowerCase();
    const toField = sourceNode.data.name.toLowerCase() + 's'; // e.g. books for author

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
      selectedEdgeId: newEdge.id // Automatically select on connect to open side panel
    };
  }),

  setSelectedEdgeId: (selectedEdgeId) => set({ selectedEdgeId }),

  updateRelationship: (edgeId, config) => set((state) => ({
    edges: state.edges.map((edge) => {
      if (edge.id === edgeId) {
        const updatedData = { ...edge.data, ...config };
        
        // Clean up joinTable if type changes away from MANY_TO_MANY
        if (config.type && config.type !== 'MANY_TO_MANY') {
          updatedData.joinTable = null;
        } else if (config.type === 'MANY_TO_MANY' && !updatedData.joinTable) {
          // default joinTable name
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
  })),

  removeRelationship: (edgeId) => set((state) => ({
    edges: state.edges.filter((edge) => edge.id !== edgeId),
    selectedEdgeId: state.selectedEdgeId === edgeId ? null : state.selectedEdgeId
  })),

  getDiagramSchema: () => {
    const state = get();
    
    // Map nodes to Backend Entity schema
    const entities = state.nodes.map((node) => {
      return {
        name: node.data.name,
        tableName: node.data.tableName || undefined, // send undefined if empty to fallback on snake_case
        attributes: node.data.attributes.map((attr) => ({
          name: attr.name,
          type: attr.type,
          enumValues: attr.type === 'Enum' ? attr.enumValues : undefined,
          primaryKey: attr.primaryKey,
          nullable: attr.nullable,
          unique: attr.unique,
          defaultValue: attr.defaultValue
        }))
      };
    });

    // Map edges to Backend Relationship schema
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
      entities,
      relationships
    };
  }
}));
