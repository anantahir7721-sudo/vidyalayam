/**
 * GitHub App Update Checker Service for Vidyalayam
 * Automatically verifies whether a new commit or release has been pushed to GitHub.
 */

import { apiUrl } from '../utils/apiConfig';
import { db } from '../firebase/config';
import { collection, query, where, limit, onSnapshot } from 'firebase/firestore';
import { sendNotification } from '../utils/notificationUtils';

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
export const APP_BASELINE_VERSION = '1.0.61';

// Purge any stale legacy cached versions (< 1.0.61) on module load
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const staleInstalled = localStorage.getItem('vidyalayam_installed_app_version');
    if (staleInstalled && !isVersionGreater(staleInstalled, APP_BASELINE_VERSION) && staleInstalled !== '1.0.61' && staleInstalled !== 'v1.0.61') {
      localStorage.removeItem('vidyalayam_installed_app_version');
    }
    const staleGh = localStorage.getItem('vidyalayam_github_version');
    if (staleGh && !isVersionGreater(staleGh, APP_BASELINE_VERSION) && staleGh !== '1.0.61' && staleGh !== 'v1.0.61') {
      localStorage.removeItem('vidyalayam_github_version');
    }
    const staleWeb = localStorage.getItem('vidyalayam_web_version');
    if (staleWeb && !isVersionGreater(staleWeb, APP_BASELINE_VERSION) && staleWeb !== '1.0.61' && staleWeb !== 'v1.0.61') {
      localStorage.removeItem('vidyalayam_web_version');
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

    // 2. On Web, prioritize latest verified web release version
    const webVer = localStorage.getItem('vidyalayam_web_version');
    if (webVer && (webVer === '1.0.61' || webVer === 'v1.0.61' || isVersionGreater(webVer, APP_BASELINE_VERSION))) {
      const wv = webVer.trim();
      return wv.startsWith('v') ? wv : `v${wv}`;
    }

    // 3. Clear any stale localStorage versions (e.g. older caches)
    const installedVer = localStorage.getItem('vidyalayam_installed_app_version');
    if (installedVer) {
      if (!isVersionGreater(installedVer, APP_BASELINE_VERSION) && installedVer !== '1.0.61' && installedVer !== 'v1.0.61') {
        localStorage.removeItem('vidyalayam_installed_app_version');
      } else {
        const v = installedVer.trim();
        return v.startsWith('v') ? v : `v${v}`;
      }
    }

    const ghVer = localStorage.getItem('vidyalayam_github_version');
    if (ghVer) {
      if (!isVersionGreater(ghVer, APP_BASELINE_VERSION) && ghVer !== '1.0.61' && ghVer !== 'v1.0.61') {
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
      let liveVer = getAppVersion();

      // On Web platform (non-AndroidBridge), dynamically sync current web version to the latest verified release
      const isNativeAndroid = typeof (window as any).AndroidBridge?.getAppVersionName === 'function';
      if (!isNativeAndroid && releaseVersionName) {
        localStorage.setItem('vidyalayam_web_version', releaseVersionName);
        liveVer = releaseVersionName;
      }

      // Check whether remote release has a strictly higher version than currently installed
      // (e.g., if live is 1.0.60 and release is 1.0.61, isNewer is TRUE for APK users!)
      let isNewer = false;
      if (isNativeAndroid) {
        if (releaseVersionName) {
          isNewer = isVersionGreater(releaseVersionName, liveVer);
        } else {
          const isSameSha = currentAppSha === remoteSha || (releaseCommitSha && currentAppSha === releaseCommitSha);
          isNewer = !isSameSha && Boolean(remoteSha) && remoteSha !== APP_BASELINE_SHA;
        }
      } else {
        // On Web, detect if a new commit or release was pushed to GitHub
        const isSameSha = currentAppSha === remoteSha;
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

/**
 * Returns the public Webhook URL to configure inside GitHub Repository Settings
 */
export function getGitHubWebhookUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/api/webhooks/github`;
  }
  return '/api/webhooks/github';
}

/**
 * Dispatch an immediate test push notification mimicking a GitHub code push
 */
export async function sendTestGitHubPushNotification(customMessage?: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(apiUrl('/api/webhooks/github/test'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: customMessage || 'નવી સુવિધાઓ અને કાર્યક્ષમતા સુધારણાઓ GitHub પર અપડેટ કરવામાં આવ્યા છે.',
        author: 'Vidyalayam Developer',
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { success: true, message: data.message || 'ટેસ્ટ નોટિફિકેશન મોકલવામાં આવ્યું છે!' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Error triggering test notification' };
  }
}

/**
 * Real-Time GitHub Push Notification Listener:
 * 1. Connects to SSE (/api/updates/stream) for instant zero-latency push alerts
 * 2. Listens to Firestore system_notifications with category 'github_update' for multi-device sync
 * 3. Triggers native push notifications (Android APK & Browser Web Push) via sendNotification()
 * 4. Dispatches in-app custom event 'github-push-received'
 */
export function subscribeToGitHubPushNotifications(
  onUpdateDetected?: (info: GitHubUpdateInfo) => void
): () => void {
  let isSubscribed = true;
  let eventSource: EventSource | null = null;
  let firestoreUnsub: (() => void) | null = null;

  const handleIncomingPush = (data: {
    sha?: string;
    shortSha?: string;
    message?: string;
    author?: string;
    repo?: string;
    title?: string;
    body?: string;
    apkDownloadUrl?: string;
    releaseUrl?: string;
    compareUrl?: string;
  }) => {
    if (!data || !data.sha) return;
    const sha = data.sha;
    const shortSha = data.shortSha || sha.slice(0, 7);

    // Check if user disabled system updates in prefs
    try {
      const prefsStr = localStorage.getItem('vidyalayam_notification_prefs');
      if (prefsStr) {
        const prefs = JSON.parse(prefsStr);
        if (prefs.systemUpdates === false) {
          return;
        }
      }
    } catch {}

    // Check if already notified for this commit SHA
    const lastNotified = localStorage.getItem('vidyalayam_last_notified_commit');
    if (lastNotified === sha) {
      return;
    }

    // Mark as notified
    localStorage.setItem('vidyalayam_last_notified_commit', sha);

    const title = data.title || `🚀 વિદ્યાલયમ નવી અપડેટ (${shortSha})`;
    const body = data.body || `GitHub પર નવો ફેરફાર પુશ થયો: "${data.message || 'નવી સુવિધાઓ'}".`;

    // 1. Dispatch Push Notification (Web & Android APK)
    sendNotification(title, body, 'github_update').catch((e) => {
      console.warn('[AppUpdate] Push notification dispatch failed:', e);
    });

    const updateInfo: GitHubUpdateInfo = {
      updateAvailable: true,
      currentVersion: getAppVersion(),
      latestVersion: shortSha,
      latestCommitSha: sha,
      latestCommitMessage: data.message || '',
      authorName: data.author || 'Vidyalayam Developer',
      repo: data.repo || DEFAULT_REPO,
      htmlUrl: data.compareUrl || `https://github.com/${data.repo || DEFAULT_REPO}`,
      apkDownloadUrl: data.apkDownloadUrl,
      releaseUrl: data.releaseUrl,
    };

    // 2. Notify callback and dispatch global custom event
    if (onUpdateDetected) {
      onUpdateDetected(updateInfo);
    }

    try {
      window.dispatchEvent(new CustomEvent('github-push-received', { detail: updateInfo }));
    } catch {}
  };

  // 1. Connect to SSE stream (/api/updates/stream)
  try {
    const streamUrl = apiUrl('/api/updates/stream');
    eventSource = new EventSource(streamUrl);

    eventSource.addEventListener('github-push', (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data);
        handleIncomingPush(parsed);
      } catch (err) {
        console.warn('[AppUpdate] Failed parsing SSE push event:', err);
      }
    });

    eventSource.onerror = () => {
      // EventSource automatically retries connection
    };
  } catch (sseErr) {
    console.warn('[AppUpdate] SSE not supported or connection error:', sseErr);
  }

  // 2. Also listen via Firestore system_notifications (multi-device redundancy)
  try {
    const notifsCol = collection(db, 'system_notifications');
    const q = query(
      notifsCol,
      where('category', '==', 'github_update'),
      limit(5)
    );

    let isInitialFirestore = true;
    firestoreUnsub = onSnapshot(
      q,
      (snapshot) => {
        if (!isSubscribed) return;
        if (isInitialFirestore) {
          isInitialFirestore = false;
          // Record current SHAs so opening the app doesn't re-alert old pushes
          snapshot.docs.forEach((doc) => {
            const d = doc.data();
            const metaSha = d?.metadata?.sha;
            if (metaSha && !localStorage.getItem('vidyalayam_last_notified_commit')) {
              localStorage.setItem('vidyalayam_last_notified_commit', metaSha);
            }
          });
          return;
        }

        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const d = change.doc.data();
            if (d && d.metadata?.isGitHubPush) {
              handleIncomingPush({
                sha: d.metadata.sha,
                shortSha: d.metadata.shortSha,
                message: d.metadata.commitMessage,
                author: d.metadata.author,
                repo: d.metadata.repo,
                title: d.title,
                body: d.body,
                apkDownloadUrl: d.metadata.apkDownloadUrl,
              });
            }
          }
        });
      },
      (err) => {
        console.warn('[AppUpdate] Firestore update listener warning:', err);
      }
    );
  } catch (fsErr) {
    console.warn('[AppUpdate] Firestore setup warning:', fsErr);
  }

  return () => {
    isSubscribed = false;
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    if (firestoreUnsub) {
      firestoreUnsub();
      firestoreUnsub = null;
    }
  };
}

