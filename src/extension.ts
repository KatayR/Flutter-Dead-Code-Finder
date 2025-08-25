import * as vscode from 'vscode';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "flutter-dead-code-finder" is now active!');

	let disposable = vscode.commands.registerCommand('flutter-dead-code-finder.findUnreferencedMethods', async () => {

		// 1) Let the user pick folders
		const folders = await vscode.window.showOpenDialog({
			canSelectFolders: true,
			canSelectMany: true,
			openLabel: 'Select folder(s) to scan for unreferenced symbols'
		});
		if (!folders || folders.length === 0) {
			vscode.window.showInformationMessage('No folders selected – aborting.');
			return;
		}

		// 2) Build a RelativePattern for each folder
		const patterns = folders.map(folder =>
			new vscode.RelativePattern(folder, '**/*.dart')
		);

		// 3) Gather all .dart files under those patterns
		const excludeGlob = '{**/.dart_tool/**,**/*.g.dart,**/*.freezed.dart}';
		let files: vscode.Uri[] = [];
		for (const pattern of patterns) {
			const found = await vscode.workspace.findFiles(pattern, excludeGlob);
			files.push(...found);
		}

		if (files.length === 0) {
			vscode.window.showInformationMessage('No Dart files found in the workspace.');
			return;
		}

		let unreferencedSymbols: { name: string, file: string, line: number, kind: string }[] = [];
		let fileCounter = 0;

		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "Finding Unreferenced Symbols...",
			cancellable: true
		}, async (progress, token) => {

			for (const file of files) {
				if (token.isCancellationRequested) {
					break;
				}

				fileCounter++;
				const progressMessage = `[${fileCounter}/${files.length}] Scanning ${vscode.workspace.asRelativePath(file)}`;
				progress.report({ message: progressMessage });

				try {
					const document = await vscode.workspace.openTextDocument(file);
					// Important: Ensure the document is loaded before getting symbols
					if (!document) {continue;}

					const symbols: vscode.DocumentSymbol[] | undefined = await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', document.uri);
					if (!symbols) {continue;}

					// A recursive function to traverse the symbol tree
					const findUnusedInSymbols = async (documentSymbols: vscode.DocumentSymbol[]) => {
						for (const symbol of documentSymbols) {
							if (token.isCancellationRequested) {break;}

							// We care about methods, constructors, fields, properties, and variables
							const isTargetSymbol = symbol.kind === vscode.SymbolKind.Method ||
								symbol.kind === vscode.SymbolKind.Constructor ||
								symbol.kind === vscode.SymbolKind.Field ||
								symbol.kind === vscode.SymbolKind.Property ||
								symbol.kind === vscode.SymbolKind.Variable;

							// Skip private symbols from other files (common in Flutter/Dart)
							if (symbol.name.startsWith('_')) {
								// This is a simplification; a full implementation would check usage within the same library.
								// For now, we assume private methods are used within their own file.
								continue;
							}

							if (isTargetSymbol) {
								// Find all references to this symbol
								const references: vscode.Location[] | undefined = await vscode.commands.executeCommand('vscode.executeReferenceProvider', document.uri, symbol.selectionRange.start);

								// **THE KEY LOGIC:** If a symbol has 1 reference, it's only its own declaration.
								// It is therefore considered unreferenced or "dead code".
								if (references && (references?.length ?? 0) <= 1) {
									const symbolKindName = vscode.SymbolKind[symbol.kind].toLowerCase();
									unreferencedSymbols.push({
										name: symbol.name,
										file: document.uri.fsPath,                    // ← absolute path!
										line: symbol.selectionRange.start.line + 1,  // ← 1‑based
										kind: symbolKindName
									});
								}
							}

							// Recursively check children symbols
							if (symbol.children && symbol.children.length > 0) {
								await findUnusedInSymbols(symbol.children);
							}
						}
					};

					await findUnusedInSymbols(symbols);

				} catch (error) {
					console.error(`Failed to process file: ${vscode.workspace.asRelativePath(file)}`, error);
				}
			}
		});

		const out = vscode.window.createOutputChannel("Dead Code Finder");
		out.clear();
		out.show(true);

		unreferencedSymbols.forEach(s => {
			// format: /full/path/to/file.dart:23:5
			out.appendLine(`${s.file}:${s.line}: ${s.name} (${s.kind})`);
		});

		out.appendLine(`\n→ Found ${unreferencedSymbols.length} unreferenced symbols.`);
		// --- Display the results ---
		let results = `Found ${unreferencedSymbols.length} potentially unreferenced symbols:\n\n`;

		if (unreferencedSymbols.length > 0) {
			unreferencedSymbols.forEach(symbol => {
				results += `- ${symbol.kind}: ${symbol.name}\n`;
				results += `  File: ${symbol.file} (Line ${symbol.line})\n\n`;
			});
		} else {
			results += "No unreferenced symbols found. Great job!";
		}



		const resultDocument = await vscode.workspace.openTextDocument({
			content: results,
			language: 'markdown'
		});

		await vscode.window.showTextDocument(resultDocument);
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() { }