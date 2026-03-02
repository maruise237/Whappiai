const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Set the clerk cookie to bypass auth if possible, or just try to load the page
  // Since I don't have the clerk token here, I might just see the login page or a blank page if not authorized
  // But Jules usually has some way to bypass or the environment is pre-authed.
  // Actually, I can check if the server is running and what it returns.

  try {
    await page.goto('http://localhost:3000/dashboard/users');
    await page.waitForTimeout(5000); // Wait for potential loading
    await page.screenshot({ path: 'users_page.png', fullPage: true });
    console.log('Screenshot saved as users_page.png');

    const content = await page.content();
    if (content.includes('Oups !') || content.includes('Something went wrong')) {
      console.log('Error boundary detected!');
    } else {
      console.log('No error boundary detected on Users page.');
    }
  } catch (e) {
    console.error('Failed to load page:', e);
  }

  await browser.close();
})();
