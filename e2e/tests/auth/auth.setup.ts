import { test as setup } from '@playwright/test';
import { LoginPage } from '../../page-objects/login.page';
import { ensureTestUser } from '../../helpers/auth';

const TEST_ADMIN_EMAIL = 'e2e-admin@test.compassapp.dev';
const TEST_ADMIN_PASSWORD = 'Test1234!';
const SEED_ORG_ID = '00000000-0000-0000-0000-000000000001'; // CCC org

const TEST_CLIENT_EMAIL = 'e2e-client@test.compassapp.dev';
const TEST_CLIENT_PASSWORD = 'Test1234!';
const CLIENT_ORG_ID = '00000000-0000-0000-0000-000000000002'; // Client org

setup('authenticate as admin', async ({ page }) => {
  await ensureTestUser(TEST_ADMIN_EMAIL, 'ccc_admin', SEED_ORG_ID, TEST_ADMIN_PASSWORD);

  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD);

  // Wait for navigation away from login
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });

  // Save signed-in state
  await page.context().storageState({ path: 'e2e/.auth/admin.json' });
});

setup('authenticate as client user', async ({ page }) => {
  await ensureTestUser(TEST_CLIENT_EMAIL, 'client_exec', CLIENT_ORG_ID, TEST_CLIENT_PASSWORD);

  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(TEST_CLIENT_EMAIL, TEST_CLIENT_PASSWORD);

  // Wait for navigation away from login
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });

  // Save signed-in state
  await page.context().storageState({ path: 'e2e/.auth/client.json' });
});
