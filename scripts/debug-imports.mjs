// Debug: find all imports in providers chunk
async function main() {
  const t = await fetch('https://www.depositwin777.com/assets/js/1.9.23-Bd_AdTq9-chunk.js').then(r => r.text());
  
  // Find all import statements
  const re = /import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/g;
  let m;
  const imports = [];
  while ((m = re.exec(t)) !== null) {
    imports.push({ vars: m[1], src: m[2] });
  }
  
  console.log(`Found ${imports.length} imports:`);
  for (const imp of imports) {
    const varList = imp.vars.split(',').map(v => v.trim());
    console.log(`\nFROM: ${imp.src} (${varList.length} vars)`);
    console.log(`  First 10: ${varList.slice(0, 10).join(', ')}`);
    
    // Check if l_ is in this import
    if (imp.vars.includes('l_')) {
      console.log('  *** CONTAINS l_ (pragmatic_play) ***');
    }
  }
}
main().catch(console.error);
