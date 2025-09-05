"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.glsService = exports.GlsService = void 0;
const selenium_webdriver_1 = require("selenium-webdriver");
const chrome_1 = __importDefault(require("selenium-webdriver/chrome"));
class GlsService {
    constructor(headless = true) {
        this.driver = null;
        this.headless = true;
        this.headless = headless;
    }
    setupChromeOptions() {
        const options = new chrome_1.default.Options();
        options.addArguments('--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-features=VizDisplayCompositor', '--ignore-ssl-errors=yes', '--ignore-certificate-errors', '--allow-running-insecure-content', '--disable-web-security', '--proxy-auto-detect', // ZScaler compatibility
        '--disable-blink-features=AutomationControlled', '--disable-extensions', '--no-first-run', '--disable-default-apps');
        if (this.headless) {
            options.addArguments('--headless');
        }
        return options;
    }
    async initializeDriver() {
        if (this.driver) {
            await this.driver.quit();
        }
        const options = this.setupChromeOptions();
        this.driver = await new selenium_webdriver_1.Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .build();
    }
    async login(username, password, progressCallback) {
        try {
            if (!this.driver) {
                await this.initializeDriver();
            }
            progressCallback?.('connecting', 'Verbindung zu GLS Portal...', 10);
            // Navigate to GLS Portal
            await this.driver.get('https://gls-group.eu/AT/de/login');
            progressCallback?.('logging_in', 'Anmeldung läuft...', 30);
            // Wait for login form
            await this.driver.wait(selenium_webdriver_1.until.elementLocated(selenium_webdriver_1.By.css('#ctl00_ctl00_ContentMain_ContentMain_txtUserName')), 10000);
            // Enter credentials
            const usernameField = await this.driver.findElement(selenium_webdriver_1.By.css('#ctl00_ctl00_ContentMain_ContentMain_txtUserName'));
            const passwordField = await this.driver.findElement(selenium_webdriver_1.By.css('#ctl00_ctl00_ContentMain_ContentMain_txtPassword'));
            await usernameField.clear();
            await usernameField.sendKeys(username);
            await passwordField.clear();
            await passwordField.sendKeys(password);
            progressCallback?.('logging_in', 'Anmeldedaten übertragen...', 50);
            // Submit login
            const loginButton = await this.driver.findElement(selenium_webdriver_1.By.css('#ctl00_ctl00_ContentMain_ContentMain_btnLogin'));
            await loginButton.click();
            progressCallback?.('logging_in', 'Warten auf Anmeldung...', 70);
            // Wait for redirect and verify login success
            await this.driver.wait(selenium_webdriver_1.until.urlContains('dashboard'), 10000);
            progressCallback?.('logging_in', 'Anmeldung erfolgreich', 100);
            return true;
        }
        catch (error) {
            console.error('Login failed:', error);
            progressCallback?.('error', `Anmeldung fehlgeschlagen: ${error.message}`, 0);
            return false;
        }
    }
    async trackPackage(trackingNumber, progressCallback) {
        try {
            if (!this.driver) {
                throw new Error('Driver not initialized. Please login first.');
            }
            progressCallback?.('navigating', 'Navigation zu Tracking-Seite...', 20);
            // Navigate to tracking page
            await this.driver.get('https://gls-group.eu/AT/de/tracking');
            // Wait for tracking form
            await this.driver.wait(selenium_webdriver_1.until.elementLocated(selenium_webdriver_1.By.css('#txtTrackingNumber')), 10000);
            progressCallback?.('searching', 'Sendung wird gesucht...', 40);
            // Enter tracking number
            const trackingInput = await this.driver.findElement(selenium_webdriver_1.By.css('#txtTrackingNumber'));
            await trackingInput.clear();
            await trackingInput.sendKeys(trackingNumber);
            // Submit search
            const searchButton = await this.driver.findElement(selenium_webdriver_1.By.css('#btnSearch'));
            await searchButton.click();
            progressCallback?.('searching', 'Suchergebnisse werden geladen...', 60);
            // Wait for results
            await this.driver.wait(selenium_webdriver_1.until.elementLocated(selenium_webdriver_1.By.css('.tracking-results-table')), 10000);
            progressCallback?.('extracting', 'Daten werden extrahiert...', 80);
            // Extract main tracking info
            const statusElement = await this.driver.findElement(selenium_webdriver_1.By.css('td.status-column'));
            const locationElement = await this.driver.findElement(selenium_webdriver_1.By.css('td.location-column'));
            const dateElement = await this.driver.findElement(selenium_webdriver_1.By.css('td.date-column'));
            const status = await statusElement.getText();
            const location = await locationElement.getText();
            const lastUpdateText = await dateElement.getText();
            const lastUpdate = new Date(lastUpdateText);
            // Get detailed events
            const detailsLink = await this.driver.findElement(selenium_webdriver_1.By.css('a.details-link'));
            await detailsLink.click();
            await this.driver.wait(selenium_webdriver_1.until.elementLocated(selenium_webdriver_1.By.css('.tracking-events-table')), 5000);
            const eventRows = await this.driver.findElements(selenium_webdriver_1.By.css('tr.event-row'));
            const events = [];
            for (const row of eventRows) {
                try {
                    const date = await row.findElement(selenium_webdriver_1.By.css('.event-date')).getText();
                    const time = await row.findElement(selenium_webdriver_1.By.css('.event-time')).getText();
                    const description = await row.findElement(selenium_webdriver_1.By.css('.event-description')).getText();
                    const eventLocation = await row.findElement(selenium_webdriver_1.By.css('.event-location')).getText();
                    events.push({ date, time, description, location: eventLocation });
                }
                catch (err) {
                    // Skip malformed event rows
                    continue;
                }
            }
            progressCallback?.('complete', 'Tracking erfolgreich abgeschlossen', 100);
            return {
                trackingNumber,
                status,
                location,
                lastUpdate,
                events
            };
        }
        catch (error) {
            progressCallback?.('error', `Tracking fehlgeschlagen: ${error.message}`, 0);
            throw new Error(`Tracking failed: ${error.message}`);
        }
    }
    async quit() {
        if (this.driver) {
            await this.driver.quit();
            this.driver = null;
        }
    }
}
exports.GlsService = GlsService;
// Singleton instance
exports.glsService = new GlsService(process.env.NODE_ENV === 'production');
//# sourceMappingURL=glsService.js.map