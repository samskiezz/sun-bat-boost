import { supabase } from '@/integrations/supabase/client';

interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
  fileFormat?: string;
}

interface ProductInfo {
  id: string;
  manufacturer: string;
  model: string;
  category: string;
  series?: string;
}

export class GoogleFallbackScraper {
  private readonly USER_AGENT = 'HiltsTrainerBot/1.0 (Solar Research)';
  
  async findMissingDatasheets(): Promise<void> {
    console.log('🔍 Finding products with missing datasheets...');
    
    const { data: products } = await supabase
      .from('products')
      .select(`
        id,
        manufacturer_id,
        category,
        model,
        series,
        manufacturers!inner(name)
      `)
      .is('datasheet_url', null)
      .is('pdf_path', null)
      .limit(50); // Process in batches
    
    if (!products?.length) {
      console.log('No missing datasheets found');
      return;
    }
    
    console.log(`Found ${products.length} products missing datasheets`);
    
    for (const product of products) {
      try {
        const productInfo: ProductInfo = {
          id: product.id,
          manufacturer: (product.manufacturers as any).name,
          model: product.model,
          category: product.category,
          series: product.series
        };
        
        const datasheetUrl = await this.searchForDatasheet(productInfo);
        
        if (datasheetUrl) {
          await supabase
            .from('products')
            .update({
              datasheet_url: datasheetUrl,
              source: 'GOOGLE'
            })
            .eq('id', product.id);
          
          console.log(`✅ Found datasheet for ${productInfo.manufacturer} ${productInfo.model}: ${datasheetUrl}`);
        } else {
          console.log(`❌ No datasheet found for ${productInfo.manufacturer} ${productInfo.model}`);
        }
        
        // Respectful delay between searches
        await this.delay(2000 + Math.random() * 2000);
        
      } catch (error) {
        console.error(`Error processing product ${product.id}:`, error);
        await this.delay(5000); // Longer delay on error
      }
    }
    
    console.log('✅ Finished searching for missing datasheets');
  }
  
  private async searchForDatasheet(product: ProductInfo): Promise<string | null> {
    try {
      const searchQueries = this.buildSearchQueries(product);
      
      for (const query of searchQueries) {
        console.log(`🔎 Searching: ${query}`);
        
        const results = await this.performGoogleSearch(query);
        const datasheetUrl = this.extractDatasheetUrl(results, product);
        
        if (datasheetUrl) {
          console.log(`📄 Found potential datasheet: ${datasheetUrl}`);
          
          // Verify it's actually a PDF
          if (await this.verifyPDFUrl(datasheetUrl)) {
            return datasheetUrl;
          }
        }
        
        // Delay between search queries
        await this.delay(1500);
      }
      
      return null;
      
    } catch (error) {
      console.error(`Error searching for datasheet:`, error);
      return null;
    }
  }
  
  private buildSearchQueries(product: ProductInfo): string[] {
    const manufacturer = product.manufacturer;
    const model = product.model;
    const series = product.series;
    
    const queries = [
      // Primary searches
      `"${manufacturer}" "${model}" datasheet filetype:pdf site:${this.getManufacturerDomain(manufacturer)}`,
      `"${manufacturer}" "${model}" specifications filetype:pdf`,
      `"${manufacturer}" "${model}" datasheet PDF download`,
      
      // With series if available
      ...(series ? [
        `"${manufacturer}" "${series}" "${model}" datasheet filetype:pdf`,
        `"${manufacturer}" "${series}" specifications PDF`
      ] : []),
      
      // Category-specific searches
      ...this.getCategorySearches(product),
      
      // Fallback searches
      `${manufacturer} ${model} technical specifications PDF`,
      `${manufacturer} ${model} manual download PDF`,
    ];
    
    return queries;
  }
  
  private getCategorySearches(product: ProductInfo): string[] {
    const manufacturer = product.manufacturer;
    const model = product.model;
    
    const categoryTerms = {
      PANEL: ['solar panel', 'photovoltaic module', 'PV module'],
      INVERTER: ['solar inverter', 'power inverter'],
      BATTERY_MODULE: ['battery module', 'energy storage', 'battery system']
    };
    
    const terms = categoryTerms[product.category as keyof typeof categoryTerms] || [];
    
    return terms.map(term => 
      `"${manufacturer}" "${model}" ${term} datasheet filetype:pdf`
    );
  }
  
  private getManufacturerDomain(manufacturer: string): string {
    // Map manufacturer names to their likely domains
    const domainMap: Record<string, string> = {
      'Tesla': 'tesla.com',
      'Fronius': 'fronius.com',
      'SMA': 'sma.de',
      'Enphase': 'enphase.com',
      'Trina': 'trinasolar.com',
      'Jinko': 'jinkosolar.com',
      'Canadian Solar': 'canadiansolar.com',
      'LONGi': 'longi.com',
      'JA Solar': 'jasolar.com',
      'Huawei': 'huawei.com',
      'GoodWe': 'goodwe.com',
      'Solis': 'solahart.com.au',
      'BYD': 'byd.com',
      'Alpha ESS': 'alpha-ess.com',
      'Pylontech': 'pylontech.com.cn',
    };
    
    return domainMap[manufacturer] || `${manufacturer.toLowerCase().replace(/\s+/g, '')}.com`;
  }
  
  private async performGoogleSearch(query: string): Promise<GoogleSearchResult[]> {
    // In a real implementation, this would use Google Custom Search API
    // For now, we'll simulate search results
    
    const simulatedResults: GoogleSearchResult[] = [
      {
        title: `${query.split('"')[1]} ${query.split('"')[3]} - Technical Specifications`,
        link: `https://example.com/datasheets/${Math.random().toString(36).substring(7)}.pdf`,
        snippet: 'Technical specifications and datasheet for solar equipment...',
        fileFormat: 'PDF'
      },
      {
        title: `${query.split('"')[1]} Product Manual`,
        link: `https://example.com/manuals/${Math.random().toString(36).substring(7)}.pdf`,
        snippet: 'Complete product manual and installation guide...',
        fileFormat: 'PDF'
      }
    ];
    
    // Simulate some randomness in results
    return Math.random() > 0.3 ? simulatedResults : [];
  }
  
  private extractDatasheetUrl(results: GoogleSearchResult[], product: ProductInfo): string | null {
    for (const result of results) {
      // Prioritize URLs that are likely datasheets
      if (this.isLikelyDatasheet(result, product)) {
        return result.link;
      }
    }
    
    // Fallback to first PDF result
    const pdfResult = results.find(r => r.fileFormat === 'PDF' || r.link.endsWith('.pdf'));
    return pdfResult?.link || null;
  }
  
  private isLikelyDatasheet(result: GoogleSearchResult, product: ProductInfo): boolean {
    const title = result.title.toLowerCase();
    const link = result.link.toLowerCase();
    const snippet = result.snippet.toLowerCase();
    
    const datasheetTerms = ['datasheet', 'specification', 'specs', 'technical'];
    const modelTerms = product.model.toLowerCase().split(/\s+/);
    
    // Check if title/link contains datasheet terms
    const hasDatasheetTerms = datasheetTerms.some(term => 
      title.includes(term) || link.includes(term)
    );
    
    // Check if it contains model information
    const hasModelInfo = modelTerms.some(term => 
      title.includes(term) || snippet.includes(term)
    );
    
    // Check if it's from manufacturer domain
    const manufacturerDomain = this.getManufacturerDomain(product.manufacturer);
    const isFromManufacturer = link.includes(manufacturerDomain.toLowerCase());
    
    return hasDatasheetTerms && hasModelInfo && link.endsWith('.pdf') && 
           (isFromManufacturer || result.fileFormat === 'PDF');
  }
  
  private async verifyPDFUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': this.USER_AGENT
        }
      });
      
      if (!response.ok) return false;
      
      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      
      // Check content type
      if (contentType && !contentType.includes('pdf') && !contentType.includes('octet-stream')) {
        return false;
      }
      
      // Check size (must be reasonable)
      if (contentLength) {
        const size = parseInt(contentLength);
        if (size < 20 * 1024 || size > 50 * 1024 * 1024) { // 20KB - 50MB
          return false;
        }
      }
      
      return true;
      
    } catch (error) {
      console.error(`Error verifying PDF URL:`, error);
      return false;
    }
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}