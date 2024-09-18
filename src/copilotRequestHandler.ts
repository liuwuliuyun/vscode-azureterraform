import * as vscode from 'vscode';
import { AzureCliCredential } from '@azure/identity';

const COPILOT_ENDPOINT = 'https://azclitools-copilot-apim-temp.azure-api.net/aztf/copilot';
const copilotCredential = new AzureCliCredential();

export async function copilotRequestHandler(
    request: vscode.ChatRequest,
    _context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
): Promise<void> {
    try {
        stream.progress('Retrieving Azure credentials...');
        const COPILOT_AAD_TOKEN = (await copilotCredential.getToken('https://management.core.windows.net/')).token;
        stream.progress('TerraformAI is searching for the best documentation and code snippets for you...');

        const messages = {
            question: request.prompt,
            streaming: true
        };

        const chatResponse = await fetch(COPILOT_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ` + COPILOT_AAD_TOKEN,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(messages)
        });

        if (!chatResponse.ok) {
            throw new Error(await chatResponse.text());
        }
        stream.progress('TerraformAI is generating the answer for you...');
        const chatResponseReader = chatResponse.body?.getReader();

        if (!chatResponseReader) {
            throw new Error('Failed to get response reader');
        }

        while (true) {
            const { done, value } = await chatResponseReader.read();
            if (done) break;
            
            const message = new TextDecoder().decode(value);
            stream.markdown(message);

            if (token.isCancellationRequested) {
                chatResponseReader.cancel();
                break;
            }
        }
    } catch (error) {
        stream.progress('TerraformAI is unable to help you at the moment. Please try again later.');
        stream.markdown(error instanceof Error ? error.message : 'An unknown error occurred');
    }
}