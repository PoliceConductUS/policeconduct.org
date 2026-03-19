#!/usr/bin/env python3

import argparse
import json
import logging
import shutil
import subprocess
import sys
from pathlib import Path


def run_command(command):
    result = subprocess.run(
        command,
        capture_output=True,
        text=True,
        check=False,
    )
    output = f"{result.stdout}{result.stderr}"
    return result.returncode == 0, output


def check_dependency(dependency):
    if shutil.which(dependency) is None:
        logging.error(
            "%s is not installed. Please install %s and rerun the script.",
            dependency,
            dependency,
        )
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="Upgrade npm packages and test changes."
    )
    parser.add_argument(
        "--target",
        choices=["latest", "minor", "patch"],
        required=True,
        help="Target version for upgrades (latest, minor, or patch)",
    )
    parser.add_argument(
        "--log", default="upgrade.log", help="Log file name (default: upgrade.log)"
    )
    args = parser.parse_args()

    logging.basicConfig(
        filename=args.log,
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s",
    )

    for dep in ["node", "git", "npm", "npx"]:
        check_dependency(dep)

    if not Path("./package.json").exists():
        logging.error(
            "package.json not found in the current directory. Please ensure you are in the correct project directory."
        )
        sys.exit(1)

    command = [
        "npx",
        "-y",
        "npm-check-updates",
        "--target",
        args.target,
        "--jsonUpgraded",
    ]
    logging.info("Running %s", " ".join(command))

    success, output = run_command(command)
    if not success:
        logging.error("npx npm-check-updates failed. Exiting.")
        sys.exit(1)

    upgrade_list = json.loads(output)
    logging.debug("upgrade_list", upgrade_list)

    if not upgrade_list:
        logging.info("No packages to upgrade.")
        sys.exit(0)

    package_items = list(upgrade_list.items())
    logging.info("%s packages have upgrades.", len(package_items))

    successful_upgrades = 0
    failed_upgrades = 0
    total = len(package_items)
    for idx, (package_name, package_version) in enumerate(package_items, start=1):
        prefix = f"[{idx}/{total}] {package_name}"
        print(prefix, end="", flush=True)
        logging.info("Upgrading %s...", package_name)

        success, output = run_command(
            [
                "npx",
                "npm-check-updates",
                "-u",
                "--target",
                args.target,
                package_name,
            ]
        )
        if not success:
            logging.error(
                "FAILED: npx npm-check-updates -u --target %s %s. Reverting changes and skipping to next package.",
                args.target,
                package_name,
            )
            logging.error(output)
            run_command(["git", "checkout", "--", "package.json", "package-lock.json"])
            run_command(["npm", "install"])
            failed_upgrades += 1
            print(
                f"\r{prefix} (success={successful_upgrades}, failed={failed_upgrades})"
            )
            continue

        success, output = run_command(["npm", "install"])
        if not success:
            logging.error(
                "npm install failed after upgrading %s. Reverting changes and skipping to next package.",
                package_name,
            )
            logging.error(output)
            run_command(["git", "checkout", "--", "package.json", "package-lock.json"])
            run_command(["npm", "install"])
            failed_upgrades += 1
            print(
                f"\r{prefix} (success={successful_upgrades}, failed={failed_upgrades})"
            )
            continue

        logging.info(output)

        success, output = run_command(["npm", "run", "test"])
        if not success:
            logging.error(
                "npm run test failed for %s. Reverting changes and skipping to next package.",
                package_name,
            )
            logging.error(output)
            run_command(["git", "checkout", "--", "package.json", "package-lock.json"])
            run_command(["npm", "install"])
            failed_upgrades += 1
            print(
                f"\r{prefix} (success={successful_upgrades}, failed={failed_upgrades})"
            )
            continue

        logging.info(output)

        success, output = run_command(
            ["git", "add", "package.json", "package-lock.json"]
        )
        if not success:
            logging.error(
                "git add failed for %s. Reverting changes and skipping to next package.",
                package_name,
            )
            logging.error(output)
            run_command(["git", "reset", "HEAD", "package.json", "package-lock.json"])
            run_command(["git", "checkout", "--", "package.json", "package-lock.json"])
            run_command(["npm", "install"])
            failed_upgrades += 1
            print(
                f"\r{prefix} (success={successful_upgrades}, failed={failed_upgrades})"
            )
            continue

        success, output = run_command(
            ["git", "commit", "-m", f"upgrade {package_name} to {package_version}"]
        )
        if not success:
            logging.error(
                "git commit failed for %s. Reverting changes and skipping to next package.",
                package_name,
            )
            logging.error(output)
            run_command(["git", "reset", "HEAD", "package.json", "package-lock.json"])
            run_command(["git", "checkout", "--", "package.json", "package-lock.json"])
            run_command(["npm", "install"])
            failed_upgrades += 1
            print(
                f"\r{prefix} (success={successful_upgrades}, failed={failed_upgrades})"
            )
            continue

        logging.info("%s successfully upgraded and committed.", package_name)
        successful_upgrades += 1
        print(f"\r{prefix} (success={successful_upgrades}, failed={failed_upgrades})")

    logging.info(
        "All packages processed. Successful upgrades: %s, Failed upgrades: %s",
        successful_upgrades,
        failed_upgrades,
    )


if __name__ == "__main__":
    main()
