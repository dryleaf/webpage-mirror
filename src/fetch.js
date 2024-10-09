import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { URL } from 'url';
import * as cheerio from 'cheerio';


/**
 * Download a file
 * 
 * @param {*} url 
 * @param {*} filePath 
 * @returns 
 */
export async function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filePath);
    
    protocol.get(url, response => {
      if (response.statusCode !== 200) {
        reject(`Failed to download: ${url} - Status code: ${response.statusCode}`);
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve(filePath));
      });
    }).on('error', err => {
      reject(`Error downloading ${url}: ${err.message}`);
    });
  });
}

/**
 * Fetch a web page and its assets, or metadata if included
 * 
 * @param {*} url 
 * @param {*} metadataFlag 
 * @returns 
 */
export async function fetchPage(url, metadataFlag = false) {
  const parsedUrl = new URL(url);
  const protocol = parsedUrl.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    protocol.get(url, async (response) => {
      if (response.statusCode !== 200) {
        return reject(`Failed to fetch page: ${url} - Status: ${response.statusCode}`);
      }

      let html = '';
      response.on('data', chunk => { html += chunk; });
      response.on('end', async () => {
        try {
          const fileName = `${parsedUrl.hostname}.html`;
          const filePath = path.join(process.cwd(), fileName);
          fs.writeFileSync(filePath, html, 'utf-8');
          console.log(`Saved HTML to: ${filePath}`);

          // Load the HTML for parsing assets
          const $ = cheerio.load(html);
          const assetDir = path.join(process.cwd(), 'assets', parsedUrl.hostname);
          if (!fs.existsSync(assetDir)) fs.mkdirSync(assetDir, { recursive: true });

          const assetPromises = [];
          
          // For counting links and images
          let linkCount = 0;
          let imageCount = 0;

          // Find all assets (images, css, scripts)
          $('img, link[rel], script[src], a').each((i, el) => {
            const assetUrl = new URL($(el).attr('src') || $(el).attr('href'), url).href;
            const assetFileName = path.basename(assetUrl.split('?')[0]);
            const assetPath = path.join(assetDir, assetFileName);
            
            if ($(el).is('img')) {
              imageCount++;
              $(el).attr('src', `./assets/${parsedUrl.hostname}/${assetFileName}`);
              assetPromises.push(downloadFile(assetUrl, assetPath));
            } else if ($(el).is('link[rel]')) {
              const relAttr = $(el).attr('rel');
              if (relAttr && (relAttr.includes('icon') || relAttr.includes('stylesheet'))) {
                $(el).attr('href', `./assets/${parsedUrl.hostname}/${assetFileName}`);
                assetPromises.push(downloadFile(assetUrl, assetPath));
              }
            } else if ($(el).is('script[src]')) {
              $(el).attr('src', `./assets/${parsedUrl.hostname}/${assetFileName}`);
              assetPromises.push(downloadFile(assetUrl, assetPath));
            } else if ($(el).is('a')) {
              linkCount++;
            }
          });
          
          await Promise.all(assetPromises);
          fs.writeFileSync(filePath, $.html(), 'utf-8');
          console.log(`Assets saved for: ${url}`);

          // Print metadata
          if (metadataFlag) {
            const lastFetch = new Date().toUTCString();
            console.log(`site: ${parsedUrl.hostname}`);
            console.log(`num_links: ${linkCount}`);
            console.log(`images: ${imageCount}`);
            console.log(`last_fetch: ${lastFetch}`);
          }

          resolve();
        } catch (error) {
            reject(`Error processing page: ${error}`);
        }
      });
    }).on('error', err => {
        reject(`Error fetching ${url}: ${err.message}`);
    });
  });
}

// Run from command-line
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    const args = process.argv.slice(2);
    const metadataFlag = args.includes('--metadata');
    const urls = args.filter(arg => arg !== '--metadata');

    if (urls.length === 0) {
      console.error("Usage: ./fetch [--metadata] <url1> <url2> ...");
      process.exit(1);
    }

    for (const url of urls) {
      try {
        console.log(`Fetching ${url}...`);
        await fetchPage(url, metadataFlag);
      } catch (error) {
        console.error(error);
      }
    }
  })();
}
