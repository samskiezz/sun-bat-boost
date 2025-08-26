import { supabase } from '@/integrations/supabase/client';

interface CECProduct {
  manufacturer: string;
  model: string;
  series?: string;
  status: string;
  datasheetUrl?: string;
  productUrl?: string;
  cecRef?: string;
  category: 'PANEL' | 'INVERTER' | 'BATTERY_MODULE';
  rawData: any;
}

interface ScrapeResult {
  products: CECProduct[];
  totalFound: number;
  cursor?: string;
}

export class CECScraper {
  private readonly BASE_URL = 'https://www.cleanenergycouncil.org.au';
  private readonly USER_AGENT = 'HiltsTrainerBot/1.0 (Solar Research)';
  
  async scrapeCategory(category: 'PANEL' | 'INVERTER' | 'BATTERY_MODULE'): Promise<ScrapeResult> {
    console.log(`🔍 Starting CEC scrape for ${category}...`);
    
    const url = this.getCategoryUrl(category);
    const products: CECProduct[] = [];
    let totalFound = 0;
    let currentPage = 1;
    let hasMore = true;
    
    while (hasMore && currentPage <= 100) { // Safety limit
      try {
        console.log(`📄 Scraping ${category} page ${currentPage}...`);
        
        const response = await fetch(`${url}?page=${currentPage}`, {
          headers: {
            'User-Agent': this.USER_AGENT,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          }
        });

        if (!response.ok) {
          console.error(`Failed to fetch page ${currentPage}: ${response.status}`);
          break;
        }

        const html = await response.text();
        const pageProducts = this.parseProductsFromHTML(html, category);
        
        if (pageProducts.length === 0) {
          console.log(`No products found on page ${currentPage}, stopping...`);
          hasMore = false;
        } else {
          products.push(...pageProducts);
          totalFound += pageProducts.length;
          console.log(`✅ Found ${pageProducts.length} products on page ${currentPage} (total: ${totalFound})`);
          
          // Respectful delay between requests
          await delay(800 + Math.random() * 400);
          currentPage++;
        }
        
      } catch (error) {
        console.error(`Error scraping page ${currentPage}:`, error);
        await delay(2000); // Longer delay on error
        break;
      }
    }
    
    console.log(`🎯 CEC scrape completed for ${category}: ${totalFound} products found`);
    
    return {
      products,
      totalFound,
      cursor: currentPage.toString()
    };
  }
  
  private getCategoryUrl(category: 'PANEL' | 'INVERTER' | 'BATTERY_MODULE'): string {
    const urls = {
      PANEL: `${this.BASE_URL}/industry/equipment/panels`,
      INVERTER: `${this.BASE_URL}/industry/equipment/inverters`,
      BATTERY_MODULE: `${this.BASE_URL}/industry/equipment/batteries`
    };
    return urls[category];
  }
  
  private parseProductsFromHTML(html: string, category: 'PANEL' | 'INVERTER' | 'BATTERY_MODULE'): CECProduct[] {
    const products: CECProduct[] = [];
    
    // Extract product entries using common CEC HTML patterns
    const productRowPattern = /<tr[^>]*class="[^"]*product[^"]*"[^>]*>(.*?)<\/tr>/gis;
    const matches = html.match(productRowPattern);
    
    if (!matches) {
      // Try alternative patterns
      const alternativePattern = /<div[^>]*class="[^"]*product[^"]*"[^>]*>(.*?)<\/div>/gis;
      const altMatches = html.match(alternativePattern);
      
      if (altMatches) {
        altMatches.forEach(match => {
          const product = this.extractProductFromMatch(match, category);
          if (product) products.push(product);
        });
      }
      return products;
    }
    
    matches.forEach(match => {
      const product = this.extractProductFromMatch(match, category);
      if (product) products.push(product);
    });
    
    return products;
  }
  
  private extractProductFromMatch(html: string, category: 'PANEL' | 'INVERTER' | 'BATTERY_MODULE'): CECProduct | null {
    try {
      // Extract manufacturer
      const manufacturerMatch = html.match(/<td[^>]*class="[^"]*manufacturer[^"]*"[^>]*>(.*?)<\/td>/is) ||
                              html.match(/<span[^>]*class="[^"]*brand[^"]*"[^>]*>(.*?)<\/span>/is) ||
                              html.match(/<div[^>]*class="[^"]*manufacturer[^"]*"[^>]*>(.*?)<\/div>/is);
      
      const manufacturer = manufacturerMatch ? manufacturerMatch[1].replace(/<[^>]*>/g, '').trim() : '';
      
      // Extract model
      const modelMatch = html.match(/<td[^>]*class="[^"]*model[^"]*"[^>]*>(.*?)<\/td>/is) ||
                        html.match(/<span[^>]*class="[^"]*model[^"]*"[^>]*>(.*?)<\/span>/is) ||
                        html.match(/<div[^>]*class="[^"]*model[^"]*"[^>]*>(.*?)<\/div>/is);
      
      const model = modelMatch ? modelMatch[1].replace(/<[^>]*>/g, '').trim() : '';
      
      // Extract status
      const statusMatch = html.match(/<td[^>]*class="[^"]*status[^"]*"[^>]*>(.*?)<\/td>/is) ||
                         html.match(/<span[^>]*class="[^"]*status[^"]*"[^>]*>(.*?)<\/span>/is);
      
      const status = statusMatch ? statusMatch[1].replace(/<[^>]*>/g, '').trim() : 'Unknown';
      
      // Extract datasheet URL
      const datasheetMatch = html.match(/<a[^>]*href="([^"]*(?:datasheet|spec|pdf)[^"]*)"[^>]*>/i);
      const datasheetUrl = datasheetMatch ? this.resolveUrl(datasheetMatch[1]) : undefined;
      
      // Extract product URL
      const productMatch = html.match(/<a[^>]*href="([^"]*)"[^>]*>/i);
      const productUrl = productMatch ? this.resolveUrl(productMatch[1]) : undefined;
      
      // Extract CEC reference
      const cecRefMatch = html.match(/CEC[:\s]*([A-Z0-9\-]+)/i);
      const cecRef = cecRefMatch ? cecRefMatch[1] : undefined;
      
      if (!manufacturer || !model) {
        return null;
      }
      
      return {
        manufacturer: this.cleanText(manufacturer),
        model: this.cleanText(model),
        status,
        datasheetUrl,
        productUrl,
        cecRef,
        category,
        rawData: { html: html.substring(0, 500) } // Store sample for debugging
      };
      
    } catch (error) {
      console.error('Error extracting product:', error);
      return null;
    }
  }
  
  private resolveUrl(url: string): string {
    if (url.startsWith('http')) {
      return url;
    }
    if (url.startsWith('//')) {
      return `https:${url}`;
    }
    if (url.startsWith('/')) {
      return `${this.BASE_URL}${url}`;
    }
    return `${this.BASE_URL}/${url}`;
  }
  
  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }
  
  async saveProducts(products: CECProduct[]): Promise<void> {
    console.log(`💾 Saving ${products.length} products to database...`);
    
    for (const product of products) {
      try {
        // Upsert manufacturer
        const { data: manufacturer } = await supabase
          .from('manufacturers')
          .upsert({
            name: product.manufacturer,
            aliases: [product.manufacturer.toLowerCase()],
            urls: product.productUrl ? [product.productUrl] : []
          }, {
            onConflict: 'name'
          })
          .select('id')
          .single();
        
        if (!manufacturer) {
          console.error(`Failed to upsert manufacturer: ${product.manufacturer}`);
          continue;
        }
        
        // Upsert product
        await supabase
          .from('products')
          .upsert({
            manufacturer_id: manufacturer.id,
            category: product.category,
            model: product.model,
            series: product.series,
            datasheet_url: product.datasheetUrl,
            product_url: product.productUrl,
            cec_ref: product.cecRef,
            status: product.status,
            source: 'CEC',
            raw: product.rawData
          }, {
            onConflict: 'manufacturer_id,category,model'
          });
        
      } catch (error) {
        console.error(`Error saving product ${product.manufacturer} ${product.model}:`, error);
      }
    }
    
    console.log(`✅ Successfully saved products to database`);
  }
  
  async updateScrapeProgress(category: 'PANEL' | 'INVERTER' | 'BATTERY_MODULE', result: ScrapeResult): Promise<void> {
    await supabase
      .from('scrape_progress')
      .upsert({
        category,
        total_found: result.totalFound,
        total_processed: result.products.length,
        last_cursor: result.cursor,
        status: 'completed'
      }, {
        onConflict: 'category'
      });
  }
}

// Utility function for delays
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}