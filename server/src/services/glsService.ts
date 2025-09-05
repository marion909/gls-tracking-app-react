import { Builder, By, until, WebDriver, Key } from 'selenium-webdriver';
import edge from 'selenium-webdriver/edge';

export interface TrackingResult {
  trackingNumber: string;
  status: string;
  location?: string;
  lastUpdate?: Date;
  events: TrackingEvent[];
}

export interface ShipmentSummary {
  trackingNumber: string;
  customerName: string;
  status: string;
  location?: string;
  lastUpdate?: Date;
  isOverdue: boolean;
}

export interface TrackingEvent {
  date: string;
  time: string;
  description: string;
  location: string;
}

export interface ProgressCallback {
  (step: string, message: string, progress: number): void;
}

export class GlsService {
  private driver: WebDriver | null = null;
  private headless: boolean = true;

  constructor(headless: boolean = true) {
    this.headless = headless;
  }

  private setupEdgeOptions(): edge.Options {
    const options = new edge.Options();
    options.addArguments(
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-features=VizDisplayCompositor',
      '--ignore-ssl-errors=yes',
      '--ignore-certificate-errors',
      '--allow-running-insecure-content',
      '--disable-web-security',
      '--proxy-auto-detect', // ZScaler compatibility
      '--disable-blink-features=AutomationControlled',
      '--disable-extensions',
      '--no-first-run',
      '--disable-default-apps'
    );

    if (this.headless) {
      options.addArguments('--headless');
    }

    return options;
  }

  async initializeDriver(): Promise<void> {
    if (this.driver) {
      await this.driver.quit();
    }

    const options = this.setupEdgeOptions();
    this.driver = await new Builder()
      .forBrowser('MicrosoftEdge')
      .setEdgeOptions(options)
      .build();
  }

  async login(username: string, password: string, progressCallback?: ProgressCallback): Promise<boolean> {
    try {
      if (!this.driver) {
        await this.initializeDriver();
      }

      progressCallback?.('connecting', 'Verbindung zu GLS Portal...', 10);

      // Navigate to GLS Portal - Improved URL like C# version
      await this.driver!.get('https://gls-group.eu/authenticate/?locale=de-AT');

      progressCallback?.('logging_in', 'Warte auf Weiterleitung zur Login-Seite...', 20);

      // Wait for automatic redirect to Keycloak login page
      await this.driver!.wait(
        until.urlContains('auth.dc.gls-group.eu'),
        10000
      );

      console.log(`✅ Auf Login-Seite: ${await this.driver!.getCurrentUrl()}`);
      await this.driver!.sleep(2000);

      progressCallback?.('logging_in', 'Suche Anmeldefelder...', 30);

      // Search for username field with multiple strategies (from C# version)
      console.log('🔍 Suche Benutzername-Feld...');
      let usernameField = null;

      const usernameSelectors = [
        By.id('username'),
        By.name('username'),
        By.css('input[name="username"]'),
        By.css('#username'),
        By.css('input[type="text"]'),
        By.css('input[placeholder*="Benutzer"]'),
        By.css('input[placeholder*="User"]'),
        By.css('input[placeholder*="Email"]'),
        By.xpath('//input[@type="text" or @type="email"]')
      ];

      for (const selector of usernameSelectors) {
        try {
          usernameField = await this.driver!.wait(until.elementLocated(selector), 200);
          if (await usernameField.isDisplayed() && await usernameField.isEnabled()) {
            console.log(`✅ Username-Feld gefunden mit: ${selector}`);
            break;
          }
        } catch (error) {
          // Try next selector
        }
      }

      if (!usernameField) {
        throw new Error('Username-Feld nicht gefunden');
      }

      // Enter credentials
      console.log('✏️ Gebe Benutzername ein...');
      await usernameField.clear();
      await usernameField.sendKeys(username);
      
      // Press Enter after username (from C# version)
      console.log('⌨️ Drücke Enter nach Benutzername...');
      await usernameField.sendKeys(Key.ENTER);
      await this.driver!.sleep(1000);

      progressCallback?.('logging_in', 'Gebe Passwort ein...', 50);

      // Search for password field
      console.log('🔍 Suche Passwort-Feld...');
      let passwordField = null;

      const passwordSelectors = [
        By.id('password'),
        By.name('password'),
        By.css('input[name="password"]'),
        By.css('#password'),
        By.css('input[type="password"]'),
        By.xpath('//input[@type="password"]')
      ];

      for (const selector of passwordSelectors) {
        try {
          passwordField = await this.driver!.findElement(selector);
          if (await passwordField.isDisplayed() && await passwordField.isEnabled()) {
            console.log(`✅ Passwort-Feld gefunden mit: ${selector}`);
            break;
          }
        } catch (error) {
          // Try next selector
        }
      }

      if (!passwordField) {
        throw new Error('Passwort-Feld nicht gefunden');
      }

      console.log('🔑 Gebe Passwort ein...');
      await passwordField.clear();
      await passwordField.sendKeys(password);
      await this.driver!.sleep(1000);

      // Simply press Enter after password input (most reliable way from C# version)
      console.log('⌨️ Drücke Enter zum Anmelden...');
      await passwordField.sendKeys(Key.ENTER);

      progressCallback?.('logging_in', 'Warte auf Login-Ergebnis...', 70);
      console.log('⏳ Warte auf Login-Ergebnis...');
      await this.driver!.sleep(500); // Wait for login processing

      // Check if login was successful (improved from C# version)
      const currentUrl = await this.driver!.getCurrentUrl();
      console.log(`📍 Nach Login URL: ${currentUrl}`);

      // Success if we're no longer on login page and no error messages
      const pageSource = await this.driver!.getPageSource();
      const loginSuccessful = !currentUrl.includes('/login-actions/authenticate') && 
                             !currentUrl.includes('/auth/realms/gls/login') &&
                             !pageSource.includes('Invalid username or password') &&
                             !pageSource.includes('Ungültiger Benutzername oder Passwort') &&
                             !pageSource.includes('Account is disabled') &&
                             !pageSource.includes('error');

      if (loginSuccessful) {
        console.log(`✅ Login erfolgreich! Weitergeleitet zu: ${currentUrl}`);
        progressCallback?.('logging_in', 'Anmeldung erfolgreich', 100);
        return true;
      } else {
        console.log('❌ Login fehlgeschlagen oder noch auf Login-Seite');
        console.log(`🌐 Aktuelle URL: ${currentUrl}`);
        
        // Search for error messages (from C# version)
        const errorSelectors = [
          '.alert-error', '.error', '.alert-danger', '.text-danger', 
          '[class*="error"]', '#input-error', '.kc-feedback-text',
          '.login-error', '.auth-error'
        ];
        
        for (const selector of errorSelectors) {
          try {
            const errorElements = await this.driver!.findElements(By.css(selector));
            for (const error of errorElements) {
              const errorText = await error.getText();
              if (errorText && errorText.trim()) {
                console.log(`❗ Fehlermeldung (${selector}): ${errorText}`);
              }
            }
          } catch (error) {
            // Continue with next selector
          }
        }
        
        progressCallback?.('error', 'Anmeldung fehlgeschlagen', 0);
        return false;
      }
    } catch (error: any) {
      console.error('Login failed:', error);
      progressCallback?.('error', `Anmeldung fehlgeschlagen: ${error.message}`, 0);
      return false;
    }
  }

  async trackPackage(
    trackingNumber: string,
    progressCallback?: ProgressCallback
  ): Promise<TrackingResult> {
    try {
      if (!this.driver) {
        throw new Error('Driver not initialized. Please login first.');
      }

      progressCallback?.('navigating', 'Navigation zu Tracking-Seite...', 20);

      // Navigate to tracking page
      await this.driver.get('https://gls-group.eu/AT/de/tracking');

      // Wait for tracking form
      await this.driver.wait(until.elementLocated(By.css('#txtTrackingNumber')), 100);

      progressCallback?.('searching', 'Sendung wird gesucht...', 40);

      // Enter tracking number
      const trackingInput = await this.driver.findElement(By.css('#txtTrackingNumber'));
      await trackingInput.clear();
      await trackingInput.sendKeys(trackingNumber);

      // Submit search
      const searchButton = await this.driver.findElement(By.css('#btnSearch'));
      await searchButton.click();

      progressCallback?.('searching', 'Suchergebnisse werden geladen...', 60);

      // Wait for results
      await this.driver.wait(until.elementLocated(By.css('.tracking-results-table')), 100);

      progressCallback?.('extracting', 'Daten werden extrahiert...', 80);

      // Extract main tracking info
      const statusElement = await this.driver.findElement(By.css('td.status-column'));
      const locationElement = await this.driver.findElement(By.css('td.location-column'));
      const dateElement = await this.driver.findElement(By.css('td.date-column'));

      const status = await statusElement.getText();
      const location = await locationElement.getText();
      const lastUpdateText = await dateElement.getText();
      const lastUpdate = new Date(lastUpdateText);

      // Get detailed events
      const detailsLink = await this.driver.findElement(By.css('a.details-link'));
      await detailsLink.click();

      await this.driver.wait(until.elementLocated(By.css('.tracking-events-table')), 100);

      const eventRows = await this.driver.findElements(By.css('tr.event-row'));
      const events: TrackingEvent[] = [];

      for (const row of eventRows) {
        try {
          const date = await row.findElement(By.css('.event-date')).getText();
          const time = await row.findElement(By.css('.event-time')).getText();
          const description = await row.findElement(By.css('.event-description')).getText();
          const eventLocation = await row.findElement(By.css('.event-location')).getText();

          events.push({ date, time, description, location: eventLocation });
        } catch (err) {
          // Skip malformed event rows
          continue;
        }
      }

      progressCallback?.('complete', 'Tracking erfolgreich abgeschlossen', 50);

      return {
        trackingNumber,
        status,
        location,
        lastUpdate,
        events
      };
    } catch (error: any) {
      progressCallback?.('error', `Tracking fehlgeschlagen: ${error.message}`, 0);
      throw new Error(`Tracking failed: ${error.message}`);
    }
  }

  async loadAllShipments(progressCallback?: ProgressCallback): Promise<ShipmentSummary[]> {
    try {
      if (!this.driver) {
        throw new Error('Driver not initialized. Please login first.');
      }

      progressCallback?.('navigating', 'Navigation zu Sendungsübersicht...', 10);

      // Navigate to shipment overview page (from C# version)
      await this.driver.get('https://gls-group.eu/app/service/closed/page/AT/de/witt004#/');
      await this.driver.sleep(5000); // Wait for page to load

      progressCallback?.('loading', 'Klicke auf Search-Button...', 30);

      // Click search button first (from C# version)
      await this.clickSearchButton();

      progressCallback?.('processing', 'Sendungsdaten werden verarbeitet...', 50);

      // Scrape shipment details using improved method
      const shipmentDetails = await this.scrapeShipmentDetails(progressCallback);

      progressCallback?.('complete', `${shipmentDetails.length} Sendungen erfolgreich geladen`, 100);

      return shipmentDetails;

    } catch (error: any) {
      progressCallback?.('error', `Laden der Sendungen fehlgeschlagen: ${error.message}`, 0);
      throw new Error(`Failed to load shipments: ${error.message}`);
    }
  }

  private async clickSearchButton(): Promise<void> {
    try {
      // Wait for page to be fully loaded
      await this.driver!.sleep(3000);

      console.log('🔍 Suche Search-Button mit ID "search"...');

      // Multiple strategies to find the search button (from C# version)
      const searchButtonSelectors = [
        By.id('search'),
        By.css('#search'),
        By.css('button#search'),
        By.css('input#search'),
        By.css('[id="search"]'),
        By.xpath('//button[@id="search"]'),
        By.xpath('//input[@id="search"]'),
        By.xpath('//*[@id="search"]')
      ];

      let searchButton = null;

      for (const selector of searchButtonSelectors) {
        try {
          searchButton = await this.driver!.findElement(selector);
          if (await searchButton.isDisplayed() && await searchButton.isEnabled()) {
            console.log(`✅ Search-Button gefunden mit: ${selector}`);
            break;
          }
        } catch (error) {
          // Try next selector
        }
      }

      if (!searchButton) {
        console.log('⚠️ Search-Button mit ID "search" nicht gefunden. Suche nach alternativen Buttons...');

        // Alternative search for search buttons (from C# version)
        const alternativeSelectors = [
          By.css('button[type="submit"]'),
          By.css('input[type="submit"]'),
          By.css('.search-button'),
          By.css('.btn-search'),
          By.xpath('//button[contains(text(),"Search")]'),
          By.xpath('//button[contains(text(),"Suchen")]'),
          By.xpath('//input[@value="Search"]'),
          By.xpath('//input[@value="Suchen"]')
        ];

        for (const selector of alternativeSelectors) {
          try {
            searchButton = await this.driver!.findElement(selector);
            if (await searchButton.isDisplayed() && await searchButton.isEnabled()) {
              console.log(`✅ Alternative Search-Button gefunden mit: ${selector}`);
              break;
            }
          } catch (error) {
            // Try next selector
          }
        }
      }

      if (searchButton) {
        console.log('🖱️ Klicke auf Search-Button...');

        // Scroll to button if necessary
        await this.driver!.executeScript('arguments[0].scrollIntoView(true);', searchButton);
        await this.driver!.sleep(1000);

        // Click the button
        await searchButton.click();

        console.log('✅ Search-Button geklickt. Warte auf Ergebnisse...');
        await this.driver!.sleep(5000); // Wait for search results to load
      } else {
        console.log('❌ Kein Search-Button gefunden. Liste alle verfügbaren Buttons auf:');

        // Debug: Show all available buttons (from C# version)
        const allButtons = await this.driver!.findElements(By.tagName('button'));
        const allInputs = await this.driver!.findElements(By.css('input[type="submit"], input[type="button"]'));

        console.log(`🔍 Gefundene Buttons: ${allButtons.length}`);
        for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
          const button = allButtons[i];
          try {
            const id = await button.getAttribute('id');
            const className = await button.getAttribute('class');
            const text = await button.getText();
            const type = await button.getAttribute('type');
            console.log(`   - Button: ID='${id}', Class='${className}', Text='${text}', Type='${type}'`);
          } catch (error) {
            // Skip problematic buttons
          }
        }

        console.log(`🔍 Gefundene Input-Buttons: ${allInputs.length}`);
        for (let i = 0; i < Math.min(allInputs.length, 5); i++) {
          const input = allInputs[i];
          try {
            const id = await input.getAttribute('id');
            const className = await input.getAttribute('class');
            const value = await input.getAttribute('value');
            const type = await input.getAttribute('type');
            console.log(`   - Input: ID='${id}', Class='${className}', Value='${value}', Type='${type}'`);
          } catch (error) {
            // Skip problematic inputs
          }
        }

        throw new Error('Search-Button konnte nicht gefunden werden');
      }
    } catch (error: any) {
      console.log(`❌ Fehler beim Klicken des Search-Buttons: ${error.message}`);
      throw error;
    }
  }

  private async scrapeShipmentDetails(progressCallback?: ProgressCallback): Promise<ShipmentSummary[]> {
    const shipmentDetails: ShipmentSummary[] = [];

    try {
      // Wait for search results to be fully loaded
      await this.driver!.sleep(3000);

      console.log('🔍 Analysiere Seitenstruktur nach Sendungsdetails...');

      // Primary search: Specific <a> elements with ng-click="openDetail(parcel.tuNo, '')" (from C# version)
      console.log('🎯 Suche nach spezifischen ng-click Links...');

      const specificSelectors = [
        // Exact match with ng-click attribute
        'a[ng-click="openDetail(parcel.tuNo, \'\')"]',
        'a[ng-click=\'openDetail(parcel.tuNo, "")\']',
        
        // Partial match with ng-click
        'a[ng-click*="openDetail"]',
        'a[ng-click*="parcel.tuNo"]',
        
        // Class-based search for similar elements
        'a.ng-binding[ng-click*="openDetail"]',
        'a[class*="ng-binding"][ng-click*="parcel"]'
      ];

      for (const selector of specificSelectors) {
        try {
          const elements = await this.driver!.findElements(By.css(selector));
          console.log(`🔍 Selektor '${selector}': ${elements.length} Elemente gefunden`);

          for (let i = 0; i < elements.length; i++) {
            try {
              const element = elements[i];
              const trackingNumber = (await element.getText())?.trim();
              if (trackingNumber && this.isValidTrackingNumber(trackingNumber)) {
                // Check if this tracking number was already captured
                if (!shipmentDetails.some(s => s.trackingNumber === trackingNumber)) {
                  // Progress update
                  const progressPercent = 50 + (i / elements.length) * 40; // 50% to 90%
                  progressCallback?.('processing', `Verarbeite Sendung ${i + 1}/${elements.length}: ${trackingNumber}`, Math.round(progressPercent));
                  
                  // Collect additional details for this shipment
                  const shipmentDetail = await this.extractShipmentDetails(element, trackingNumber);
                  shipmentDetails.push(shipmentDetail);

                  console.log(`✅ Sendung gefunden: ${trackingNumber} | Status: ${shipmentDetail.status} | Empfänger: ${shipmentDetail.customerName}`);
                }
              }
            } catch (error) {
              // Element not accessible, continue to next
            }
          }
        } catch (error) {
          // Selector not valid, continue to next
        }
      }

      // Secondary search: All <a> elements with ng-click attribute (from C# version)
      if (shipmentDetails.length === 0) {
        console.log('🔍 Erweiterte Suche nach allen ng-click Links...');

        try {
          const allNgClickLinks = await this.driver!.findElements(By.css('a[ng-click]'));
          console.log(`🔗 ${allNgClickLinks.length} ng-click Links gefunden`);

          for (const link of allNgClickLinks) {
            try {
              const ngClick = await link.getAttribute('ng-click');
              const text = (await link.getText())?.trim();
              const className = await link.getAttribute('class');

              console.log(`   - Link: ng-click='${ngClick}', text='${text}', class='${className}'`);

              if (text && this.isValidTrackingNumber(text)) {
                if (!shipmentDetails.some(s => s.trackingNumber === text)) {
                  const shipmentDetail = await this.extractShipmentDetails(link, text);
                  shipmentDetails.push(shipmentDetail);

                  console.log(`✅ Sendung aus ng-click Link: ${text} | Status: ${shipmentDetail.status} | Empfänger: ${shipmentDetail.customerName}`);
                }
              }
            } catch (error) {
              // Element not accessible
            }
          }
        } catch (error: any) {
          console.log(`⚠️ Fehler bei ng-click Link Suche: ${error.message}`);
        }
      }

      // Debug: Show page structure if no numbers found (from C# version)
      if (shipmentDetails.length === 0) {
        console.log('🔍 Debug: Analysiere Seitenstruktur...');

        try {
          // Show all available ng-click attributes
          const allNgElements = await this.driver!.findElements(By.css('[ng-click]'));
          console.log(`📋 ${allNgElements.length} Elemente mit ng-click gefunden:`);

          for (let i = 0; i < Math.min(allNgElements.length, 10); i++) {
            const element = allNgElements[i];
            try {
              const tagName = await element.getTagName();
              const ngClick = await element.getAttribute('ng-click');
              const text = (await element.getText())?.trim();
              const className = await element.getAttribute('class');

              console.log(`   - ${tagName}: ng-click='${ngClick}', text='${text}', class='${className}'`);
            } catch (error) {
              // Skip problematic elements
            }
          }

          // Search for tables or lists that might contain tracking numbers
          const tables = await this.driver!.findElements(By.tagName('table'));
          console.log(`📊 ${tables.length} Tabellen gefunden`);

          const lists = await this.driver!.findElements(By.tagName('ul'));
          console.log(`📋 ${lists.length} Listen gefunden`);

        } catch (error: any) {
          console.log(`⚠️ Fehler bei Debug-Analyse: ${error.message}`);
        }
      }

      console.log(`📋 Insgesamt ${shipmentDetails.length} eindeutige Sendungen gefunden`);
    } catch (error: any) {
      console.log(`❌ Fehler beim Scrapen der Sendungsdetails: ${error.message}`);
    }

    return shipmentDetails;
  }

  private async extractShipmentDetails(trackingElement: any, trackingNumber: string): Promise<ShipmentSummary> {
    const shipmentDetail: ShipmentSummary = {
      trackingNumber,
      customerName: 'Unbekannt',
      status: 'Unbekannt',
      location: undefined,
      lastUpdate: undefined,
      isOverdue: false
    };

    try {
      console.log(`🔍 Suche Details für Sendung ${trackingNumber}...`);

      // Find the parent tr element (from C# version)
      let parentRow = trackingElement;
      for (let i = 0; i < 5; i++) {
        try {
          parentRow = await parentRow.findElement(By.xpath('..'));
          const tagName = await parentRow.getTagName();
          if (tagName.toLowerCase() === 'tr') {
            break;
          }
        } catch (error) {
          break;
        }
      }

      if (parentRow && (await parentRow.getTagName()).toLowerCase() === 'tr') {
        console.log('✅ Tabellenzeile gefunden, suche Status...');

        // Search for status cell in the same row (from C# version)
        const statusSelectors = [
          './/td[contains(@id, "status_")]',
          './/td[contains(@class, "parcel-status")]',
          './/td[contains(@class, "ng-binding") and contains(@class, "bold")]',
          './/td[@ng-show and contains(@ng-show, "status")]'
        ];

        for (const selector of statusSelectors) {
          try {
            const statusElement = await parentRow.findElement(By.xpath(selector));
            if (statusElement) {
              const statusText = await statusElement.getText();
              if (statusText && statusText.trim()) {
                shipmentDetail.status = statusText.trim();
                console.log(`✅ Status gefunden: ${shipmentDetail.status}`);
                break;
              }
            }
          } catch (error) {
            // Try next selector
          }
        }

        // Search for recipient information in specific consigneeName cell (from C# version)
        console.log('🔍 Suche Empfänger-Information...');

        const recipientSelectors = [
          // Specific search for consigneeName cell
          './/td[contains(@id, "consigneeName_")]//p[contains(@class, "truncate-ellipsis")]',
          './/td[contains(@id, "consigneeName_")]//p[@title]',
          './/td[contains(@id, "consigneeName_")]//p',
          
          // Fallback: General search for recipient pattern
          './/p[contains(@class, "truncate-ellipsis") and contains(@class, "ng-binding") and contains(@class, "mb-0")]',
          './/p[contains(@class, "truncate-ellipsis") and contains(@class, "ng-binding")]',
          './/p[@ng-attr-title and contains(@class, "truncate-ellipsis")]',
          './/p[@title and contains(@class, "truncate-ellipsis")]'
        ];

        for (const selector of recipientSelectors) {
          try {
            const recipientElements = await parentRow.findElements(By.xpath(selector));
            for (const recipientElement of recipientElements) {
              const text = (await recipientElement.getText())?.trim();
              const title = (await recipientElement.getAttribute('title'))?.trim();
              const ngAttrTitle = (await recipientElement.getAttribute('ng-attr-title'))?.trim();

              // Prefer title attribute, then ng-attr-title, then text
              let potentialName = '';
              if (title) {
                potentialName = title;
              } else if (ngAttrTitle) {
                potentialName = ngAttrTitle;
              } else if (text) {
                potentialName = text;
              }

              console.log(`🔍 Prüfe potentiellen Empfänger: '${potentialName}' (title: '${title}', text: '${text}')`);

              if (potentialName && 
                  potentialName.length > 2 &&
                  /[a-zA-Z]/.test(potentialName) &&
                  !this.isValidTrackingNumber(potentialName) &&
                  !potentialName.toLowerCase().includes('status') &&
                  !potentialName.toLowerCase().includes('übermittelt') &&
                  !potentialName.toLowerCase().includes('zugestellt') &&
                  !potentialName.toLowerCase().includes('daten') &&
                  potentialName !== trackingNumber) {
                shipmentDetail.customerName = potentialName;
                console.log(`✅ Empfänger gefunden mit Selektor '${selector}': ${shipmentDetail.customerName}`);
                break;
              }
            }

            if (shipmentDetail.customerName !== 'Unbekannt') {
              break;
            }
          } catch (error: any) {
            console.log(`⚠️ Fehler bei Empfänger-Selektor '${selector}': ${error.message}`);
          }
        }

        // Search for date information in specific date cell (from C# version)
        console.log('🔍 Suche Datum-Information...');

        const dateSelectors = [
          // Specific search for date cell
          './/td[contains(@id, "date_")]//span[contains(@class, "ng-binding")]',
          './/td[contains(@id, "date_")]//span',
          './/td[contains(@id, "date_")]',
          
          // Fallback: General search for date pattern
          './/span[contains(@class, "ng-binding") and string-length(text()) <= 10 and contains(text(), ".")]',
          './/td[contains(@ng-show, "date")]//span'
        ];

        for (const selector of dateSelectors) {
          try {
            const dateElements = await parentRow.findElements(By.xpath(selector));
            for (const dateElement of dateElements) {
              const text = (await dateElement.getText())?.trim();

              console.log(`🔍 Prüfe potentielles Datum: '${text}'`);

              // Check if it's a date (format: DD.MM.YY or similar)
              if (text && 
                  text.length >= 6 && text.length <= 10 &&
                  text.includes('.') &&
                  text !== trackingNumber &&
                  !text.toLowerCase().includes('status') &&
                  !this.isValidTrackingNumber(text)) {
                // Additional validation for date format
                const parts = text.split('.');
                if (parts.length >= 2 && 
                    parts.every((part: string) => part.length >= 1 && /^\d+$/.test(part))) {
                  try {
                    // Parse German date format
                    const [day, month, year] = parts;
                    const fullYear = year.length === 2 ? `20${year}` : year;
                    const date = new Date(parseInt(fullYear), parseInt(month) - 1, parseInt(day));
                    
                    if (!isNaN(date.getTime())) {
                      shipmentDetail.lastUpdate = date;
                      
                      // Check if shipment is overdue (older than 7 days)
                      shipmentDetail.isOverdue = (Date.now() - date.getTime()) > (7 * 24 * 60 * 60 * 1000);
                      
                      console.log(`✅ Datum gefunden mit Selektor '${selector}': ${text}`);
                      break;
                    }
                  } catch (error) {
                    // Invalid date, continue
                  }
                }
              }
            }

            if (shipmentDetail.lastUpdate) {
              break;
            }
          } catch (error: any) {
            console.log(`⚠️ Fehler bei Datum-Selektor '${selector}': ${error.message}`);
          }
        }
      }
    } catch (error: any) {
      console.log(`⚠️ Fehler beim Extrahieren der Sendungsdetails für ${trackingNumber}: ${error.message}`);
    }

    return shipmentDetail;
  }

  private isValidTrackingNumber(text: string): boolean {
    if (!text || !text.trim()) {
      return false;
    }

    // Clean the text
    text = text.trim();

    // GLS tracking numbers are typically 11-15 digits
    if (text.length < 11 || text.length > 15) {
      return false;
    }

    // Must contain only digits
    if (!/^\d+$/.test(text)) {
      return false;
    }

    // Exclude obviously invalid numbers
    // (e.g., all same digits or very simple patterns)
    if (text.split('').every(c => c === text[0])) { // All digits same
      return false;
    }

    if (text === '00000000000' || text === '11111111111') { // Known test numbers
      return false;
    }

    return true;
  }

  private async extractTextSafely(element: any, selector: string): Promise<string | null> {
    try {
      const foundElement = await element.findElement(By.css(selector));
      return await foundElement.getText();
    } catch {
      return null;
    }
  }

  async quit(): Promise<void> {
    if (this.driver) {
      await this.driver.quit();
      this.driver = null;
    }
  }
}

// Singleton instance
export const glsService = new GlsService(process.env.NODE_ENV === 'production');
