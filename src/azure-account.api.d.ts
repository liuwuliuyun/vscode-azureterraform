/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event, Terminal } from 'vscode';
import { ServiceClientCredentials } from '@azure/ms-rest-js';
import { Environment } from '@azure/ms-rest-azure-env';
import { Subscription } from '@azure/arm-resources-subscriptions';

export type AzureLoginStatus = 'Initializing' | 'LoggingIn' | 'LoggedIn' | 'LoggedOut';

export interface AzureAccount {
	readonly status: AzureLoginStatus;
	readonly onStatusChanged: Event<AzureLoginStatus>;
	readonly waitForLogin: () => Promise<boolean>;
	readonly sessions: AzureSession[];
	readonly onSessionsChanged: Event<void>;
	readonly subscriptions: AzureSubscription[];
	readonly onSubscriptionsChanged: Event<void>;
	readonly waitForSubscriptions: () => Promise<boolean>;
	readonly filters: AzureResourceFilter[];
	readonly onFiltersChanged: Event<void>;
	readonly waitForFilters: () => Promise<boolean>;
	createCloudShell(os: 'Linux' | 'Windows'): CloudShell;
}

export interface AzureSession {
	readonly environment: Environment;
	readonly userId: string;
	readonly tenantId: string;
	readonly credentials: ServiceClientCredentials;
}

export interface AzureSubscription {
	readonly session: AzureSession;
	readonly subscription: Subscription;
}

export type AzureResourceFilter = AzureSubscription;

export type CloudShellStatus = 'Connecting' | 'Connected' | 'Disconnected';

export interface CloudShell {
	readonly status: CloudShellStatus;
	readonly onStatusChanged: Event<CloudShellStatus>;
	readonly waitForConnection: () => Promise<boolean>;
	readonly terminal: Promise<Terminal>;
	readonly session: Promise<AzureSession>;
}