/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

"use strict";

import { ShareServiceClient, StorageSharedKeyCredential } from "@azure/storage-file-share";
import { CloudFile } from "./cloudFile";

export enum TerminalType {
    Integrated = "integrated",
    CloudShell = "cloudshell",
}

export enum FileSystem {
    docker = "docker",
    local = "local",
    cloudshell = "cloudshell",
}

export enum TestOption {
    lint = "lint",
    e2e = "end to end",
    custom = "custom",
}

export enum TerraformCommand {
    Init = "terraform init",
    Plan = "terraform plan",
    Apply = "terraform apply",
    Destroy = "terraform destroy",
    Refresh = "terraform refresh",
    Validate = "terraform validate",
}

export function escapeFile(data: string): string {
    return data.replace(/"/g, '\\"').replace(/\$/g, "\\\$");
}

export async function azFileDelete(
    workspaceName: string,
    storageAccountName: string,
    storageAccountKey: string,
    fileShareName: string,
    localFileUri: string): Promise<void> {

    const sharedKeyCredential = new StorageSharedKeyCredential(storageAccountName, storageAccountKey);
    const shareServiceClient = new ShareServiceClient(`https://${storageAccountName}.file.core.windows.net`, sharedKeyCredential);
    const cf = new CloudFile(
        workspaceName,
        fileShareName,
        localFileUri,
        FileSystem.local);
    const fileClient = shareServiceClient.getShareClient(fileShareName).getDirectoryClient(workspaceName).getFileClient(cf.localUri);
    await fileClient.deleteIfExists();
}

export async function azFilePull(
    workspaceName: string,
    storageAccountName: string,
    storageAccountKey: string,
    fileShareName: string,
    cloudShellFileName: string): Promise<void> {

    const sharedKeyCredential = new StorageSharedKeyCredential(storageAccountName, storageAccountKey);
    const shareServiceClient = new ShareServiceClient(`https://${storageAccountName}.file.core.windows.net`, sharedKeyCredential);
    const cf = new CloudFile(
        workspaceName,
        fileShareName,
        cloudShellFileName,
        FileSystem.cloudshell);
    const fileClient = shareServiceClient.getShareClient(fileShareName).getDirectoryClient(workspaceName).getFileClient(cf.cloudShellUri);
    await fileClient.download();
}

export async function azFilePush(
    workspaceName: string,
    storageAccountName: string,
    storageAccountKey: string,
    fileShareName: string,
    fileName: string): Promise<void> {

    const sharedKeyCredential = new StorageSharedKeyCredential(storageAccountName, storageAccountKey);
    const shareServiceClient = new ShareServiceClient(`https://${storageAccountName}.file.core.windows.net`, sharedKeyCredential);
    const cf = new CloudFile(
        workspaceName,
        fileShareName,
        fileName,
        FileSystem.local);
    const shareClient = shareServiceClient.getShareClient(cf.fileShareName);
    shareClient.createIfNotExists();

    const directoryClient = shareClient.getDirectoryClient(cf.cloudShellDir);
    directoryClient.createIfNotExists();

    const fileClient = directoryClient.getFileClient(cf.localUri);
    await fileClient.uploadFile(cf.localUri);
}