#!/usr/bin/env node
import SignifyClient from 'signify-ts';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// Run - npx tsx src/utils/saidify.ts --file saidify-data.json --output saidify-data-output.json
/**
 * Saidifies a JSON object by computing its SAID (Self-Addressing Identifier)
 * @param obj - The object to saidify
 * @returns A tuple containing [SAID string, saidified object]
 */
export function saidify(obj: any): [string, any] {
  const [saider, saidified] = SignifyClient.Saider.saidify(obj);
  return [saider.qb64, saidified];
}

/**
 * Reads a JSON file, computes its SAID, and returns both the saidified object and SAID
 * @param filePath - Path to the JSON file
 * @returns Object containing the saidified data and the SAID
 */
export function saidifyFile(filePath: string): {
  saidified: any;
  said: string;
} {
  const absolutePath = resolve(filePath);
  const fileContent = readFileSync(absolutePath, 'utf-8');
  const jsonData = JSON.parse(fileContent);

  const [said, saidified] = saidify(jsonData);

  return { saidified, said };
}

/**
 * Command-line interface for saidifying JSON files
 */
function main() {
  const args = process.argv.slice(2);

  // Parse command line arguments
  let filePath: string | null = null;
  let outputPath: string | null = null;
  let showHelp = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--file':
      case '-f':
        filePath = args[++i];
        break;
      case '--output':
      case '-o':
        outputPath = args[++i];
        break;
      case '--help':
      case '-h':
        showHelp = true;
        break;
      default:
        if (!arg.startsWith('-')) {
          filePath = arg;
        }
    }
  }

  // Show help if requested or no file provided
  if (showHelp || !filePath) {
    console.log(`
Usage: node saidify.ts [OPTIONS] --file <path>
   or: npx tsx src/utils/saidify.ts [OPTIONS] --file <path>

Options:
  --file, -f <path>    Path to the JSON file to saidify (required)
  --output, -o <path>  Output file path for the saidified JSON (optional)
  --help, -h           Show this help message

Examples:
  # Display SAID and saidified JSON
  node dist/esm/utils/saidify.js --file data.json
  
  # Save saidified JSON to file
  node dist/esm/utils/saidify.js --file data.json --output data-saidified.json
  
  # Run directly with tsx (for development)
  tsx src/utils/saidify.ts --file data.json
`);
    process.exit(showHelp ? 0 : 1);
  }

  try {
    const result = saidifyFile(filePath);

    console.log('\n✓ SAID computed successfully!\n');
    console.log('SAID:', result.said);
    console.log('\nSaidified JSON:');
    console.log(JSON.stringify(result.saidified, null, 2));

    // Save to output file if specified
    if (outputPath) {
      const absoluteOutputPath = resolve(outputPath);
      writeFileSync(
        absoluteOutputPath,
        JSON.stringify(result.saidified, null, 2),
        'utf-8'
      );
      console.log(`\n✓ Saidified JSON saved to: ${absoluteOutputPath}`);
    }
  } catch (error) {
    console.error('\n✗ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run CLI if this file is executed directly
// The CLI will run when this module is executed as a script
// (e.g., via `tsx src/utils/saidify.ts` or `node dist/esm/utils/saidify.js`)
if (process.argv[1]?.includes('saidify')) {
  main();
}
