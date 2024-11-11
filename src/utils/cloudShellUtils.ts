/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

"use strict";

import * as TelemetryWrapper from "vscode-extension-telemetry-wrapper";
import { AzureSession, CloudShell } from "../azure-account.api";

export interface IStorageAccount {
    resourceGroup: string;
    storageAccountName: string;
    fileShareName: string;
    storageAccountKey: string;
}

export async function getStorageAccountforCloudShell(cloudShell: CloudShell): Promise<IStorageAccount | undefined> {
    const session: AzureSession = await cloudShell.session;
    const token: IToken = await acquireToken(session);
    const userSettings: IUserSettings | undefined = await getUserSettings(token.accessToken, session.environment.resourceManagerEndpointUrl);
    if (!userSettings) {
        TelemetryWrapper.sendError(Error("getUserSettingsFail"));
        return;
    }
    const storageProfile: any = userSettings.storageProfile;
    const storageAccountSettings: any = storageProfile.storageAccountResourceId.substr(1, storageProfile.storageAccountResourceId.length).split("/");
    const storageAccountKey: string | undefined = await getStorageAccountKey(token.accessToken, storageAccountSettings[1], storageAccountSettings[3], storageAccountSettings[7]);

    if (!storageAccountKey) {
        TelemetryWrapper.sendError(Error("getStorageAccountKeyFail"));
        return;
    }

    return {
        resourceGroup: storageAccountSettings[3],
        storageAccountName: storageAccountSettings[7],
        fileShareName: storageProfile.fileShareName,
        storageAccountKey,
    };
}

interface IUserSettings {
    preferredLocation: string;
    preferredOsType: string; // The last OS chosen in the portal.
    storageProfile: any;
}

interface IToken {
    session: AzureSession;
    accessToken: string;
    refreshToken: string;
}

async function acquireToken(session: AzureSession): Promise<IToken> {
    return new Promise<IToken>((resolve, reject) => {
        const credentials: any = session.credentials;
        const environment: any = session.environment;
        credentials.context.acquireToken(environment.activeDirectoryResourceId, credentials.username, credentials.clientId, (err: any, result: any) => {
            if (err) {
                reject(err);
            } else {
                resolve({
                    session,
                    accessToken: result.accessToken,
                    refreshToken: result.refreshToken,
                });
            }
        });
    });
}

const consoleApiVersion = "2017-08-01-preview";
async function getUserSettings(accessToken: string, armEndpoint: string): Promise<IUserSettings | undefined> {
    const targetUri = `${armEndpoint}/providers/Microsoft.Portal/userSettings/cloudconsole?api-version=${consoleApiVersion}`;
    try {
        const response = await fetch(targetUri, {
            method: "GET",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            TelemetryWrapper.sendError(new Error(`Failed to get user settings. Status code: ${response.status}`));
            return;
        }

        const data: any = await response.json();
        if (data && data.properties) {
            return data.properties as IUserSettings;
        } else {
            TelemetryWrapper.sendError(new Error("Invalid user settings response"));
        }
    } catch (error) {
        TelemetryWrapper.sendError(error);
    }
}

async function getStorageAccountKey(accessToken: string, subscriptionId: string, resourceGroup: string, storageAccountName: string): Promise<string | undefined> {
    const targetUri = `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Storage/storageAccounts/${storageAccountName}/listKeys?api-version=2017-06-01`;
    try {
        const response = await fetch(targetUri, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            TelemetryWrapper.sendError(new Error(`Failed to get storage account key. Status code: ${response.status}`));
            return;
        }

        const data: any = await response.json();
        if (data && data.keys && data.keys.length > 0) {
            return data.keys[0].value;
        } else {
            TelemetryWrapper.sendError(new Error("Invalid storage account key response"));
        }
    } catch (error) {
        TelemetryWrapper.sendError(error);
    }
}
