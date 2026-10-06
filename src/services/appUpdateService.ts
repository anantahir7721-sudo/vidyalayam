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
}

const DEFAULT_REPO = 'anantahir7721/vidyalayam';

export function getTargetGitHubRepo(): string {
  try {
    return localStorage.getItem('vidyalayam_github_repo') || DEFAULT_REPO;
  } catch {
    return DEFAULT_REPO;
  }
}

export function setTargetGitHubRepo(repo: string): void {
  try {
    localStorage.setItem('vidyalayam_github_repo', repo.trim());
  } catch {}
}

/**
 * Check GitHub repository for the latest pushed commit.
 * Uses GitHub Public REST API with fallback to server endpoint.
 */
export async function checkForGitHubUpdate(force = false): Promise<GitHubUpdateInfo> {
  const repo = getTargetGitHubRepo();
  const cachedLastSha = localStorage.getItem(`vidyalayam_last_known_sha_${repo}`) || '';
  const currentAppSha = localStorage.getItem('vidyalayam_installed_app_sha') || '';

  try {
    // 1. Try server proxy or direct GitHub API
    let commitData: any = null;

    try {
      const serverRes = await fetch(apiUrl(`/api/app-update-check?repo=${encodeURIComponent(repo)}`), {
        signal: AbortSignal.timeout(6000),
      });
      if (serverRes.ok) {
        const json = await serverRes.json();
        if (json.latestCommit) {
          commitData = json.latestCommit;
        }
      }
    } catch (e) {
      // Fallback directly to public GitHub API
    }

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
            author: commits[0].commit?.author?.name || 'GitHub',
            htmlUrl: commits[0].html_url,
          };
        }
      }
    }

    if (commitData && commitData.sha) {
      const remoteSha = commitData.sha;
      const cleanSha = remoteSha.slice(0, 7);

      // On very first check if installed app sha is not set, set it to the current remote sha
      if (!currentAppSha) {
        localStorage.setItem('vidyalayam_installed_app_sha', remoteSha);
        localStorage.setItem(`vidyalayam_last_known_sha_${repo}`, remoteSha);
        return {
          updateAvailable: false,
          currentVersion: cleanSha,
          repo,
        };
      }

      const isNewer = currentAppSha !== remoteSha;

      if (isNewer) {
        localStorage.setItem(`vidyalayam_last_known_sha_${repo}`, remoteSha);
      }

      return {
        updateAvailable: isNewer,
        currentVersion: currentAppSha.slice(0, 7),
        latestVersion: cleanSha,
        latestCommitSha: remoteSha,
        latestCommitMessage: commitData.message,
        latestCommitDate: commitData.date,
        authorName: commitData.author,
        repo,
        htmlUrl: commitData.htmlUrl || `https://github.com/${repo}/commit/${remoteSha}`,
      };
    }
  } catch (err) {
    console.warn('[AppUpdateService] Check failed:', err);
  }

  return {
    updateAvailable: false,
    currentVersion: currentAppSha ? currentAppSha.slice(0, 7) : '1.0.0',
    repo,
  };
}

/**
 * Apply the update by reloading and resetting the service worker or cache
 */
export function applyAppUpdate(newSha?: string): void {
  try {
    if (newSha) {
      localStorage.setItem('vidyalayam_installed_app_sha', newSha);
    }
    // Clear storage cache keys
    sessionStorage.clear();
    // Force reload bypassing cache
    window.location.reload();
  } catch (e) {
    window.location.reload();
  }
}
