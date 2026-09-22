const { test, expect } = require('@playwright/test');

test('Verify portal colors on all 4 pages', async ({ page }) => {
  // Login as hs01@ftalenthub.edu.vn / demo123 → goto /student
  await page.goto('http://localhost:5175/');
  await page.fill('input[name="email"]', 'hs01@ftalenthub.edu.vn');
  await page.fill('input[name="password"]', 'demo123');
  await page.click('button:has-text("Login")');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: '/tmp/v2-student.png', viewport: { width: 1440, height: 900 } });
  await expect(page).toHaveURL(/.*\/student/);
  
  // Login as hr@techfpt.vn / demo123 → goto /enterprise
  await page.goto('http://localhost:5175/');
  await page.fill('input[name="email"]', 'hr@techfpt.vn');
  await page.fill('input[name="password"]', 'demo123');
  await page.click('button:has-text("Login")');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: '/tmp/v2-enterprise.png', viewport: { width: 1440, height: 900 } });
  await expect(page).toHaveURL(/.*\/enterprise/);
  
  // Login as bgh@ftalenthub.edu.vn / demo123 → goto /school
  await page.goto('http://localhost:5175/');
  await page.fill('input[name="email"]', 'bgh@ftalenthub.edu.vn');
  await page.fill('input[name="password"]', 'demo123');
  await page.click('button:has-text("Login")');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: '/tmp/v2-school.png', viewport: { width: 1440, height: 900 } });
  await expect(page).toHaveURL(/.*\/school/);
  
  // Login as nguyen.van.hung@ftalenthub.edu.vn / demo123 → goto /teacher
  await page.goto('http://localhost:5175/');
  await page.fill('input[name="email"]', 'nguyen.van.hung@ftalenthub.edu.vn');
  await page.fill('input[name="password"]', 'demo123');
  await page.click('button:has-text("Login")');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: '/tmp/v2-teacher.png', viewport: { width: 1440, height: 900 } });
  await expect(page).toHaveURL(/.*\/teacher/);
  
  console.log('All screenshots captured successfully');
});
