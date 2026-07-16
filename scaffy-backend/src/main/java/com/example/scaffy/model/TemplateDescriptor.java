package com.example.scaffy.model;

public class TemplateDescriptor {
    private String id;
    private String name;
    private String description;
    private String category;
    private String icon;
    private int entityCount;
    private DiagramDto diagram;

    public TemplateDescriptor() {
    }

    public TemplateDescriptor(String id, String name, String description, String category, 
                            String icon, int entityCount, DiagramDto diagram) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.category = category;
        this.icon = icon;
        this.entityCount = entityCount;
        this.diagram = diagram;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getIcon() {
        return icon;
    }

    public void setIcon(String icon) {
        this.icon = icon;
    }

    public int getEntityCount() {
        return entityCount;
    }

    public void setEntityCount(int entityCount) {
        this.entityCount = entityCount;
    }

    public DiagramDto getDiagram() {
        return diagram;
    }

    public void setDiagram(DiagramDto diagram) {
        this.diagram = diagram;
    }
}
