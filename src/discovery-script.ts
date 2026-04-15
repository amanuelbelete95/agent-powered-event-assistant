import fs from 'fs';
import path from 'path';
import config from './config.js';

interface Endpoint {
  method: string;
  path: string;
  handler: string;
  description: string;
}

function parseIndexJs(): Endpoint[] {
  console.log('Note: API endpoints are defined in event-backend. Using pre-generated api-map.md');
  return [];
}

function loadAdditionalDocs(): string {
  const docsDir = config.ragDocsPath;
  let content = '';
  
  if (!fs.existsSync(docsDir)) {
    return content;
  }
  
  const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md') && f !== 'api-map.md');
  
  for (const file of files) {
    const filePath = path.join(docsDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    content += `\n\n---\n\n### ${file.replace('.md', '').replace(/_/g, ' ')}\n\n${fileContent}\n`;
  }
  
  return content;
}

function generateMarkdown(endpoints: Endpoint[]): string {
  let markdown = `# API Map - Event Management System\n\n`;
  markdown += `## Base URL: ${config.expressApiUrl}\n\n---\n\n`;
  
  if (endpoints.length > 0) {
    markdown += `## Endpoints\n\n`;
    const grouped = endpoints.reduce((acc, ep) => {
      if (!acc[ep.method]) acc[ep.method] = [];
      acc[ep.method].push(ep);
      return acc;
    }, {} as Record<string, Endpoint[]>);
    
    for (const [method, eps] of Object.entries(grouped)) {
      markdown += `### ${method}\n\n`;
      for (const ep of eps) {
        markdown += `| ${ep.method} | \`${ep.path}\` | ${ep.description} |\n`;
      }
    }
  }
  
  markdown += loadAdditionalDocs();
  
  return markdown;
}

async function main() {
  console.log('🔍 Generating API Map...\n');
  
  const endpoints = parseIndexJs();
  const markdown = generateMarkdown(endpoints);
  
  fs.writeFileSync(config.apiMapPath, markdown, 'utf-8');
  console.log(`✅ API Map generated: ${config.apiMapPath}`);
  
  const docsDir = config.ragDocsPath;
  if (fs.existsSync(docsDir)) {
    const mdFiles = fs.readdirSync(docsDir).filter(f => f.endsWith('.md'));
    console.log(`📄 Found ${mdFiles.length} markdown file(s):`);
    for (const file of mdFiles) {
      console.log(`  • ${file}`);
    }
  }
}

main().catch(console.error);