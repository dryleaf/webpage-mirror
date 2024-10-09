import { expect } from 'chai';
import nock from 'nock';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchPage, downloadFile } from '../src/fetch.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test cases for downloadFile function
describe('downloadFile', () => {
  const testUrl = 'http://example.com/test.jpg';
  const filePath = path.join(__dirname, 'test.jpg');

  beforeEach(async () => {
    await fs.remove(filePath);
  });

  afterEach(async () => {
    await fs.remove(filePath);
  });

  it('should download a file successfully', async () => {
    nock('http://example.com')
      .get('/test.jpg')
      .reply(200, 'image content');

    // verify the file was saved
    await downloadFile(testUrl, filePath);
    const fileExists = await fs.pathExists(filePath);
    expect(fileExists).to.be.true;
  });

  it('should handle non-200 response codes', async () => {
    nock('http://example.com')
      .get('/test.jpg')
      .reply(404);

    try {
      await downloadFile(testUrl, filePath);
    } catch (error) {
      expect(error).to.equal(`Failed to download: ${testUrl} - Status code: 404`);
    }
  });

  it('should handle network errors', async () => {
    nock('http://example.com')
      .get('/test.jpg')
      .replyWithError('Network Error');

    try {
      await downloadFile(testUrl, filePath);
    } catch (error) {
      expect(error).to.include('Error downloading');
    }
  });
});

// Test cases for fetchPage function
describe('fetchPage', () => {
  const testUrl = 'http://example.com';
  const htmlContent = '<html><body><img src="image.jpg"><a href="/link"></a></body></html>';
  const htmlFilePath = path.join(process.cwd(), 'example.com.html');
  const assetDir = path.join(process.cwd(), 'assets', 'example.com');

  beforeEach(async () => {
    await fs.remove(htmlFilePath);
    await fs.remove(assetDir);
  });

  afterEach(async () => {
    await fs.remove(htmlFilePath);
    await fs.remove(assetDir);
  });

  it('should fetch a page and save HTML', async () => {
    // for the page response
    const scope = nock('http://example.com')
      .get('/')
      .reply(200, `
        <html>
          <head></head>
          <body>
            <img src="http://example.com/image.jpg" />
            <link rel="stylesheet" href="http://example.com/style.css" />
          </body>
        </html>
      `);

    // for image download
    nock('http://example.com')
      .get('/image.jpg')
      .reply(200, 'image data');

    // for CSS download
    nock('http://example.com')
      .get('/style.css')
      .reply(200, 'css data');

    await fetchPage('http://example.com');

    const htmlFilePath = path.join(__dirname, '../example.com.html');
    const assetsDir = path.join(__dirname, '../assets/example.com');
    
    // HTML file was created
    expect(await fs.pathExists(htmlFilePath)).to.be.true;

    // assets directory was created
    expect(await fs.pathExists(assetsDir)).to.be.true;

    // the image and CSS files were saved
    expect(await fs.pathExists(path.join(assetsDir, 'image.jpg'))).to.be.true;
    expect(await fs.pathExists(path.join(assetsDir, 'style.css'))).to.be.true;

    scope.done();
  });

  it('should download assets (images)', async () => {
    nock(testUrl)
      .get('/')
      .reply(200, htmlContent);

    nock(testUrl)
      .get('/image.jpg')
      .reply(200, 'image content');

    await fetchPage(testUrl);

    const imageExists = await fs.pathExists(path.join(assetDir, 'image.jpg'));
    expect(imageExists).to.be.true;
  });

  it('should handle non-200 response for page fetching', async () => {
    nock(testUrl)
      .get('/')
      .reply(404);

    try {
      await fetchPage(testUrl);
    } catch (error) {
      expect(error).to.equal(`Failed to fetch page: ${testUrl} - Status: 404`);
    }
  });

  it('should print metadata when metadataFlag is true', async () => {
    // for the page response
    const scope = nock('http://example.com')
      .get('/')
      .reply(200, `
        <html>
          <head></head>
          <body>
            <a href="https://example.com/link1">Link 1</a>
            <a href="https://example.com/link2">Link 2</a>
            <img src="http://example.com/image.jpg" />
          </body>
        </html>
      `);

    // for the image download
    nock('http://example.com')
      .get('/image.jpg')
      .reply(200, 'image data');

    // to capture console output
    const consoleLog = [];
    console.log = (...args) => consoleLog.push(...args);

    await fetchPage('http://example.com', true);

    // Check metadata
    expect(consoleLog).to.include.members([
      'site: example.com',
      'num_links: 2',
      'images: 1',
    ]);

    scope.done();
  });
});
