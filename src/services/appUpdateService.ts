/**
 * GitHub App Update Checker Service for Vidyalayam
 * Automatically verifies whether a new commit or release has been pushed to GitHub.
 */

import { apiUrl } from '../utils/apiConfig';

export interface GitHubUpdateInfo {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion?: string;
  latestCommitSha?: string;
  latestCommitMessage?: string;
  latestCommitDate?: string;
  authorName?: string;
  repo: string;
  htmlUrl?: string;
  apkDownloadUrl?: string;
  releaseUrl?: string;
}

export const DEFAULT_REPO = 'anantahir7721-sudo/Vidyalayam-releases';
export const APP_BASELINE_SHA = 'b9136da768645cda5da214d950cc9ada47a52c45';
export const APP_BASELINE_VERSION = '1.0.60';

// Purge any stale legacy cached versions (< 1.0.60) on module load
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const staleInstalled = localStorage.getItem('vidyalayam_installed_app_version');
    if (staleInstalled && !isVersionGreater(staleInstalled, APP_BASELINE_VERSION)) {
      localStorage.removeItem('vidyalayam_installed_app_version');
    }
    const staleGh = localStorage.getItem('vidyalayam_github_version');
    if (staleGh && !isVersionGreater(staleGh, APP_BASELINE_VERSION)) {
      localStorage.removeItem('vidyalayam_github_version');
    }
  }
} catch {}

/**
 * Parses numeric version parts (e.g. "v1.0.54" -> [1, 0, 54])
 */
export function parseVersionParts(verStr: string): number[] {
  if (!verStr) return [0, 0, 0];
  const cleaned = verStr.replace(/^v/i, '').trim();
  const parts = cleaned.split('.').map((p) => {
    const num = parseInt(p.replace(/[^0-9]/g, ''), 10);
    return isNaN(num) ? 0 : num;
  });
  while (parts.length < 3) parts.push(0);
  return parts;
}

/**
 * Returns true ONLY if remoteVer is strictly greater than currentVer
 * (e.g. 1.0.55 > 1.0.54 returns true, 1.0.54 > 1.0.54 returns false)
 */
export function isVersionGreater(remoteVer: string, currentVer: string): boolean {
  const r = parseVersionParts(remoteVer);
  const c = parseVersionParts(currentVer);
  for (let i = 0; i < Math.max(r.length, c.length); i++) {
    const rPart = r[i] || 0;
    const cPart = c[i] || 0;
    if (rPart > cPart) return true;
    if (rPart < cPart) return false;
  }
  return false;
}

export function getAppVersion(): string {
  try {
    // 1. If running inside native Android app, get the real installed version directly from Android PackageInfo
    if (typeof (window as any).AndroidBridge?.getAppVersionName === 'function') {
      const nativeVer = (window as any).AndroidBridge.getAppVersionName();
      if (nativeVer && typeof nativeVer === 'string' && nativeVer.trim()) {
        const nv = nativeVer.trim();
        return nv.startsWith('v') ? nv : `v${nv}`;
      }
    }

    // 2. Clear any stale localStorage versions (e.g. older v1.0.52 or v1.0.58 caches)
    const installedVer = localStorage.getItem('vidyalayam_installed_app_version');
    if (installedVer) {
      if (!isVersionGreater(installedVer, APP_BASELINE_VERSION)) {
        localStorage.removeItem('vidyalayam_installed_app_version');
      } else {
        const v = installedVer.trim();
        return v.startsWith('v') ? v : `v${v}`;
      }
    }

    const ghVer = localStorage.getItem('vidyalayam_github_version');
    if (ghVer) {
      if (!isVersionGreater(ghVer, APP_BASELINE_VERSION)) {
        localStorage.removeItem('vidyalayam_github_version');
      } else {
        const v = ghVer.trim();
        return v.startsWith('v') ? v : `v${v}`;
      }
    }
  } catch {}
  return `v${APP_BASELINE_VERSION}`;
}

export function getTargetGitHubRepo(): string {
  try {
    const stored = localStorage.getItem('vidyalayam_github_repo');
    if (
      !stored ||
      stored.toLowerCase().includes('vidyalayam') &&
      !stored.toLowerCase().includes('vidyalayam-releases')
    ) {
      localStorage.setItem('vidyalayam_github_repo', DEFAULT_REPO);
      return DEFAULT_REPO;
    }
    return stored || DEFAULT_REPO;
  } catch {
    return DEFAULT_REPO;
  }
}

export function setTargetGitHubRepo(repo: string): void {
  try {
    localStorage.setItem('vidyalayam_github_repo', repo.trim());
  } catch {}
}

export function dismissUpdateInSession(sha?: string): void {
  try {
    if (sha) {
      sessionStorage.setItem(`vidyalayam_dismissed_update_${sha}`, 'true');
      localStorage.setItem(`vidyalayam_dismissed_update_${sha}`, 'true');
    }
    sessionStorage.setItem('vidyalayam_update_modal_dismissed', 'true');
  } catch {}
}

export function dismissUpdateBannerPermanently(sha?: string): void {
  try {
    if (sha) {
      localStorage.setItem(`vidyalayam_dismissed_banner_${sha}`, 'true');
      sessionStorage.setItem(`vidyalayam_dismissed_banner_${sha}`, 'true');
    }
  } catch {}
}

/**
 * Check GitHub repository for the latest pushed commit.
 * Uses server endpoint with in-memory caching & rate limit immunity, with fallback to public GitHub API.
 */
export async function checkForGitHubUpdate(force = false): Promise<GitHubUpdateInfo> {
  const repo = getTargetGitHubRepo();
  let currentAppSha = localStorage.getItem('vidyalayam_installed_app_sha');

  try {
    let commitData: any = null;
    let apkDownloadUrl = `https://github.com/${repo}/releases/download/latest/app-debug.apk`;
    let releaseUrl = `https://github.com/${repo}/releases/latest`;

    // 1. In Public Release Repo: Directly query GitHub releases/latest first!
    // This works 100% reliably in APK without depending on any server proxy or CORS issues!
    let releaseCommitSha = '';
    let releaseVersionName = '';
    try {
      const relRes = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
        headers: { Accept: 'application/vnd.github.v3+json' },
        signal: AbortSignal.timeout(6000),
      });
      if (relRes.ok) {
        const relData = await relRes.json();
        if (relData) {
          if (relData.html_url) releaseUrl = relData.html_url;

          // Parse version name from release name (e.g. "Vidyalayam v1.0.56 (Latest)" -> "v1.0.56")
          const vm = (relData.name || '').match(/v?(\d+\.\d+\.?\d*)/i);
          if (vm) {
            releaseVersionName = vm[0].startsWith('v') ? vm[0] : 'v' + vm[0];
          }

          // Parse release commit SHA from release body if present
          if (relData.body) {
            const commitMatch = relData.body.match(/`([0-9a-f]{40})`/i) || relData.body.match(/Commit\*\*:\s*`?([0-9a-f]{7,40})`?/i);
            if (commitMatch) {
              releaseCommitSha = commitMatch[1];
            }
          }

          // Locate APK download asset
          if (Array.isArray(relData.assets)) {
            const apkAsset = relData.assets.find((a: any) =>
              a.name && (a.name.endsWith('.apk') || a.name === 'app-debug.apk')
            );
            if (apkAsset && apkAsset.browser_download_url) {
              apkDownloadUrl = apkAsset.browser_download_url;
            }
          }

          commitData = {
            sha: releaseCommitSha || relData.target_commitish || relData.node_id || 'release',
            message: relData.name || 'New Release',
            date: relData.published_at || relData.created_at || new Date().toISOString(),
            author: relData.author?.login || 'Vidyalayam Developer',
            htmlUrl: relData.html_url,
          };
        }
      }
    } catch (e) {
      // Fallback to server route or direct commits
    }

    // 2. Server endpoint fallback
    if (!commitData || !releaseVersionName) {
      try {
        const serverRes = await fetch(apiUrl(`/api/app-update-check?repo=${encodeURIComponent(repo)}`), {
          signal: AbortSignal.timeout(5000),
        });
        if (serverRes.ok) {
          const json = await serverRes.json();
          if (json.versionName || json.latestVersion) {
            releaseVersionName = json.versionName || json.latestVersion;
          }
          if (json.releaseCommitSha) {
            releaseCommitSha = json.releaseCommitSha;
          }
          if (json.latestCommit) {
            commitData = json.latestCommit;
            if (json.apkDownloadUrl) apkDownloadUrl = json.apkDownloadUrl;
            if (json.releaseUrl) releaseUrl = json.releaseUrl;
          }
        }
      } catch (e) {
        // Fallback directly to commits
      }
    }

    // 3. Direct GitHub commits API fallback
    if (!commitData) {
      const ghRes = await fetch(`https://api.github.com/repos/${repo}/commits?per_page=1`, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (ghRes.ok) {
        const commits = await ghRes.json();
        if (Array.isArray(commits) && commits.length > 0) {
          commitData = {
            sha: commits[0].sha,
            message: commits[0].commit?.message || '',
            date: commits[0].commit?.committer?.date || '',
            author: commits[0].commit?.author?.name || 'Vidyalayam Developer',
            htmlUrl: commits[0].html_url,
          };
        }
      }
    }

    // 3. Process commit and verify if there is an ACTUAL new update
    if (commitData && commitData.sha) {
      const remoteSha = commitData.sha;
      const cleanSha = remoteSha.slice(0, 7);

      // If app has no recorded SHA or holds legacy baseline, sync to current APP_BASELINE_SHA
      if (!currentAppSha || currentAppSha === '4e918a29cb8b96f88ceb1940877c8d13d86d9d08') {
        currentAppSha = APP_BASELINE_SHA;
        localStorage.setItem('vidyalayam_installed_app_sha', APP_BASELINE_SHA);
      }

      // Check if update was dismissed in session or permanently
      const isDismissed =
        !force &&
        (sessionStorage.getItem(`vidyalayam_dismissed_update_${remoteSha}`) === 'true' ||
          sessionStorage.getItem('vidyalayam_update_modal_dismissed') === 'true' ||
          localStorage.getItem(`vidyalayam_dismissed_update_${remoteSha}`) === 'true' ||
          localStorage.getItem(`vidyalayam_dismissed_banner_${remoteSha}`) === 'true');

      // The live installed version on this device
      const liveVer = getAppVersion();

      // Check whether remote release has a strictly higher version than currently installed
      // (e.g., if live is 1.0.54 and release is 1.0.54, isNewer is FALSE; only if release is 1.0.55+ is it TRUE)
      let isNewer = false;
      if (releaseVersionName) {
        isNewer = isVersionGreater(releaseVersionName, liveVer);
      } else {
        // Fallback to commit SHA comparison only if version name was not available
        const isSameSha = currentAppSha === remoteSha || (releaseCommitSha && currentAppSha === releaseCommitSha);
        isNewer = !isSameSha && Boolean(remoteSha) && remoteSha !== APP_BASELINE_SHA;
      }

      if (isNewer) {
        localStorage.setItem(`vidyalayam_last_known_sha_${repo}`, remoteSha);
      }

      return {
        updateAvailable: isNewer && !isDismissed,
        currentVersion: liveVer,
        latestVersion: releaseVersionName || cleanSha,
        latestCommitSha: remoteSha,
        latestCommitMessage: commitData.message,
        latestCommitDate: commitData.date,
        repo,
        htmlUrl: commitData.htmlUrl || `https://github.com/${repo}/commit/${remoteSha}`,
        apkDownloadUrl,
        releaseUrl,
      };
    }
  } catch (err) {
    console.warn('[AppUpdateService] Check failed:', err);
  }

  const liveVer = getAppVersion();
  return {
    updateAvailable: false,
    currentVersion: liveVer,
    latestVersion: liveVer,
    repo,
  };
}

/**
 * Downloads the APK directly inside the application with streaming progress.
 * Completely eliminates redirection to external Chrome browsers or tabs.
 */
export async function downloadApkInApp(
  apkUrl: string,
  onProgress?: (percent: number, loadedBytes: number, totalBytes: number) => void
): Promise<{ success: boolean; blob?: Blob; error?: string }> {
  try {
    const streamUrl = apiUrl(`/api/download-apk?url=${encodeURIComponent(apkUrl)}`);
    let response: Response;

    try {
      response = await fetch(streamUrl, {
        headers: { Accept: 'application/vnd.android.package-archive, */*' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch {
      // Fallback directly to direct APK download link
      response = await fetch(apkUrl, {
        headers: { Accept: 'application/vnd.android.package-archive, */*' },
      });
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch APK (${response.status})`);
    }

    const contentLengthHeader = response.headers.get('content-length');
    const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;

    if (!response.body) {
      const blob = await response.blob();
      onProgress?.(100, blob.size, blob.size);
      return { success: true, blob };
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let loadedBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        loadedBytes += value.length;
        if (totalBytes > 0) {
          const percent = Math.min(100, Math.round((loadedBytes / totalBytes) * 100));
          onProgress?.(percent, loadedBytes, totalBytes);
        } else {
          onProgress?.(-1, loadedBytes, 0);
        }
      }
    }

    const blob = new Blob(chunks as any[], { type: 'application/vnd.android.package-archive' });
    onProgress?.(100, loadedBytes, totalBytes || loadedBytes);
    return { success: true, blob };
  } catch (err: any) {
    console.error('[AppUpdateService] APK in-app download error:', err);
    return { success: false, error: err.message || 'Download error' };
  }
}

/**
 * Apply the update by unregistering service workers, clearing storage cache and reloading cleanly
 */
export async function applyAppUpdate(newSha?: string): Promise<void> {
  try {
    if (newSha) {
      localStorage.setItem('vidyalayam_installed_app_sha', newSha);
    }
    // Clear storage cache keys
    sessionStorage.clear();

    // Clear CacheStorage (Service Worker caches)
    if ('caches' in window) {
      try {
        const cacheKeys = await window.caches.keys();
        await Promise.all(cacheKeys.map((k) => window.caches.delete(k)));
      } catch (err) {
        console.warn('Cache clear error:', err);
      }
    }

    // Unregister service workers to force latest assets
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      } catch (swErr) {
        console.warn('SW unregister error:', swErr);
      }
    }

    // Force hard reload bypassing browser cache
    const cacheBuster = `_update=${Date.now()}`;
    const url = new URL(window.location.href);
    url.searchParams.set('_v', String(Date.now()));
    window.location.href = url.toString();
  } catch (e) {
    window.location.reload();
  }
}
