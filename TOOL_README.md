# Link Sorter

A Node.js script to alphabetically sort links in Markdown files. Especially useful for large link collections like lists of resources or references.

## Features

- ✅ Alphabetically sorts links in Markdown files
- ✅ Option to group links by domain name
- ✅ Automatically creates backups of the original files
- ✅ Generates comprehensive link statistics and analysis
- ✅ Identifies duplicate and potentially broken links
- ✅ Command-line interface with multiple options
- ✅ Preserves non-link content in the Markdown file

## Usage

```bash
node sortLinks.js [options] [file]
```

### Options

| Option | Flag | Description |
|--------|------|-------------|
| File path | `-f`, `--file` | Path to markdown file (default: README.md) |
| No backup | `-n`, `--no-backup` | Don't create a backup file |
| Group by domain | `-g`, `--group-by-domain` | Group links by domain name |
| No statistics | `-s`, `--no-stats` | Don't show link statistics |
| Statistics only | `--stats-only` | Only show statistics without sorting |
| Help | `-h`, `--help` | Show help message |

### Examples

```bash
# Sort links in README.md alphabetically
node sortLinks.js

# Sort links in a different file
node sortLinks.js LINKS.md

# Sort links and group them by domain
node sortLinks.js --group-by-domain

# Sort links without creating a backup
node sortLinks.js --no-backup

# Only analyze links without sorting
node sortLinks.js --stats-only

# Combine options
node sortLinks.js -f LINKS.md -g -n
```

## Statistics Overview

When the script runs, it provides a comprehensive overview of your links, including:

- 📊 Total number of links and unique links
- 🔄 Detection of duplicate links
- 🔒 HTTP vs HTTPS protocol usage
- 🌐 Distribution of links across domains
- 📝 Top-level domain (.com, .org, etc.) analysis
- ⚠️ Detection of potentially malformed URLs

This helps you understand your collection of links and identify any issues that need to be addressed.

## How It Works

1. Reads the Markdown file
2. Identifies and extracts all Markdown-formatted links (`* http://example.com/`)
3. Sorts the links alphabetically (optionally grouping by domain)
4. Analyzes link statistics and provides useful information
5. Preserves the non-link content of the file
6. Writes the sorted links back to the file

## Requirements

- Node.js (any recent version should work)

## License

This tool is provided as open-source software. Feel free to modify and use it as needed.

## Contributing

Feel free to submit issues or pull requests to improve this tool. 