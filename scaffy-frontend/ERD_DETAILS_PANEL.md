# ERD Details Panel Guide

## What is it?

A **right-side collapsible panel** that shows comprehensive information about your ER diagram without cluttering the canvas.

---

## Visual Layout

```
┌─────────────────────────────────────────────────┐
│  Canvas Area                         │ Details  │
│                                      │ Panel    │
│    User ──→ Article                 │          │
│      │                               │ ┌──────┐ │
│      └──→ Profile                    │ │Stats │ │
│                                      │ ├──────┤ │
│                                      │ │      │ │
│                                      │ │ 📊   │ │
│                                      │ │      │ │
│                                      │ ├──────┤ │
│                                      │ │List  │ │
│                                      │ └──────┘ │
└─────────────────────────────────────────────────┘
        ↑ Canvas (main area)          ↑ Right Panel
```

---

## Panel Sections

### 1. **Schema Statistics** 📊

Shows high-level metrics at a glance:

```
┌─────────────────────────────────┐
│  Schema Statistics              │
├─────────────────────────────────┤
│  ┌─────┐  ┌─────┐  ┌─────┐    │
│  │  5  │  │  7  │  │ 23  │    │
│  │Ents │  │Rels │  │Attrs│    │
│  └─────┘  └─────┘  └─────┘    │
└─────────────────────────────────┘
```

**Data shown:**
- **Entities**: Total number of entity nodes
- **Relationships**: Total number of connections
- **Attributes**: Sum of all attributes across entities

---

### 2. **Validation Status** ✅

Real-time validation feedback:

```
┌─────────────────────────────────┐
│  Validation Status              │
├─────────────────────────────────┤
│  ✓ No issues  (100%)           │  ← Green (healthy)
│                                 │
│  OR                            │
│                                 │
│  ✗ 3 issues found              │  ← Red (errors)
│  • User: Name is required      │
│  • Article: Invalid type       │
│  • Comment: Duplicate field    │
└─────────────────────────────────┘
```

**Features:**
- Shows error count
- Lists up to 5 most recent errors
- Color-coded (green = good, red = errors)
- Updates in real-time as you edit

---

### 3. **Relationship Summary** 🔗

Groups relationships by type with counts:

```
┌─────────────────────────────────┐
│  Relationship Summary           │
├─────────────────────────────────┤
│  🟦 ONE_TO_MANY         (4)    │
│  🟩 ONE_TO_ONE          (2)    │
│  🟪 MANY_TO_MANY        (1)    │
│  🟧 MANY_TO_ONE         (0)    │
└─────────────────────────────────┘
```

**Color Legend:**
- 🟦 Blue = ONE_TO_MANY (1:N)
- 🟩 Teal = ONE_TO_ONE (1:1)
- 🟪 Purple = MANY_TO_MANY (N:M)
- 🟧 Orange = MANY_TO_ONE (N:1)

---

### 4. **Entity List** 📋

Scrollable list of all entities with quick navigation:

```
┌─────────────────────────────────┐
│  Entity List                    │
├─────────────────────────────────┤
│  🗄️ User               (6)     │  ← Click to focus
│  🗄️ Article           (10)     │
│  🗄️ Comment           (4)      │
│  🗄️ Profile           (8)      │
│  🗄️ Tag               (3)      │
│  🗄️ Media             (8)      │
│                     ↓ Scroll    │
└─────────────────────────────────┘
```

**Features:**
- Shows attribute count per entity
- Click entity name to pan canvas to it
- Hover effect with accent color
- Scrollable for large schemas
- Icon indicates entity type

---

## How to Use

### Opening the Panel

**Method 1: Toggle Button**
```
Look for button in top-right corner:
[≡] or [Info] or [Details]
```

**Method 2: Keyboard Shortcut** (future enhancement)
```
Press Ctrl/Cmd + I
```

### Interacting with the Panel

#### **Navigate to Entity**
1. Scroll to entity in list
2. Click entity name
3. Canvas pans and centers on that entity
4. Entity node highlights

#### **Check Validation**
1. Look at validation section
2. See error count and messages
3. Fix errors in entity cards
4. Watch status update in real-time

#### **View Statistics**
1. Top section shows counts
2. Updates automatically as you:
   - Add/remove entities
   - Create/delete relationships
   - Add/remove attributes

#### **Analyze Relationships**
1. See relationship type distribution
2. Identify most common patterns
3. Plan schema improvements

### Closing the Panel

Click toggle button again or click outside panel area.

---

## Panel Behavior

### States

#### **Open** (Default for large screens)
```
┌──────────────┬─────────┐
│   Canvas     │ Panel   │
│              │ [Stats] │
│              │ [List]  │
└──────────────┴─────────┘
```

#### **Closed** (More canvas space)
```
┌─────────────────────┬─┐
│   Canvas            │▶│  ← Toggle button
│                     │ │
│                     │ │
└─────────────────────┴─┘
```

### Responsiveness

- **Large screens (>1200px)**: Panel open by default
- **Medium screens (768-1200px)**: Panel closed by default
- **Small screens (<768px)**: Panel as modal overlay

---

## Visual Design

### Styling
- **Background**: Surface color (`var(--c-surface)`)
- **Border**: Left border with accent color
- **Text**: Content color (`var(--c-content)`)
- **Accents**: VSCode blue (`var(--c-accent)`)
- **Shadows**: Elevated shadow for depth

### Animations
- **Open/Close**: 300ms smooth slide
- **Hover**: 150ms color transition
- **Focus**: Accent border highlight

### Typography
- **Headings**: 14px, semibold, uppercase
- **Entity names**: 13px, medium weight
- **Counts**: 11px, subtle color
- **Stats**: 20px, bold

---

## Example Use Cases

### **Use Case 1: Large Schema Navigation**
**Problem**: 20+ entities, hard to find specific one

**Solution**:
1. Open details panel
2. Scroll entity list
3. Click target entity name
4. Canvas pans to entity immediately

---

### **Use Case 2: Validation Checking**
**Problem**: Errors somewhere, but where?

**Solution**:
1. Look at validation section
2. See error count and messages
3. Click affected entity (future: auto-focus)
4. Fix issues

---

### **Use Case 3: Schema Overview**
**Problem**: What's the structure? How complex?

**Solution**:
1. Check statistics section
2. See entity/relationship/attribute counts
3. Review relationship summary
4. Understand schema at a glance

---

### **Use Case 4: Relationship Analysis**
**Problem**: Are my relationships balanced?

**Solution**:
1. Check relationship summary
2. See type distribution
3. Identify if too many N:M (might need normalization)
4. Plan improvements

---

## Comparison with Sidebar

### Sidebar (Left)
- **Purpose**: Project configuration and actions
- **Content**: Framework, features, entity creation
- **Actions**: Add entity, save, generate code

### Details Panel (Right)
- **Purpose**: ERD analysis and navigation
- **Content**: Statistics, validation, entity list
- **Actions**: View stats, navigate, check health

### Why Both?
- **Sidebar**: Controls WHAT you build
- **Details Panel**: Shows WHAT you've built
- Clear separation of concerns

---

## Keyboard Shortcuts (Future)

Planned shortcuts for panel:

| Key | Action |
|-----|--------|
| `Ctrl/Cmd + I` | Toggle panel |
| `Ctrl/Cmd + E` | Focus entity list |
| `Ctrl/Cmd + K` | Quick entity search |
| `↑` / `↓` | Navigate entity list |
| `Enter` | Pan to selected entity |
| `Esc` | Close panel |

---

## Tips & Tricks

### Tip 1: Quick Health Check
Open panel, glance at validation section. Green = good to generate!

### Tip 2: Entity Navigation
Instead of scrolling canvas, use entity list for precise navigation.

### Tip 3: Schema Complexity
High attribute/entity ratio (>5) = detailed schema  
Low attribute/entity ratio (<3) = might be incomplete

### Tip 4: Relationship Balance
If ONE_TO_MANY dominates, schema is probably well-normalized  
Many MANY_TO_MANY? Consider join entities

### Tip 5: Validation Workflow
1. Design schema
2. Check validation section
3. Fix errors
4. Generate code

---

## Customization (Future)

Planned customization options:

- **Panel Width**: Resize by dragging border
- **Section Visibility**: Hide/show individual sections
- **Default State**: Remember open/closed preference
- **Position**: Move to left side option
- **Theme**: Light/dark independent of main theme

---

## Technical Details

### State Management
- Local state in Canvas component
- Reads from global `useDiagramStore`
- No writes (read-only view)

### Performance
- React memo for entity list items
- Virtual scrolling for 100+ entities (future)
- Debounced statistics recalculation

### Accessibility
- Keyboard navigable
- Screen reader friendly
- Focus management
- ARIA labels

---

## Troubleshooting

### Panel won't open
- Check toggle button is visible
- Try clicking canvas first (focus issue)
- Refresh page

### Entity click doesn't pan
- Make sure entity exists on canvas
- Try auto-layout first
- Check console for errors

### Statistics wrong
- Wait for validation to complete (debounced)
- Refresh page to recalculate
- Check store state

---

**The ERD Details Panel makes managing complex schemas easier by providing centralized navigation and analysis!**
