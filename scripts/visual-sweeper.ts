// Visual consistency sweeper - detect non-compliant styling
import { glob } from 'fast-glob';
import { readFileSync } from 'fs';

// Allowed design system tokens
const allowedTokens = [
  'backdrop-blur-xl',
  'border',
  'border-white/20',
  'rounded-2xl',
  'shadow-[0_8px_40px_rgba(0,0,0,0.45)]',
  'bg-[rgba(10,14,25,0.55)]',
  'bg-white/20',
  'bg-card',
  'text-white',
  'text-foreground',
  'text-muted-foreground',
  'bg-primary',
  'text-primary',
  'hover:bg-white/10'
];

// Detect problematic patterns
const problematicPatterns = [
  /className=["'].*(?:text-black|text-white|bg-white|bg-black).*["']/g,
  /className=["'].*(?:shadow-md|shadow-lg|shadow-xl).*["']/g, // Should use tokens.shadow
  /className=["'].*(?:rounded-md|rounded-lg).*["']/g, // Should use design system
  /style={{.*}}/g // Inline styles should be avoided
];

async function sweepComponents() {
  const files = await glob(['src/**/*.{tsx,jsx}', '!src/**/*.test.{tsx,jsx}']);
  
  const violations: Array<{
    file: string;
    line: number;
    issue: string;
    suggestion: string;
  }> = [];

  for (const filePath of files) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        const lineNumber = index + 1;
        
        // Check for direct color usage instead of design system
        if (line.includes('className=') || line.includes('className="')) {
          // Check for hardcoded colors
          if (/text-white(?!\/)|text-black(?!\/)/.test(line) && !line.includes('tokens.')) {
            violations.push({
              file: filePath,
              line: lineNumber,
              issue: 'Direct color usage without design system',
              suggestion: 'Use tokens.textGlass or semantic color classes'
            });
          }
          
          // Check for hardcoded shadows
          if (/shadow-(?:sm|md|lg|xl|2xl)/.test(line) && !line.includes('shadow-glass')) {
            violations.push({
              file: filePath,
              line: lineNumber,
              issue: 'Non-glassmorphic shadow usage',
              suggestion: 'Use tokens.card or shadow-glass from design system'
            });
          }
          
          // Check for non-glassmorphic backgrounds
          if (/bg-(?:white|black|gray|slate)(?!\/)|bg-(?:blue|red|green)-/.test(line) && 
              !line.includes('bg-white/') && !line.includes('tokens.')) {
            violations.push({
              file: filePath,
              line: lineNumber,
              issue: 'Non-glassmorphic background',
              suggestion: 'Use bg-white/20 or tokens.panel for glassmorphic effect'
            });
          }
        }
        
        // Check for inline styles
        if (line.includes('style={{')) {
          violations.push({
            file: filePath,
            line: lineNumber,
            issue: 'Inline styles detected',
            suggestion: 'Use Tailwind classes or design system tokens'
          });
        }
        
        // Check for non-standard banner components
        if (/(?:Header|Hero|TopBanner|Title).*Component/.test(line) && !line.includes('Banner')) {
          violations.push({
            file: filePath,
            line: lineNumber,
            issue: 'Non-standard header component',
            suggestion: 'Use <Banner variant="glassHolo" /> from shared components'
          });
        }
      });
      
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error);
    }
  }
  
  return violations;
}

// Report results
async function runSweeper() {
  console.log('🔍 Running visual consistency sweep...\n');
  
  const violations = await sweepComponents();
  
  if (violations.length === 0) {
    console.log('✅ No visual consistency violations found!');
    process.exit(0);
  }
  
  console.log(`❌ Found ${violations.length} visual consistency violations:\n`);
  
  // Group by file
  const violationsByFile = violations.reduce((acc, violation) => {
    if (!acc[violation.file]) acc[violation.file] = [];
    acc[violation.file].push(violation);
    return acc;
  }, {} as Record<string, typeof violations>);
  
  Object.entries(violationsByFile).forEach(([file, fileViolations]) => {
    console.log(`📁 ${file.replace('src/', '')}`);
    fileViolations.forEach(violation => {
      console.log(`   Line ${violation.line}: ${violation.issue}`);
      console.log(`   💡 ${violation.suggestion}\n`);
    });
  });
  
  console.log('\n🔧 To fix these issues:');
  console.log('1. Import tokens from @/theme/tokens');
  console.log('2. Use Banner component instead of custom headers');
  console.log('3. Replace hardcoded colors with semantic tokens');
  console.log('4. Use glassmorphic design system consistently');
  
  // Fail in CI if violations found
  if (process.env.CI) {
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runSweeper().catch(console.error);
}

export { sweepComponents, runSweeper };