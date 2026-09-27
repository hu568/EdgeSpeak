"""Package EdgeSpeak into a release zip.

Usage:
    python package_release.py              # build + package (auto version)
    python package_release.py 1.0.0        # build + package with version
    python package_release.py --skip-build # package only (exe already built)
"""

import os
import sys
import shutil
import subprocess
import zipfile
from datetime import datetime

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
DESKTOP_DIR = os.path.join(PROJECT_ROOT, "desktop")
TMP_DIR = os.path.join(PROJECT_ROOT, "TMP")
RELEASE_DIR = os.path.join(PROJECT_ROOT, "release")

APP_NAME = "EdgeSpeak"
INNER_DIR = "EdgeSpeak"


def get_version(args: list[str]) -> str:
    """Get version from args or generate from date."""
    for a in args:
        if a.count(".") >= 2 and not a.startswith("-"):
            return a
    return datetime.now().strftime("%Y%m%d")


def build_exe() -> bool:
    """Run PyInstaller to build EdgeSpeak.exe at the project root.

    Output layout (exe next to README, double-click to run)::

        <project root>/
        ├── EdgeSpeak.exe
        └── _internal/          # PyInstaller onedir runtime data
    """
    print("[1/4] Building PyInstaller exe...")
    spec = os.path.join(DESKTOP_DIR, "build.spec")
    dist = PROJECT_ROOT
    work = os.path.join(TMP_DIR, "build")

    # Clean previous root-level build artifacts (never touch project files)
    for name in ("EdgeSpeak.exe", "_internal", "EdgeSpeak"):
        p = os.path.join(dist, name)
        if os.path.isfile(p):
            os.remove(p)
        elif os.path.isdir(p):
            shutil.rmtree(p)
    if os.path.isdir(work):
        shutil.rmtree(work)

    result = subprocess.run(
        [
            sys.executable, "-m", "PyInstaller",
            spec,
            "--distpath", dist,
            "--workpath", work,
            "--clean",
        ],
        cwd=DESKTOP_DIR,
        capture_output=False,
    )

    if result.returncode != 0:
        print("  ERROR: PyInstaller build failed!")
        return False

    # PyInstaller COLLECT creates a nested subdirectory with the app name.
    # Move files up one level to get the root-level layout above.
    nested = os.path.join(dist, APP_NAME)
    if os.path.isdir(nested):
        for item in os.listdir(nested):
            shutil.move(os.path.join(nested, item), os.path.join(dist, item))
        os.rmdir(nested)

    # Clean build cache
    if os.path.isdir(work):
        shutil.rmtree(work)

    print("  Build complete.")
    return True


def create_release_zip(version: str) -> str:
    """Collect all runtime files and create a release zip."""
    zip_name = f"{INNER_DIR}-v{version}.zip"
    zip_path = os.path.join(RELEASE_DIR, zip_name)
    os.makedirs(RELEASE_DIR, exist_ok=True)

    print(f"[2/4] Creating release: {zip_name}")

    # Files to include (relative to project root)
    include = [
        "README.md",
        "LICENSE",
        "RELEASE_INFO.txt",
        "EdgeSpeak.exe",  # root-level: double-click to run
        "_internal",     # PyInstaller runtime data (next to exe)
    ]

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for path in include:
            src = os.path.join(PROJECT_ROOT, path)
            if not os.path.exists(src):
                print(f"  SKIP (not found): {path}")
                continue

            if os.path.isfile(src):
                # File goes to root of zip under same relative path
                zf.write(src, f"{INNER_DIR}/{path}")
                size_mb = os.path.getsize(src) / (1024 * 1024)
                print(f"  + {path} ({size_mb:.1f} MB)")
            else:
                # Directory — walk and add all files
                dir_count = 0
                for root, dirs, files in os.walk(src):
                    for f in files:
                        fp = os.path.join(root, f)
                        arcname = os.path.join(
                            INNER_DIR,
                            os.path.relpath(fp, PROJECT_ROOT),
                        )
                        zf.write(fp, arcname)
                        dir_count += 1
                print(f"  + {path}/ ({dir_count} files)")

    size_mb = os.path.getsize(zip_path) / (1024 * 1024)
    print(f"\n[3/4] Release zip: {zip_path} ({size_mb:.1f} MB)")
    return zip_path


def main():
    args = sys.argv[1:]
    skip_build = "--skip-build" in args
    version = get_version(args)

    print(f"EdgeSpeak — Release Packager")
    print(f"  Version: {version}")
    print(f"  Project: {PROJECT_ROOT}")
    print()

    if not skip_build:
        if not build_exe():
            sys.exit(1)
        print()
    else:
        print("[1/4] Skipping build (--skip-build)")
        print()

    zip_path = create_release_zip(version)
    print(f"[4/4] Done! → {zip_path}")


if __name__ == "__main__":
    main()
