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

export const DEFAULT_REPO = 'anantahir7721-sudo/vidyalayam';
export const APP_BASELINE_SHA = '73f7acde8925825ad4da87f7991ae1a102f88f28';
export const APP_BASELINE_VERSION = '1.0.45';

export function getTargetGitHubRepo(): string {
  try {
    const stored = localStorage.getItem('vidyalayam_github_repo');
    if (!stored || stored === 'anantahir7721/vidyalayam') {
      localStorage.setItem('vidyalayam_github_repo', DEFAULT_REPO);
      return DEFAULT_REPO;
    }
    return stored;
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

    // 1. Try server endpoint first (has 15s in-memory cache and bypasses GitHub client rate limits)
    try {
      const serverRes = await fetch(apiUrl(`/api/app-update-check?repo=${encodeURIComponent(repo)}`), {
        signal: AbortSignal.timeout(6000),
      });
      if (serverRes.ok) {
        const json = await serverRes.json();
        if (json.latestCommit) {
          commitData = json.latestCommit;
          if (json.apkDownloadUrl) apkDownloadUrl = json.apkDownloadUrl;
          if (json.releaseUrl) releaseUrl = json.releaseUrl;
        }
      }
    } catch (e) {
      // Fallback directly to public GitHub API
    }

    // 2. Direct GitHub REST API fallback if server route was unavailable
    if (!commitData) {
      const ghRes = await fetch(`https://api.github.com/repos/${repo}/commits?per_page=1`, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
        signal: AbortSignal.timeout(6000),
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
        sessionStorage.getItem(`vidyalayam_dismissed_update_${remoteSha}`) === 'true' ||
        sessionStorage.getItem('vidyalayam_update_modal_dismissed') === 'true' ||
        localStorage.getItem(`vidyalayam_dismissed_update_${remoteSha}`) === 'true' ||
        localStorage.getItem(`vidyalayam_dismissed_banner_${remoteSha}`) === 'true';

      // Only mark an update available if remote commit is genuinely newer than current baseline & installed SHA
      const isNewer =
        remoteSha !== APP_BASELINE_SHA &&
        currentAppSha !== remoteSha &&
        Boolean(remoteSha);

      if (isNewer) {
        localStorage.setItem(`vidyalayam_last_known_sha_${repo}`, remoteSha);
      }

      return {
        updateAvailable: isNewer && !isDismissed,
        currentVersion: currentAppSha.slice(0, 7),
        latestVersion: cleanSha,
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

  return {
    updateAvailable: false,
    currentVersion: currentAppSha ? currentAppSha.slice(0, 7) : APP_BASELINE_VERSION,
    repo,
  };
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
