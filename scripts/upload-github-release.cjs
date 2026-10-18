const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

function getGitToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN.trim();
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN.trim();
  try {
    const out = execSync('git credential fill', {
      input: 'protocol=https\nhost=github.com\n',
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    const match = out.match(/password=(.+)/);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

function getRepoSlug() {
  try {
    const out = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    const match = out.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
    if (match) return `${match[1]}/${match[2]}`;
  } catch {}
  return '8489mx/zs';
}

function httpsRequest(url, options, postData) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const reqOpts = {
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = https.request(reqOpts, (res) => {
      // Handle redirects (e.g. 301, 302, 307)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(httpsRequest(res.headers.location, options, postData));
      }

      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const text = buffer.toString('utf8');
        let json = null;
        try { json = JSON.parse(text); } catch {}
        resolve({ statusCode: res.statusCode, headers: res.headers, body: text, json });
      });
    });

    req.on('error', reject);

    if (postData) {
      if (Buffer.isBuffer(postData) || typeof postData === 'string') {
        req.write(postData);
        req.end();
      } else if (typeof postData.pipe === 'function') {
        postData.pipe(req);
      } else {
        req.end();
      }
    } else {
      req.end();
    }
  });
}

async function uploadReleaseAsset(version) {
  const token = getGitToken();
  if (!token) {
    throw new Error('Could not find GitHub token in Git credentials.');
  }

  const repo = getRepoSlug();
  const tag = `v${version}`;
  const zipName = `Z-ERP-Patch-v${version}.zip`;
  const rootDir = path.resolve(__dirname, '..');
  const zipPath = path.join(rootDir, 'release', 'updates', zipName);

  if (!fs.existsSync(zipPath)) {
    throw new Error(`Patch file does not exist at: ${zipPath}`);
  }

  const fileStats = fs.statSync(zipPath);
  console.log(`[GitHub Upload] Repository: ${repo}`);
  console.log(`[GitHub Upload] Release Tag: ${tag}`);
  console.log(`[GitHub Upload] File: ${zipName} (${(fileStats.size / 1024 / 1024).toFixed(2)} MB)`);

  const commonHeaders = {
    'User-Agent': 'Z-Systems-Release-Agent',
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
  };

  // 1. Get or Create Release
  let release = null;
  const getRelRes = await httpsRequest(`https://api.github.com/repos/${repo}/releases/tags/${tag}`, {
    method: 'GET',
    headers: commonHeaders,
  });

  if (getRelRes.statusCode === 200 && getRelRes.json) {
    release = getRelRes.json;
    console.log(`[GitHub Upload] Found existing release: ${release.name || tag} (ID: ${release.id})`);
  } else {
    console.log(`[GitHub Upload] Creating new release for tag ${tag}...`);
    const createRes = await httpsRequest(`https://api.github.com/repos/${repo}/releases`, {
      method: 'POST',
      headers: { ...commonHeaders, 'Content-Type': 'application/json' },
    }, JSON.stringify({
      tag_name: tag,
      target_commitish: 'main',
      name: `Release ${tag}`,
      body: `Z-ERP Automated Update Patch ${tag}`,
      draft: false,
      prerelease: false,
    }));

    if (createRes.statusCode !== 201 || !createRes.json) {
      throw new Error(`Failed to create release: HTTP ${createRes.statusCode} - ${createRes.body}`);
    }
    release = createRes.json;
    console.log(`[GitHub Upload] Release created successfully (ID: ${release.id})`);
  }

  // 2. Check if asset already exists on this release
  if (Array.isArray(release.assets)) {
    for (const asset of release.assets) {
      if (asset.name === zipName) {
        console.log(`[GitHub Upload] Asset ${zipName} already exists (ID: ${asset.id}). Deleting old asset...`);
        const delRes = await httpsRequest(`https://api.github.com/repos/${repo}/releases/assets/${asset.id}`, {
          method: 'DELETE',
          headers: commonHeaders,
        });
        if (delRes.statusCode === 204 || delRes.statusCode === 200) {
          console.log(`[GitHub Upload] Old asset deleted.`);
        }
      }
    }
  }

  // 3. Upload Asset
  console.log(`[GitHub Upload] Uploading ${zipName} to release ${tag}...`);
  const uploadUrl = `https://uploads.github.com/repos/${repo}/releases/${release.id}/assets?name=${encodeURIComponent(zipName)}`;
  const fileBuffer = fs.readFileSync(zipPath);

  const uploadRes = await httpsRequest(uploadUrl, {
    method: 'POST',
    headers: {
      ...commonHeaders,
      'Content-Type': 'application/zip',
      'Content-Length': fileBuffer.length,
    },
  }, fileBuffer);

  if (uploadRes.statusCode !== 201 || !uploadRes.json) {
    throw new Error(`Failed to upload asset: HTTP ${uploadRes.statusCode} - ${uploadRes.body}`);
  }

  const downloadUrl = uploadRes.json.browser_download_url;
  console.log(`\n========================================================`);
  console.log(`✅ [SUCCESS] Asset uploaded successfully to GitHub Releases!`);
  console.log(`🔗 Direct Download URL: ${downloadUrl}`);
  console.log(`========================================================\n`);

  return downloadUrl;
}

if (require.main === module) {
  const version = process.argv[2] || require('../package.json').version;
  uploadReleaseAsset(version).catch((err) => {
    console.error(`❌ [ERROR] ${err.message}`);
    process.exit(1);
  });
}

module.exports = { uploadReleaseAsset };
