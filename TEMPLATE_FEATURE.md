# Diagram Templates Feature

## Overview
The Diagram Templates feature allows users to start from prebuilt entity-relationship patterns instead of a blank canvas, significantly speeding up the initial setup for common application types.

## Implementation Details

### Backend Components

#### 1. Model: `TemplateDescriptor.java`
Located in `com.example.scaffy.model`, this model contains:
- `id`: Unique template identifier (e.g., "ecommerce", "saas-multitenant")
- `name`: Display name
- `description`: One-line summary
- `category`: Grouping (e.g., "Commerce", "Platform", "Social", "Content")
- `icon`: Icon identifier for the frontend
- `entityCount`: Number of entities in the template
- `diagram`: Full DiagramDto with entities, relationships, and defaults

#### 2. Service: `TemplateService.java`
Located in `com.example.scaffy.service`:
- Loads templates from JSON files in `src/main/resources/templates/diagrams/`
- `getAvailableTemplates()`: Returns metadata only (without full diagram)
- `getTemplateDiagram(String templateId)`: Returns the full DiagramDto for a given template

#### 3. Template JSON Files
Located in `src/main/resources/templates/diagrams/`:

**ecommerce.json** - E-Commerce pattern:
- 9 entities: User, Product, Category, Order, OrderItem, Payment, Address, Review, CartItem
- Complete relationships including cart management, order processing, and product reviews
- Realistic attributes with proper types

**saas-multitenant.json** - SaaS Multi-Tenancy pattern:
- 9 entities: Tenant, User, Role, Permission, RolePermission, Subscription, Plan, Invoice, AuditLog
- Tenant isolation with tenantId attributes
- RBAC system with roles and permissions
- Subscription management

**social-network.json** - Social Network pattern:
- 10 entities: User, Profile, Post, Comment, Like, Friendship, Message, Notification, Tag, PostTag
- Social interactions including posts, comments, likes
- Messaging and notification systems
- Tagging functionality

**cms.json** - Content Management System pattern:
- 10 entities: User, Article, Category, Tag, ArticleTag, Comment, Media, Page, Menu, MenuItem
- Content versioning with status enum (DRAFT/PUBLISHED/ARCHIVED)
- Media management
- Navigation menu system

#### 4. Controller Endpoints
Added to `ScaffolderController.java`:
- `GET /api/scaffold/templates`: Returns List<TemplateDescriptor> (metadata only)
- `GET /api/scaffold/templates/{id}`: Returns DiagramDto for the requested template

### Frontend Components

#### 1. Component: `TemplateGalleryModal.tsx`
Located in `src/components/`:
- Modal overlay with framework selector styling
- Grid layout displaying template cards (2 columns)
- Each card shows: icon, name, description, entity count badge, category tag
- Search/filter functionality by name or category
- Confirmation dialog if canvas has existing entities
- Dark/light theme support

#### 2. Hook: `useTemplates.ts`
Located in `src/hooks/`:
- Uses TanStack Query for data fetching
- `useTemplates()`: Fetches template list from API
- `fetchTemplateDiagram(templateId)`: Fetches full diagram for a template
- Caches template list since it won't change

#### 3. Updated Components

**Sidebar.tsx**:
- Added "Start from Template" button below "Add Entity" button
- Uses LayoutTemplate icon from lucide-react
- Opens TemplateGalleryModal on click

**Canvas.tsx**:
- Added empty state prompt when nodes.length === 0
- Shows centered message: "Start from scratch or choose a template"
- Includes "Browse Templates" button that opens the gallery modal

**page.tsx**:
- Added state for template gallery modal
- Wired up the modal to open from both Sidebar and Canvas
- Imported TemplateGalleryModal component

#### 4. Styling
Added to `globals.css`:
- `.template-gallery-grid`: 2-column responsive grid
- `.template-card`: Card styling with hover effects and glow matching category colors
- Category-specific colors (Commerce: green, Platform: blue, Social: purple, Content: orange)
- Light/dark theme support for all template components

## User Flow

1. **Empty Canvas**: When the canvas is empty, users see a centered prompt with a "Browse Templates" button
2. **Sidebar Access**: Users can also click "Start from Template" in the sidebar
3. **Template Gallery**: Modal opens showing all available templates in a grid
4. **Search**: Users can filter templates by name, category, or description
5. **Selection**: Clicking a template card:
   - Shows confirmation if canvas has entities
   - Fetches the full diagram from the API
   - Imports the diagram into the store
   - Auto-layouts the entities
   - Shows success toast
6. **Customization**: Users can then customize the loaded template by:
   - Changing project name and base package
   - Adding/removing entities
   - Modifying attributes
   - Adjusting relationships

## Behavior Details

- Template loading sets projectName to a sensible default (e.g., "my-ecommerce")
- basePackage remains as "com.example" for user customization
- Auto-layout is applied after template import
- Success toast displays: "Template loaded: {templateName}"
- Confirmation dialog prevents accidental overwrites of existing work

## Template Categories

- **Commerce**: E-commerce and retail applications
- **Platform**: SaaS and multi-tenant platforms
- **Social**: Social networks and community platforms
- **Content**: CMS and content publishing systems

## Technical Notes

- Templates are loaded at service startup from classpath
- Template list is cached on the frontend using TanStack Query
- Full diagrams are fetched on-demand only when selected
- Templates include proper validation rules and constraints
- All relationships are properly configured with cascade options
- Entity attributes include realistic types and nullability settings
