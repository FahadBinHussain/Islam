const fs = require('fs');
const path = require('path');

/**
 * Collect statistics for a markdown file
 * @param {string} content - Content of the markdown file
 * @returns {Object} Statistics object
 */
function collectStatistics(content) {
    const lines = content.split('\n');
    const rawUrls = new Set();
    const allLinks = []; // To detect duplicates
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        let url = '';
        
        if (trimmedLine.startsWith('* ') && (trimmedLine.includes('http://') || trimmedLine.includes('https://'))) {
            url = trimmedLine.replace('* ', '').trim();
        } else if (trimmedLine.startsWith('http://') || trimmedLine.startsWith('https://')) {
            url = trimmedLine;
        }
        
        if (url) {
            allLinks.push(url);
            rawUrls.add(url);
        }
    }

    // Collect statistics
    const stats = {
        totalLinks: allLinks.length,
        uniqueLinks: rawUrls.size,
        duplicates: allLinks.length - rawUrls.size,
        protocolStats: {
            http: Array.from(rawUrls).filter(url => url.startsWith('http://')).length,
            https: Array.from(rawUrls).filter(url => url.startsWith('https://')).length
        },
        domainStats: {},
        topLevelDomainStats: {},
        brokenLinks: []
    };
    
    // Process domains for statistics
    Array.from(rawUrls).forEach(url => {
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname.replace(/^www\./, '');
            const tldMatch = domain.match(/\.([^.]+)$/);
            const tld = tldMatch ? tldMatch[1] : 'unknown';
            
            stats.domainStats[domain] = (stats.domainStats[domain] || 0) + 1;
            stats.topLevelDomainStats[tld] = (stats.topLevelDomainStats[tld] || 0) + 1;
        } catch (e) {
            stats.brokenLinks.push(url);
        }
    });
    
    return stats;
}

/**
 * Print link statistics to console
 * @param {Object} stats - Link statistics
 */
function printLinkStatistics(stats) {
    console.log('\n=== LINK STATISTICS ===');
    console.log(`Total links: ${stats.totalLinks}`);
    console.log(`Unique links: ${stats.uniqueLinks}`);
    console.log(`Duplicate links: ${stats.duplicates}`);
    console.log(`\nProtocol usage:`);
    console.log(`  HTTP: ${stats.protocolStats.http} (${Math.round(stats.protocolStats.http / stats.uniqueLinks * 100)}%)`);
    console.log(`  HTTPS: ${stats.protocolStats.https} (${Math.round(stats.protocolStats.https / stats.uniqueLinks * 100)}%)`);

    console.log(`\nTop 10 domains by link count:`);
    const sortedDomains = Object.entries(stats.domainStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    sortedDomains.forEach(([domain, count]) => {
        console.log(`  ${domain}: ${count} links`);
    });
    
    console.log(`\nTop-level domains:`);
    const sortedTLDs = Object.entries(stats.topLevelDomainStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    sortedTLDs.forEach(([tld, count]) => {
        console.log(`  .${tld}: ${count} links (${Math.round(count / stats.uniqueLinks * 100)}%)`);
    });
    
    if (stats.brokenLinks.length > 0) {
        console.log(`\nPotentially malformed URLs: ${stats.brokenLinks.length}`);
        stats.brokenLinks.slice(0, 5).forEach(url => {
            console.log(`  - ${url}`);
        });
        if (stats.brokenLinks.length > 5) {
            console.log(`  ... and ${stats.brokenLinks.length - 5} more`);
        }
    }
    
    console.log('\n======================');
}

/**
 * Sort links in a markdown file alphabetically
 * @param {string} readmePath - Path to the markdown file
 * @param {Object} options - Sorting options
 * @param {boolean} options.createBackup - Whether to create a backup of the original file
 * @param {boolean} options.groupByDomain - Whether to group links by domain name
 * @param {boolean} options.showStats - Whether to show detailed statistics
 */
function sortLinks(readmePath, options = { createBackup: true, groupByDomain: false, showStats: true }) {
    // Read the README.md file
    const content = fs.readFileSync(readmePath, 'utf8');
    
    // Create a backup if requested
    if (options.createBackup) {
        const backupPath = `${readmePath}.backup-${Date.now()}`;
        fs.writeFileSync(backupPath, content);
        console.log(`Backup created: ${backupPath}`);
    }
    
    // Collect statistics before sorting
    const stats = collectStatistics(content);
    
    // Split the content into lines
    const lines = content.split('\n');
    
    // Extract the title (everything before the first link)
    let headerEndIndex = 0;
    for (let i = 0; i < lines.length; i++) {
        if ((lines[i].trim().startsWith('* http') || lines[i].trim().startsWith('* https')) ||
            (lines[i].trim().startsWith('http') || lines[i].trim().startsWith('https'))) {
            headerEndIndex = i;
            break;
        }
    }
    
    const headerContent = lines.slice(0, headerEndIndex);
    
    // Extract all links (lines starting with '* ' or directly with http/https and containing a URL)
    const links = [];
    const rawUrls = new Set(); // For duplicate detection
    const urlToLineMap = {}; // Map URLs to their original line format
    
    for (let i = headerEndIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        let url = '';
        let originalLine = lines[i];
        
        if (line.startsWith('* ') && (line.includes('http://') || line.includes('https://'))) {
            url = line.replace('* ', '').trim();
            if (!originalLine.startsWith('* ')) {
                originalLine = `* ${url}`;
            }
        } else if (line.startsWith('http://') || line.startsWith('https://')) {
            url = line;
            originalLine = `* ${url}`;
        }
        
        if (url) {
            links.push(originalLine);
            rawUrls.add(url);
            urlToLineMap[url] = originalLine;
        }
    }

    // Sort links
    let sortedLinks;
    if (options.groupByDomain) {
        // Group by domain and sort
        const domainGroups = {};
        
        Array.from(rawUrls).forEach(url => {
            let domain = '';
            
            try {
                domain = new URL(url).hostname;
            } catch (e) {
                // If URL parsing fails, use a fallback approach
                const match = url.match(/https?:\/\/([^\/]+)/);
                domain = match ? match[1] : url;
            }
            
            // Group domain without www prefix
            domain = domain.replace(/^www\./, '');
            
            if (!domainGroups[domain]) {
                domainGroups[domain] = [];
            }
            
            domainGroups[domain].push(urlToLineMap[url]);
        });
        
        // Sort domains alphabetically
        const sortedDomains = Object.keys(domainGroups).sort((a, b) => 
            a.toLowerCase().localeCompare(b.toLowerCase())
        );
        
        // Flatten the sorted groups
        sortedLinks = [];
        sortedDomains.forEach(domain => {
            // Sort links within each domain group
            const domainLinks = domainGroups[domain].sort((a, b) => {
                const urlA = a.replace('* ', '').toLowerCase();
                const urlB = b.replace('* ', '').toLowerCase();
                return urlA.localeCompare(urlB);
            });
            
            sortedLinks.push(...domainLinks);
        });
    } else {
        // Simple alphabetical sort of unique links
        sortedLinks = Array.from(rawUrls).map(url => urlToLineMap[url]).sort((a, b) => {
            const urlA = a.replace('* ', '').toLowerCase();
            const urlB = b.replace('* ', '').toLowerCase();
            return urlA.localeCompare(urlB);
        });
    }
    
    // Combine the header and sorted links
    const newContent = [...headerContent, ...sortedLinks].join('\n');
    
    // Write the sorted content back to the README.md file
    fs.writeFileSync(readmePath, newContent);
    
    console.log(`Sorted ${sortedLinks.length} links alphabetically${options.groupByDomain ? ' (grouped by domain)' : ''}!`);
    
    // Display statistics
    if (options.showStats) {
        printLinkStatistics(stats);
    }
    
    return stats;
}

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        filePath: 'README.md',
        createBackup: true,
        groupByDomain: false,
        showStats: true,
        statsOnly: false
    };
    
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--file' || args[i] === '-f') {
            options.filePath = args[i + 1];
            i++;
        } else if (args[i] === '--no-backup' || args[i] === '-n') {
            options.createBackup = false;
        } else if (args[i] === '--group-by-domain' || args[i] === '-g') {
            options.groupByDomain = true;
        } else if (args[i] === '--no-stats' || args[i] === '-s') {
            options.showStats = false;
        } else if (args[i] === '--stats-only') {
            options.statsOnly = true;
        } else if (args[i] === '--help' || args[i] === '-h') {
            showHelp();
            process.exit(0);
        } else if (!args[i].startsWith('-')) {
            options.filePath = args[i];
        }
    }
    
    return options;
}

// Show help message
function showHelp() {
    console.log(`
Link Sorter - Sort markdown links alphabetically

Usage:
  node sortLinks.js [options] [file]

Options:
  -f, --file           Path to markdown file (default: README.md)
  -n, --no-backup      Don't create a backup file
  -g, --group-by-domain Group links by domain name
  -s, --no-stats       Don't show link statistics
  --stats-only         Only show statistics without sorting
  -h, --help           Show this help message

Examples:
  node sortLinks.js
  node sortLinks.js LINKS.md
  node sortLinks.js --file LINKS.md --group-by-domain
  node sortLinks.js -f README.md -g -n
  node sortLinks.js --stats-only
`);
}

// Main execution
const options = parseArgs();

if (!fs.existsSync(options.filePath)) {
    console.error(`Error: File ${options.filePath} does not exist.`);
    process.exit(1);
}

// Process the file
if (options.statsOnly) {
    // Only show statistics without sorting
    const content = fs.readFileSync(options.filePath, 'utf8');
    const stats = collectStatistics(content);
    printLinkStatistics(stats);
} else {
    // Sort the links and optionally show stats
    sortLinks(options.filePath, {
        createBackup: options.createBackup,
        groupByDomain: options.groupByDomain,
        showStats: options.showStats
    });
} 