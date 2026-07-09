# ZS Cloud ERP - Client Delivery Runbook

Welcome to the ZS Cloud ERP offline version! This document explains how to set up, manage, back up, and troubleshoot the system on a local server.

## 1. Initial Setup

1. Copy the `customer-portable` folder to your desired installation path (e.g., `C:\ZS_Cloud_ERP`).
2. Run `tools/launcher/scripts/Setup-ZS.ps1` as Administrator to perform initial prerequisites checks (if required by your environment).
3. Start the system by running `tools/launcher/scripts/Start-ZS.ps1`.
4. A splash screen will appear followed by the application window. The internal database and server will run automatically in the background.

## 2. Using the System

- Once started, the system opens a unified window. You can bookmark `http://localhost:5173` (or `http://localhost:3001` for APIs) if you want to access it from a web browser on the same machine.
- During the very first launch, the system will apply initial database schemas and prompt you to create the initial admin user ("Owner Bootstrap").

## 3. Backups and Restore

We highly recommend taking regular backups.

### How to Backup:
1. Navigate to **Settings -> System -> Backup**.
2. Click **Create Backup**. This generates a `.zip` file containing a snapshot of your database (`database.json`) and a metadata manifest.
3. Download and store the `.zip` file in a safe, external location (e.g., USB drive or cloud storage).

### How to Restore:
1. Navigate to **Settings -> System -> Restore**.
2. Upload a previously generated `.zip` backup file.
3. The system will verify the file's integrity and schema version. Upon confirmation, the backup will be applied and the app will restart.

## 4. Applying Updates (Offline Updates)

When a new version is released:
1. You will receive an update package `.patch.zip`.
2. Navigate to **Settings -> System -> Updates**.
3. Upload the `.patch.zip` file.
4. The system will verify the integrity of the patch. If valid, the system will close the interface, apply the new files (via a background PowerShell script), and restart automatically.

## 5. Troubleshooting and Support

If you encounter unexpected errors:
1. Navigate to **Settings -> System -> Support**.
2. Click **Generate Support Bundle**.
3. A `.zip` file containing sanitized application logs and diagnostics will be downloaded. Send this file to the support team.
4. **Note:** Support bundles do not contain any passwords, security keys, or sensitive database records.

### Completely Stopping the System
If the system becomes unresponsive or you need to shut it down completely, you can run `tools/launcher/scripts/Stop-ZS.ps1` as Administrator. This will terminate all background backend and database processes securely.
