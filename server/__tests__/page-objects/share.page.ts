import { Page } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * SharePage - Handles share link generation and management interactions
 * 
 * Features:
 * - Create share links with optional expiration
 * - Copy share links to clipboard
 * - View share link analytics (view count, last accessed)
 * - Revoke share links
 * - Update share link settings
 * 
 * Requirements: 15.1, 15.2, 15.5, 11.1, 11.2
 * 
 * Example:
 * ```
 * const sharePage = new SharePage(page);
 * await sharePage.openShareDialog();
 * await sharePage.createShareLink();
 * const shareUrl = await sharePage.getShareUrl();
 * ```
 */
export class SharePage extends BasePage {
  // Dialog selectors
  private readonly shareDialog = '[role="dialog"]';
  private readonly shareDialogTitle = '[role="dialog"] h2';
  private readonly closeDialogButton = '[role="dialog"] button[aria-label="Close"]';

  // Create share link section
  private readonly expirationInput = '#expiration';
  private readonly generateLinkButton = 'button:has-text("Generate Share Link")';
  private readonly creatingLinkButton = 'button:has-text("Creating...")';

  // Share link list
  private readonly shareLinksContainer = '[role="dialog"] .space-y-3';
  private readonly shareLinkCard = '.border.rounded-lg.p-4';
  private readonly shareUrlInput = 'input[readonly][class*="font-mono"]';
  private readonly copyLinkButton = 'button:has(svg.lucide-copy)';
  private readonly copiedLinkButton = 'button:has(svg.lucide-check)';
  private readonly openLinkButton = 'button:has(svg.lucide-external-link)';
  private readonly revokeLinkButton = 'button:has-text("Revoke Access")';

  // Link metadata
  private readonly viewCountText = 'span:has-text("view")';
  private readonly createdDateText = 'span:has-text("Created")';
  private readonly expiresText = 'div:has-text("Expires:")';
  private readonly lastAccessedText = 'div:has-text("Last accessed:")';
  private readonly expiredWarning = '.text-destructive:has-text("expired")';

  // Export selectors
  private readonly exportButton = 'button:has-text("Export")';
  private readonly exportModal = '[role="dialog"]:has-text("Export Results")';
  private readonly pdfFormatRadio = 'input[type="radio"][value="pdf"]';
  private readonly csvFormatRadio = 'input[type="radio"][value="excel"]';
  private readonly pptxFormatRadio = 'input[type="radio"][value="pptx"]';
  private readonly jsonFormatRadio = 'input[type="radio"][value="json"]';
  private readonly exportDownloadButton = 'button:has-text("Export"):not(:has-text("Results"))';
  private readonly exportingButton = 'button:has-text("Exporting...")';
  private readonly exportProgress = '[role="progressbar"]';
  private readonly exportMessage = '.text-muted-foreground';

  // Email export
  private readonly emailInput = 'input[type="email"][placeholder*="recipient"]';
  private readonly sendEmailButton = 'button:has-text("Send"):has(svg.lucide-mail)';

  // Customization fields (Pro features)
  private readonly companyNameInput = '#companyName';
  private readonly authorNameInput = '#authorName';
  private readonly themeRadioGroup = '[role="radiogroup"]:has-text("Presentation Theme")';

  constructor(page: Page) {
    super(page);
  }

  /**
   * Open share dialog from search results page
   */
  async openShareDialog(): Promise<void> {
    // Look for share button on the page
    const shareButton = this.page.locator('button:has-text("Share")').first();
    await shareButton.click();
    await this.page.waitForSelector(this.shareDialog, { state: 'visible' });
  }

  /**
   * Check if share dialog is open
   */
  async isShareDialogOpen(): Promise<boolean> {
    return await this.locator(this.shareDialog).isVisible();
  }

  /**
   * Close the share dialog
   */
  async closeShareDialog(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await this.page.waitForSelector(this.shareDialog, { state: 'hidden' });
  }

  /**
   * Set expiration date for new share link
   * @param dateTime - ISO datetime string (YYYY-MM-DDTHH:mm)
   */
  async setExpirationDate(dateTime: string): Promise<void> {
    await this.fill(this.expirationInput, dateTime);
  }

  /**
   * Create a new share link
   * @param expirationDate - Optional expiration date
   */
  async createShareLink(expirationDate?: string): Promise<void> {
    if (expirationDate) {
      await this.setExpirationDate(expirationDate);
    }
    
    await this.click(this.generateLinkButton);
    
    // Wait for link creation to complete
    await this.page.waitForSelector(this.creatingLinkButton, { state: 'hidden', timeout: 5000 });
    
    // Wait for the new link to appear in the list
    await this.page.waitForTimeout(500);
  }

  /**
   * Get all share link URLs from the dialog
   */
  async getShareUrls(): Promise<string[]> {
    const inputs = await this.page.locator(this.shareUrlInput).all();
    const urls: string[] = [];
    
    for (const input of inputs) {
      const value = await input.inputValue();
      urls.push(value);
    }
    
    return urls;
  }

  /**
   * Get the most recently created share URL
   */
  async getLatestShareUrl(): Promise<string> {
    const urls = await this.getShareUrls();
    return urls[0] || '';
  }

  /**
   * Copy a share link to clipboard by index
   * @param index - Index of the share link (0 = most recent)
   */
  async copyShareLink(index: number = 0): Promise<void> {
    const copyButtons = await this.page.locator(this.copyLinkButton).all();
    
    if (index >= copyButtons.length) {
      throw new Error(`Share link at index ${index} not found`);
    }
    
    await copyButtons[index].click();
    
    // Wait for the copied state
    await this.page.waitForSelector(this.copiedLinkButton, { timeout: 2000 });
  }

  /**
   * Open a share link in a new tab
   * @param index - Index of the share link (0 = most recent)
   */
  async openShareLink(index: number = 0): Promise<Page> {
    const openButtons = await this.page.locator(this.openLinkButton).all();
    
    if (index >= openButtons.length) {
      throw new Error(`Share link at index ${index} not found`);
    }
    
    // Listen for new page
    const [newPage] = await Promise.all([
      this.page.context().waitForEvent('page'),
      openButtons[index].click()
    ]);
    
    await newPage.waitForLoadState('networkidle');
    return newPage;
  }

  /**
   * Get view count for a share link
   * @param index - Index of the share link (0 = most recent)
   */
  async getViewCount(index: number = 0): Promise<number> {
    const cards = await this.page.locator(this.shareLinkCard).all();
    
    if (index >= cards.length) {
      throw new Error(`Share link at index ${index} not found`);
    }
    
    const viewText = await cards[index].locator(this.viewCountText).textContent();
    const match = viewText?.match(/(\d+)\s+view/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Check if a share link has expired
   * @param index - Index of the share link (0 = most recent)
   */
  async isShareLinkExpired(index: number = 0): Promise<boolean> {
    const cards = await this.page.locator(this.shareLinkCard).all();
    
    if (index >= cards.length) {
      throw new Error(`Share link at index ${index} not found`);
    }
    
    const expiredWarning = cards[index].locator(this.expiredWarning);
    return await expiredWarning.isVisible();
  }

  /**
   * Get expiration date text for a share link
   * @param index - Index of the share link (0 = most recent)
   */
  async getExpirationDate(index: number = 0): Promise<string | null> {
    const cards = await this.page.locator(this.shareLinkCard).all();
    
    if (index >= cards.length) {
      throw new Error(`Share link at index ${index} not found`);
    }
    
    const expiresElement = cards[index].locator(this.expiresText);
    const isVisible = await expiresElement.isVisible();
    
    if (!isVisible) {
      return null;
    }
    
    return await expiresElement.textContent();
  }

  /**
   * Revoke a share link
   * @param index - Index of the share link (0 = most recent)
   * @param confirm - Whether to confirm the revocation dialog
   */
  async revokeShareLink(index: number = 0, confirm: boolean = true): Promise<void> {
    const cards = await this.page.locator(this.shareLinkCard).all();
    
    if (index >= cards.length) {
      throw new Error(`Share link at index ${index} not found`);
    }
    
    const revokeButton = cards[index].locator(this.revokeLinkButton);
    
    // Set up dialog handler before clicking
    this.page.once('dialog', async dialog => {
      if (confirm) {
        await dialog.accept();
      } else {
        await dialog.dismiss();
      }
    });
    
    await revokeButton.click();
    
    // Wait for the link to be removed
    if (confirm) {
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Get the count of active share links
   */
  async getShareLinkCount(): Promise<number> {
    const cards = await this.page.locator(this.shareLinkCard).all();
    return cards.length;
  }

  // Export functionality

  /**
   * Open export modal
   */
  async openExportModal(): Promise<void> {
    await this.click(this.exportButton);
    await this.page.waitForSelector(this.exportModal, { state: 'visible' });
  }

  /**
   * Check if export modal is open
   */
  async isExportModalOpen(): Promise<boolean> {
    return await this.locator(this.exportModal).isVisible();
  }

  /**
   * Select export format
   * @param format - Export format (pdf, csv, pptx, json)
   */
  async selectExportFormat(format: 'pdf' | 'csv' | 'pptx' | 'json'): Promise<void> {
    const formatMap = {
      pdf: this.pdfFormatRadio,
      csv: this.csvFormatRadio,
      pptx: this.pptxFormatRadio,
      json: this.jsonFormatRadio,
    };
    
    const selector = formatMap[format];
    await this.page.locator(selector).check();
  }

  /**
   * Set company name for export customization (Pro feature)
   */
  async setCompanyName(name: string): Promise<void> {
    await this.fill(this.companyNameInput, name);
  }

  /**
   * Set author name for export customization (Pro feature)
   */
  async setAuthorName(name: string): Promise<void> {
    await this.fill(this.authorNameInput, name);
  }

  /**
   * Select presentation theme (Pro feature)
   * @param theme - Theme name (professional, modern, minimal)
   */
  async selectPresentationTheme(theme: 'professional' | 'modern' | 'minimal'): Promise<void> {
    const themeRadio = this.page.locator(`input[type="radio"][value="${theme}"]`);
    await themeRadio.check();
  }

  /**
   * Set email recipient for export
   */
  async setEmailRecipient(email: string): Promise<void> {
    await this.fill(this.emailInput, email);
  }

  /**
   * Send export via email
   */
  async sendExportEmail(): Promise<void> {
    await this.click(this.sendEmailButton);
    await this.page.waitForTimeout(1000);
  }

  /**
   * Download export file
   * @returns Promise that resolves when download starts
   */
  async downloadExport(): Promise<void> {
    // Set up download handler
    const downloadPromise = this.page.waitForEvent('download');
    
    await this.click(this.exportDownloadButton);
    
    // Wait for download to start
    const download = await downloadPromise;
    
    // Wait for download to complete
    await download.path();
  }

  /**
   * Get export progress percentage
   */
  async getExportProgress(): Promise<number> {
    const progressBar = this.page.locator(this.exportProgress);
    const isVisible = await progressBar.isVisible();
    
    if (!isVisible) {
      return 0;
    }
    
    const ariaValueNow = await progressBar.getAttribute('aria-valuenow');
    return ariaValueNow ? parseInt(ariaValueNow, 10) : 0;
  }

  /**
   * Get export status message
   */
  async getExportMessage(): Promise<string> {
    const messageElement = this.page.locator(this.exportMessage).last();
    return await messageElement.textContent() || '';
  }

  /**
   * Wait for export to complete
   * @param timeoutMs - Maximum time to wait in milliseconds
   */
  async waitForExportComplete(timeoutMs: number = 30000): Promise<void> {
    await this.page.waitForSelector(this.exportingButton, { state: 'hidden', timeout: timeoutMs });
  }

  /**
   * Check if export format is available (not locked behind Pro)
   * @param format - Export format to check
   */
  async isExportFormatAvailable(format: 'pdf' | 'csv' | 'pptx' | 'json'): Promise<boolean> {
    const formatMap = {
      pdf: this.pdfFormatRadio,
      csv: this.csvFormatRadio,
      pptx: this.pptxFormatRadio,
      json: this.jsonFormatRadio,
    };
    
    const selector = formatMap[format];
    const radio = this.page.locator(selector);
    const isDisabled = await radio.isDisabled();
    
    return !isDisabled;
  }
}
