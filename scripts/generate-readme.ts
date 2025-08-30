#!/usr/bin/env tsx

/**
 * README Generator - Maintains the complete index of the ROI Calculator app
 * 
 * This script scans the codebase and updates README.md with auto-discovered
 * functions, components, types, endpoints, and database tables.
 * 
 * Usage: npm run readme:gen
 */

import fs from 'fs';
import path from 'path';

interface DiscoveredItem {
  name: string;
  type: 'function' | 'component' | 'type' | 'constant' | 'hook' | 'endpoint' | 'table';
  filePath: string;
  description?: string;
}

class READMEGenerator {
  private discoveredItems: DiscoveredItem[] = [];
  private masterIndexEnd = '---\n\n# Auto-Discovered Additions (from codebase)';

  async generate() {
    console.log('🔍 Scanning codebase for functions, components, types, and more...');
    
    // Scan different parts of the codebase
    await this.scanDirectory('src', /\.(ts|tsx)$/);
    await this.scanSupabaseFunctions();
    await this.scanDatabaseTables();
    
    console.log(`📊 Found ${this.discoveredItems.length} items to index`);
    
    // Update README.md
    await this.updateReadme();
    
    console.log('✅ README.md updated successfully');
  }

  private async scanDirectory(dir: string, filePattern: RegExp) {
    if (!fs.existsSync(dir)) return;

    const scanFile = (filePath: string) => {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const relativePath = filePath.replace(process.cwd() + '/', '');
        
        // Find exported functions
        const functionMatches = content.match(/export\s+(function|const)\s+(\w+)/g);
        if (functionMatches) {
          functionMatches.forEach(match => {
            const nameMatch = match.match(/export\s+(?:function|const)\s+(\w+)/);
            if (nameMatch) {
              this.discoveredItems.push({
                name: nameMatch[1],
                type: 'function',
                filePath: relativePath
              });
            }
          });
        }

        // Find React components (default exports)
        const componentMatch = content.match(/export\s+default\s+(?:function\s+)?(\w+)/);
        if (componentMatch && filePath.endsWith('.tsx')) {
          this.discoveredItems.push({
            name: componentMatch[1],
            type: 'component',
            filePath: relativePath
          });
        }

        // Find types and interfaces
        const typeMatches = content.match(/export\s+(interface|type)\s+(\w+)/g);
        if (typeMatches) {
          typeMatches.forEach(match => {
            const nameMatch = match.match(/export\s+(?:interface|type)\s+(\w+)/);
            if (nameMatch) {
              this.discoveredItems.push({
                name: nameMatch[1],
                type: 'type',
                filePath: relativePath
              });
            }
          });
        }

        // Find constants (uppercase naming convention)
        const constantMatches = content.match(/export\s+const\s+([A-Z][A-Z_]+[A-Z])\s*=/g);
        if (constantMatches) {
          constantMatches.forEach(match => {
            const nameMatch = match.match(/export\s+const\s+([A-Z][A-Z_]+[A-Z])\s*=/);
            if (nameMatch) {
              this.discoveredItems.push({
                name: nameMatch[1],
                type: 'constant',
                filePath: relativePath
              });
            }
          });
        }

        // Find hooks
        const hookMatches = content.match(/export\s+(?:function\s+|const\s+)(use\w+)/g);
        if (hookMatches) {
          hookMatches.forEach(match => {
            const nameMatch = match.match(/export\s+(?:function\s+|const\s+)(use\w+)/);
            if (nameMatch) {
              this.discoveredItems.push({
                name: nameMatch[1],
                type: 'hook',
                filePath: relativePath
              });
            }
          });
        }

      } catch (error) {
        console.warn(`⚠️  Could not read file ${filePath}:`, error);
      }
    };

    const walkDirectory = (currentDir: string) => {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          walkDirectory(fullPath);
        } else if (filePattern.test(item)) {
          scanFile(fullPath);
        }
      }
    };

    walkDirectory(dir);
  }

  private async scanSupabaseFunctions() {
    const functionsDir = 'supabase/functions';
    if (!fs.existsSync(functionsDir)) return;

    const functionFolders = fs.readdirSync(functionsDir);
    for (const folder of functionFolders) {
      const folderPath = path.join(functionsDir, folder);
      if (fs.statSync(folderPath).isDirectory()) {
        this.discoveredItems.push({
          name: folder,
          type: 'endpoint',
          filePath: `${functionsDir}/${folder}`,
          description: `Supabase Edge Function`
        });
      }
    }
  }

  private async scanDatabaseTables() {
    const migrationsDir = 'supabase/migrations';
    if (!fs.existsSync(migrationsDir)) return;

    const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
    
    for (const file of migrationFiles) {
      const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      const tableMatches = content.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(\w+)/gi);
      
      if (tableMatches) {
        tableMatches.forEach(match => {
          const nameMatch = match.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(\w+)/i);
          if (nameMatch) {
            // Avoid duplicates
            const tableName = nameMatch[1];
            const existing = this.discoveredItems.find(item => 
              item.name === tableName && item.type === 'table'
            );
            if (!existing) {
              this.discoveredItems.push({
                name: tableName,
                type: 'table',
                filePath: `${migrationsDir}/${file}`,
                description: 'Database table'
              });
            }
          }
        });
      }
    }
  }

  private async updateReadme() {
    const readmePath = 'README.md';
    let readmeContent = '';
    
    if (fs.existsSync(readmePath)) {
      readmeContent = fs.readFileSync(readmePath, 'utf-8');
    }

    // Find where the master index ends
    const masterEndIndex = readmeContent.indexOf(this.masterIndexEnd);
    
    if (masterEndIndex === -1) {
      console.error('❌ Could not find master index end marker in README.md');
      return;
    }

    // Keep everything up to the master index end
    const masterSection = readmeContent.substring(0, masterEndIndex + this.masterIndexEnd.length);
    
    // Generate the auto-discovered sections
    const autoSection = this.generateAutoDiscoveredSection();
    
    // Combine sections
    const newReadmeContent = masterSection + '\n\n' + autoSection;
    
    // Write the updated README
    fs.writeFileSync(readmePath, newReadmeContent);
  }

  private generateAutoDiscoveredSection(): string {
    const sections: string[] = [];
    
    // Group items by type
    const itemsByType = this.discoveredItems.reduce((acc, item) => {
      if (!acc[item.type]) acc[item.type] = [];
      acc[item.type].push(item);
      return acc;
    }, {} as Record<string, DiscoveredItem[]>);

    // AI Adapters
    if (itemsByType.function) {
      const aiAdapters = itemsByType.function.filter(item => 
        item.filePath.includes('src/ai/adapters/')
      );
      if (aiAdapters.length > 0) {
        sections.push('## AI Adapters & Integrations (src/ai/adapters)');
        aiAdapters.forEach(item => {
          const adapterName = item.filePath.split('/').slice(-2, -1)[0];
          const description = this.getAdapterDescription(adapterName);
          sections.push(`- \`${adapterName}\` - ${description} (${item.filePath})`);
        });
        sections.push('');
      }
    }

    // Core AI Functions
    if (itemsByType.function) {
      const aiFunctions = itemsByType.function.filter(item => 
        item.filePath.startsWith('src/ai/') && !item.filePath.includes('/adapters/')
      );
      if (aiFunctions.length > 0) {
        sections.push('## Core AI Functions (src/ai)');
        aiFunctions.forEach(item => {
          sections.push(`- \`${item.name}()\` - ${this.getFunctionDescription(item.name)} (${item.filePath})`);
        });
        sections.push('');
      }
    }

    // React Components
    if (itemsByType.component) {
      sections.push('## React Components (src/components)');
      itemsByType.component
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach(item => {
          sections.push(`- \`${item.name}\` (${item.filePath})`);
        });
      sections.push('');
    }

    // Data & Energy Functions
    if (itemsByType.function) {
      const dataFunctions = itemsByType.function.filter(item => 
        item.filePath.startsWith('src/data/') || item.filePath.startsWith('src/energy/')
      );
      if (dataFunctions.length > 0) {
        sections.push('## Data & Energy Functions');
        dataFunctions.forEach(item => {
          sections.push(`- \`${item.name}()\` - ${this.getFunctionDescription(item.name)} (${item.filePath})`);
        });
        sections.push('');
      }
    }

    // Hooks & State Management
    if (itemsByType.hook) {
      sections.push('## Hooks & State Management');
      itemsByType.hook.forEach(item => {
        sections.push(`- \`${item.name}()\` (${item.filePath})`);
      });
      sections.push('');
    }

    // Utility Functions
    if (itemsByType.function) {
      const utilFunctions = itemsByType.function.filter(item => 
        item.filePath.includes('/utils/') || item.filePath.includes('/lib/')
      );
      if (utilFunctions.length > 0) {
        sections.push('## Utility Functions');
        utilFunctions.forEach(item => {
          sections.push(`- \`${item.name}()\` - ${this.getFunctionDescription(item.name)} (${item.filePath})`);
        });
        sections.push('');
      }
    }

    // Supabase Edge Functions
    if (itemsByType.endpoint) {
      sections.push('## Supabase Edge Functions (API Endpoints)');
      itemsByType.endpoint
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach(item => {
          sections.push(`- \`${item.name}\` - ${this.getEndpointDescription(item.name)}`);
        });
      sections.push('');
    }

    // Database Tables
    if (itemsByType.table) {
      sections.push('## Database Tables (from migrations)');
      [...new Set(itemsByType.table.map(item => item.name))]
        .sort()
        .forEach(tableName => {
          const description = this.getTableDescription(tableName);
          sections.push(`- \`${tableName}\` - ${description}`);
        });
      sections.push('');
    }

    // Types & Interfaces
    if (itemsByType.type) {
      sections.push('## Types & Interfaces');
      const typesByFile = itemsByType.type.reduce((acc, item) => {
        if (!acc[item.filePath]) acc[item.filePath] = [];
        acc[item.filePath].push(item.name);
        return acc;
      }, {} as Record<string, string[]>);

      Object.entries(typesByFile).forEach(([filePath, types]) => {
        sections.push(`- \`${types.join('`, `')}\` (${filePath})`);
      });
      sections.push('');
    }

    // Constants & Configuration
    if (itemsByType.constant) {
      sections.push('## Constants & Configuration');
      const constantsByFile = itemsByType.constant.reduce((acc, item) => {
        if (!acc[item.filePath]) acc[item.filePath] = [];
        acc[item.filePath].push(item.name);
        return acc;
      }, {} as Record<string, string[]>);

      Object.entries(constantsByFile).forEach(([filePath, constants]) => {
        sections.push(`- \`${constants.join('`, `')}\` (${filePath})`);
      });
      sections.push('');
    }

    // Add footer
    sections.push('---');
    sections.push('');
    sections.push('## How This README Stays Current');
    sections.push('');
    sections.push('This README is automatically maintained as the **single source of truth** for the ROI Calculator app.');
    sections.push('');
    sections.push('### Updating the Index');
    sections.push('');
    sections.push('To regenerate this README with the latest codebase changes:');
    sections.push('');
    sections.push('```bash');
    sections.push('npm run readme:gen');
    sections.push('```');
    sections.push('');
    sections.push('### What Gets Scanned');
    sections.push('');
    sections.push('The generator automatically scans:');
    sections.push('- **Functions**: `export function`, `export const fn = () =>`');
    sections.push('- **Components**: React components with `export default`');
    sections.push('- **Types**: `export interface`, `export type`');
    sections.push('- **Constants**: `export const` (uppercase naming patterns)');
    sections.push('- **Supabase Functions**: Folder names under `supabase/functions/`');
    sections.push('- **Database Tables**: `CREATE TABLE` statements in migrations');
    sections.push('- **Hooks**: Custom React hooks starting with `use`');
    sections.push('');
    sections.push('### Maintenance Rules');
    sections.push('');
    sections.push('- ✅ **APPEND ONLY**: New items are always added under existing headings');
    sections.push('- ❌ **NEVER REMOVES**: Original Master Index items are never deleted or renamed');
    sections.push('- 📁 **FILE PATHS**: All auto-discovered items include their source file path');
    sections.push('- 🔄 **ALWAYS CURRENT**: Run the generator after adding new functions/components');
    sections.push('');
    sections.push('### Contributing');
    sections.push('');
    sections.push('When adding new code:');
    sections.push('1. Use clear, descriptive function/component names');
    sections.push('2. Follow existing naming conventions');
    sections.push('3. Run `npm run readme:gen` before committing');
    sections.push('4. The README will automatically discover and index your additions');
    sections.push('');
    sections.push('This ensures the README always reflects the complete, current state of the application.');

    return sections.join('\n');
  }

  private getAdapterDescription(adapterName: string): string {
    const descriptions: Record<string, string> = {
      'ai_deepspeed': 'DeepSpeed training adapter',
      'ai_langgraph_plus': 'LangGraph Plus inference adapter',
      'ai_rllib': 'RLlib reinforcement learning adapter',
      'ai_stable_baselines3': 'Stable Baselines3 RL adapter',
      'ai_vllm': 'vLLM inference adapter',
      'asr_whispercpp': 'Whisper.cpp speech recognition adapter',
      'forecast_prophet': 'Facebook Prophet forecasting adapter',
      'forecast_tft': 'Temporal Fusion Transformer adapter',
      'llm_llamacpp': 'Llama.cpp LLM adapter',
      'ml_autosklearn': 'AutoML sklearn adapter',
      'ml_catboost': 'CatBoost ML adapter',
      'ml_keras': 'Keras/TensorFlow adapter',
      'ml_lightgbm': 'LightGBM ML adapter',
      'ml_pytorch': 'PyTorch ML adapter',
      'ml_sklearn': 'Scikit-learn ML adapter',
      'ml_xgboost': 'XGBoost ML adapter',
      'nlp_fasttext': 'FastText NLP adapter',
      'nlp_flair': 'Flair NLP adapter',
      'nlp_nltk': 'NLTK NLP adapter',
      'nlp_sentence_transformers': 'Sentence Transformers adapter',
      'nlp_spacy': 'spaCy NLP adapter',
      'nlp_tokenizers': 'Tokenizers adapter',
      'nlp_transformers': 'Hugging Face Transformers adapter',
      'ocr_tesseract': 'Tesseract.js OCR adapter',
      'opencv_js': 'OpenCV.js computer vision adapter',
      'optimizer_ortools': 'OR-Tools optimization adapter',
      'orchestration_langgraph': 'LangGraph orchestration adapter',
      'quantum_cirq': 'Google Cirq quantum adapter',
      'quantum_pennylane': 'PennyLane quantum ML adapter',
      'quantum_qiskit': 'IBM Qiskit quantum adapter',
      'quantum_strawberry': 'Strawberry Fields quantum adapter',
      'quantum_tfq': 'TensorFlow Quantum adapter',
      'runtime_onnx': 'ONNX Runtime adapter',
      'vector_faiss': 'FAISS vector search adapter'
    };
    return descriptions[adapterName] || 'AI/ML adapter';
  }

  private getFunctionDescription(functionName: string): string {
    const descriptions: Record<string, string> = {
      'put': 'Feature store put operation',
      'get': 'Feature store get operation',
      'all': 'Feature store get all operation',
      'registerAdapter': 'Register AI adapter',
      'listAdapters': 'List registered adapters',
      'publish': 'Event bus publish',
      'subscribe': 'Event bus subscribe',
      'chooseBest': 'Fusion selection algorithm',
      'getBatteriesByBrand': 'Filter batteries by brand',
      'getBatteriesByTier': 'Filter batteries by tier',
      'getBatteriesByVPP': 'Filter batteries by VPP compatibility',
      'searchBatteries': 'Search battery catalog',
      'calculateSystemCapacity': 'Calculate battery system capacity',
      'getPanelsByBrand': 'Filter panels by brand',
      'getPanelsByTier': 'Filter panels by tier',
      'searchPanels': 'Search panel catalog',
      'getStateFromPostcode': 'Get state from postcode',
      'planToRetailPlan': 'Normalize AER plan data',
      'calcAnnualCost': 'Calculate annual tariff cost',
      'rankPlans': 'Rank energy plans',
      'rateForHour': 'Get tariff rate for hour',
      'getRetailersByState': 'Get retailers by state',
      'getDnspByState': 'Get DNSP by state',
      'getRetailerByBrand': 'Get retailer by brand',
      'getPostcodeNetwork': 'Get network for postcode',
      'getDnspByPostcode': 'Resolve DNSP by postcode',
      'getDefaultMeterType': 'Get default meter type',
      'clearDnspCache': 'Clear DNSP cache',
      'calculateBatteryRebates': 'Calculate battery rebates',
      'calculateNetPrice': 'Calculate net system price',
      'testRebateCalculation': 'Test rebate calculation logic',
      'predict': 'ML prediction service',
      'checkMLServiceHealth': 'Check ML service health',
      'getServiceStatus': 'Get ML service status',
      'formatCurrency': 'Format currency values',
      'formatPercent': 'Format percentage values',
      'formatNumber': 'Format numeric values'
    };
    return descriptions[functionName] || 'Application function';
  }

  private getEndpointDescription(endpointName: string): string {
    const descriptions: Record<string, string> = {
      'ai-document-analyzer': 'AI-powered document analysis',
      'ai-system-sizing': 'AI system sizing optimization',
      'catalog-orchestrator': 'Product catalog management',
      'cec-battery-scraper': 'CEC battery data scraper',
      'cec-comprehensive-scraper': 'Comprehensive CEC scraper',
      'cec-panel-scraper': 'CEC panel data scraper',
      'cec-scrape': 'General CEC scraping',
      'dnsps-build-all': 'DNSP database builder',
      'dnsps-import': 'DNSP data import',
      'dnsps-resolve': 'DNSP resolution service',
      'energy-plans-scraper': 'Energy plan scraping',
      'enhanced-web-scraper': 'Enhanced web scraping',
      'force-complete-scrape': 'Force complete scraping',
      'force-progress-sync': 'Progress synchronization',
      'get-product-counts': 'Product count service',
      'multitask-trainer': 'Multi-task training',
      'pdf-proposal-processor': 'PDF proposal processing',
      'plan-comparison': 'Energy plan comparison',
      'preboot-trainer': 'Pre-boot training system',
      'product-web-search': 'Product web search',
      'pv-simulator': 'PV system simulation',
      'refresh-energy-plans': 'Energy plan refresh',
      'reliable-specs-extractor': 'Specs extraction',
      'specs-enhancer': 'Specification enhancement',
      'tariff-optimizer': 'Tariff optimization',
      'training-orchestrator': 'Training orchestration',
      'training-scheduler': 'Training scheduling',
      'update-cec-data': 'CEC data updates',
      'vpp-compatibility-checker': 'VPP compatibility',
      'weekly-data-refresh': 'Weekly data refresh'
    };
    return descriptions[endpointName] || 'Supabase Edge Function';
  }

  private getTableDescription(tableName: string): string {
    const descriptions: Record<string, string> = {
      'cec_panels': 'CEC approved panels',
      'cec_batteries': 'CEC approved batteries',
      'cec_inverters': 'CEC approved inverters',
      'vpp_providers': 'VPP provider data',
      'battery_vpp_compatibility': 'Battery-VPP compatibility',
      'cec_data_refresh_log': 'CEC refresh logging',
      'postcode_zones': 'Solar postcode zones',
      'refresh_log': 'General refresh logging',
      'pv_modules': 'PV module catalog',
      'batteries': 'Battery catalog',
      'product_changes': 'Product change tracking',
      'data_update_tracking': 'Data update logs',
      'doc_spans': 'Document span data',
      'ui_constraints': 'UI constraint data',
      'train_episodes': 'Training episodes',
      'replay_items': 'Training replay data',
      'training_metrics': 'Training metrics',
      'manufacturers': 'Manufacturer data',
      'products': 'Product catalog',
      'specs': 'Product specifications',
      'compat': 'Compatibility data',
      'metrics': 'System metrics',
      'scrape_progress': 'Scraping progress',
      'readiness_gates': 'System readiness gates',
      'proposal_guidelines': 'Proposal guidelines',
      'training_standards': 'Training standards',
      'training_sessions': 'Training sessions',
      'training_stage_results': 'Training stage results',
      'npu_builds': 'NPU build data',
      'model_configs': 'Model configurations',
      'dataset_splits': 'Dataset splits',
      'orchestrator_sessions': 'Orchestrator sessions',
      'orchestrator_progress': 'Orchestrator progress',
      'ai_model_weights': 'AI model weights',
      'energy_plans': 'Energy plan data',
      'plan_scores': 'Plan scoring data',
      'dnsps': 'DNSP data',
      'scrape_jobs': 'Scraping job data',
      'scrape_job_progress': 'Job progress tracking'
    };
    return descriptions[tableName] || 'Database table';
  }
}

// Run the generator
const generator = new READMEGenerator();
generator.generate().catch(console.error);
