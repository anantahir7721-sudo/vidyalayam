import os
import zipfile

public_dir = os.path.join(os.path.dirname(__file__), '..', 'public')
zip_path = os.path.join(public_dir, 'pwa-icons.zip')

print(f"Creating zip at {zip_path}...")

with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    # 1. Root icons
    for f in os.listdir(public_dir):
        if (f.startswith('icon-') or f.startswith('apple-touch-') or f.startswith('favicon')) and f.endswith(('.png', '.svg')):
            full_path = os.path.join(public_dir, f)
            zipf.write(full_path, arcname=f)

    # 2. Android folder
    android_dir = os.path.join(public_dir, 'android')
    if os.path.exists(android_dir):
        for f in os.listdir(android_dir):
            if f.endswith('.png'):
                zipf.write(os.path.join(android_dir, f), arcname=os.path.join('android', f))

    # 3. iOS folder
    ios_dir = os.path.join(public_dir, 'ios')
    if os.path.exists(ios_dir):
        for f in os.listdir(ios_dir):
            if f.endswith('.png'):
                zipf.write(os.path.join(ios_dir, f), arcname=os.path.join('ios', f))

    # 4. Windows 11 folder
    win_dir = os.path.join(public_dir, 'windows11')
    if os.path.exists(win_dir):
        for f in os.listdir(win_dir):
            if f.endswith('.png'):
                zipf.write(os.path.join(win_dir, f), arcname=os.path.join('windows11', f))

    # 5. Manifest & BrowserConfig
    for f in ['manifest.json', 'browserconfig.xml']:
        p = os.path.join(public_dir, f)
        if os.path.exists(p):
            zipf.write(p, arcname=f)

print(f"Successfully packaged {os.path.getsize(zip_path)} bytes into {zip_path}")
