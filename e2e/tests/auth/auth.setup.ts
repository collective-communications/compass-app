import { test as setup } from '@playwright/test';
import { LoginPage } from '../../page-objects/login.page';
import { ensureTestUser } from '../../helpers/auth';

const TEST_ADMIN_EMAIL = 'e2e-admin@test.compassapp.dev';
const TEST_ADMIN_PASSWORD = 'Test1234!';
const SEED_ORG_ID = '00000000-0000-0000-0000-000000000001'; // CCC org

const TEST_CLIENT_EMAIL = 'e2e-client@test.compassapp.dev';
const TEST_CLIENT_PASSWORD = 'Test1234!';
const CLIENT_ORG_ID = '00000000-0000-0000-0000-000000000002'; // Client org

const TEST_DIRECTOR_EMAIL = 'e2e-director@test.compassapp.dev';
const TEST_DIRECTOR_PASSWORD = 'Test1234!';

const TEST_MANAGER_EMAIL = 'e2e-manager@test.compassapp.dev';
const TEST_MANAGER_PASSWORD = 'Test1234!';

const TEST_CCC_MEMBER_EMAIL = 'e2e-ccc-member@test.compassapp.dev';
const TEST_CCC_MEMBER_PASSWORD = 'Test1234!';

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

setup('authenticate as director', async ({ page }) => {
  await ensureTestUser(TEST_DIRECTOR_EMAIL, 'client_director', CLIENT_ORG_ID, TEST_DIRECTOR_PASSWORD);

  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(TEST_DIRECTOR_EMAIL, TEST_DIRECTOR_PASSWORD);

  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
  await page.context().storageState({ path: 'e2e/.auth/director.json' });
});

setup('authenticate as manager', async ({ page }) => {
  await ensureTestUser(TEST_MANAGER_EMAIL, 'client_manager', CLIENT_ORG_ID, TEST_MANAGER_PASSWORD);

  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(TEST_MANAGER_EMAIL, TEST_MANAGER_PASSWORD);

  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
  await page.context().storageState({ path: 'e2e/.auth/manager.json' });
});

setup('authenticate as ccc_member', async ({ page }) => {
  await ensureTestUser(TEST_CCC_MEMBER_EMAIL, 'ccc_member', SEED_ORG_ID, TEST_CCC_MEMBER_PASSWORD);

  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(TEST_CCC_MEMBER_EMAIL, TEST_CCC_MEMBER_PASSWORD);

  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
  await page.context().storageState({ path: 'e2e/.auth/ccc-member.json' });
});
