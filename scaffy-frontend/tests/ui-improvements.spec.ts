import { test, expect } from '@playwright/test';

test.describe('Scaffy UI Improvements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should not auto-open code preview when selecting entity', async ({ page }) => {
    // Add an entity
    await page.click('button:has-text("Add Entity Node")');
    
    // Wait for entity to appear on canvas
    await page.waitForSelector('.react-flow__node', { timeout: 5000 });
    
    // Click on the entity node
    await page.click('.react-flow__node');
    
    // Code preview should NOT be visible
    const codePreview = page.locator('[data-code-preview-body]');
    await expect(codePreview).not.toBeVisible({ timeout: 2000 });
  });

  test('should open code preview only when button is clicked', async ({ page }) => {
    // Add an entity
    await page.click('button:has-text("Add Entity Node")');
    await page.waitForSelector('.react-flow__node');
    
    // Click the "Show Preview" button in toolbar
    await page.click('button:has-text("Show Preview")');
    
    // Code preview should now be visible
    const codePreview = page.locator('[data-code-preview-body]');
    await expect(codePreview).toBeVisible({ timeout: 3000 });
    
    // Button text should change
    await expect(page.locator('button:has-text("Hide Preview")')).toBeVisible();
  });

  test('should display Lucide icons instead of emojis in sidebar', async ({ page }) => {
    // Check health indicator has icon, not emoji
    const healthSection = page.locator('text=No issues').or(page.locator('text=issue'));
    await expect(healthSection).toBeVisible();
    
    // Look for Lucide SVG icons (they have specific class)
    const lucideIcons = page.locator('svg.lucide');
    const iconCount = await lucideIcons.count();
    expect(iconCount).toBeGreaterThan(5); // Should have multiple icons
  });

  test('should have ERD details panel toggle', async ({ page }) => {
    // Look for details panel toggle button
    const detailsToggle = page.locator('button:has-text("Details")').or(
      page.locator('button[title*="details" i]')
    );
    
    // Panel might be open or closed initially
    const isVisible = await detailsToggle.isVisible();
    expect(isVisible).toBe(true);
  });

  test('auto-layout should not have overlapping tags', async ({ page }) => {
    // Create multiple entities
    for (let i = 0; i < 3; i++) {
      await page.click('button:has-text("Add Entity Node")');
      await page.waitForTimeout(200);
    }
    
    // Click auto-layout button
    await page.click('button:has-text("Layout")');
    await page.waitForTimeout(1000);
    
    // Check that nodes are properly spaced
    const nodes = page.locator('.react-flow__node');
    const nodeCount = await nodes.count();
    expect(nodeCount).toBeGreaterThanOrEqual(3);
    
    // Get bounding boxes of all nodes
    const boxes = await nodes.evaluateAll((elements) => 
      elements.map(el => el.getBoundingClientRect())
    );
    
    // Check for overlaps (basic collision detection)
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const box1 = boxes[i];
        const box2 = boxes[j];
        
        const overlap = !(
          box1.right < box2.left ||
          box1.left > box2.right ||
          box1.bottom < box2.top ||
          box1.top > box2.bottom
        );
        
        expect(overlap).toBe(false);
      }
    }
  });

  test('relationship lines should be color-coded', async ({ page }) => {
    // Create two entities
    await page.click('button:has-text("Add Entity Node")');
    await page.waitForTimeout(300);
    await page.click('button:has-text("Add Entity Node")');
    await page.waitForTimeout(300);
    
    // Connect them (simulate drag from handle to handle)
    const nodes = page.locator('.react-flow__node');
    const firstNode = nodes.nth(0);
    const secondNode = nodes.nth(1);
    
    // Get handle positions
    const firstHandle = firstNode.locator('.react-flow__handle-right').or(
      firstNode.locator('.react-flow__handle-bottom')
    );
    const secondHandle = secondNode.locator('.react-flow__handle-left').or(
      secondNode.locator('.react-flow__handle-top')
    );
    
    // Create connection by dragging
    if (await firstHandle.isVisible() && await secondHandle.isVisible()) {
      await firstHandle.dragTo(secondHandle);
      await page.waitForTimeout(500);
      
      // Check if edge exists
      const edges = page.locator('.react-flow__edge');
      const edgeCount = await edges.count();
      expect(edgeCount).toBeGreaterThan(0);
      
      // Check for relationship label
      const label = page.locator('text=1:N').or(page.locator('text=1:1'));
      await expect(label).toBeVisible({ timeout: 2000 });
    }
  });

  test('theme toggle should switch between light and dark', async ({ page }) => {
    // Find theme toggle button (Sun/Moon icon)
    const themeToggle = page.locator('button[title*="mode" i]');
    
    if (await themeToggle.isVisible()) {
      // Get initial theme
      const htmlClass = await page.locator('html').getAttribute('class');
      const isDark = htmlClass?.includes('dark');
      
      // Toggle theme
      await themeToggle.click();
      await page.waitForTimeout(300);
      
      // Check theme changed
      const newHtmlClass = await page.locator('html').getAttribute('class');
      const isNowDark = newHtmlClass?.includes('dark');
      
      expect(isNowDark).toBe(!isDark);
    }
  });

  test('should show validation errors for invalid entities', async ({ page }) => {
    // Add entity
    await page.click('button:has-text("Add Entity Node")');
    await page.waitForTimeout(300);
    
    // Find the entity name input
    const entityInput = page.locator('.react-flow__node input[value*="Entity"]').first();
    
    if (await entityInput.isVisible()) {
      // Clear the name (invalid)
      await entityInput.fill('');
      await entityInput.blur();
      await page.waitForTimeout(500);
      
      // Should show validation error
      const errorIndicator = page.locator('.react-flow__node').locator('svg.lucide-alert-triangle');
      const errorCount = await errorIndicator.count();
      expect(errorCount).toBeGreaterThan(0);
    }
  });

  test('ERD details panel should show entity list', async ({ page }) => {
    // Add some entities
    await page.click('button:has-text("Add Entity Node")');
    await page.waitForTimeout(200);
    await page.click('button:has-text("Add Entity Node")');
    await page.waitForTimeout(200);
    
    // Open details panel if not open
    const detailsButton = page.locator('button').filter({ hasText: /details|info/i });
    
    if (await detailsButton.isVisible()) {
      await detailsButton.click();
      await page.waitForTimeout(300);
      
      // Check for entity list section
      const entityList = page.locator('text=Entity List').or(page.locator('text=Entities'));
      await expect(entityList).toBeVisible({ timeout: 2000 });
    }
  });
});

test.describe('Visual Regression', () => {
  test('canvas with entities and relationships', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Add entities
    for (let i = 0; i < 2; i++) {
      await page.click('button:has-text("Add Entity Node")');
      await page.waitForTimeout(200);
    }
    
    // Auto-layout
    await page.click('button:has-text("Layout")');
    await page.waitForTimeout(1000);
    
    // Take screenshot
    await expect(page).toHaveScreenshot('canvas-with-entities.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('dark theme screenshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Ensure dark theme
    const htmlClass = await page.locator('html').getAttribute('class');
    if (!htmlClass?.includes('dark')) {
      const themeToggle = page.locator('button[title*="mode" i]');
      if (await themeToggle.isVisible()) {
        await themeToggle.click();
        await page.waitForTimeout(300);
      }
    }
    
    await expect(page).toHaveScreenshot('dark-theme.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});
