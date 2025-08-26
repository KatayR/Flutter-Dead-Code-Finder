# Flutter Dead Code Finder

It finds unreferenced methods, fields, and variables in Dart/Flutter projects — even when VS Code doesn’t actively warn you in the `Problems` tab.  

https://github.com/KatayR/Flutter-Dead-Code-Finder

Q:Why not just enable `dead_code: error` in `analysis_options.yaml`? Wouldn’t that be easier? What advantage does your tool have over that?  
A: `dead_code` in `analysis_options.yaml` only marks unreachable code (like after a return/throw). It doesn’t detect unreferenced methods, fields, or variables scattered in the project. My extension scans the whole codebase and catches those, even if the analyzer doesn’t warn in `Problems.

## ⚠️ Important Notice

This tool identifies potentially unused code by analyzing VS Code's symbol references. **False positives are uncommon but possible** - methods may appear unused when they're actually called via:

- **Dynamic/reflection-based calls** - `object[methodName]()`, reflection
- **Code generation** - build_runner, annotations creating references
- **External packages** - other libraries using your public APIs  
- **String references** - method names in configs, JSON, etc.
- **Framework-specific patterns** - dependency injection, etc.

**Use this as a starting point for manual code review, not as definitive unused code detection.** Always verify before deleting any code.

## Features

- Scans all `.dart` files in selected folders
- Excludes generated files (`.g.dart`, `.freezed.dart`) and `.dart_tool/`
- Uses VS Code's language services for accurate symbol analysis
- Shows progress during scanning
- Results displayed in VS Code Output Channel

## Usage

1. Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Run "Find Dead/Unreferenced Dart Symbols"
3. Select folders containing Dart files you want to scan
4. Review results in the "Dead Code Finder" output channel

## Requirements

- VS Code 1.74.0 or higher
- Dart language server extension for accurate symbol analysis

## Known Limitations

- May work with other languages but not tested and thus it does not scan for other file types, for now
- Skips private methods (starting with `_`)
- Relies on VS Code's language server for reference detection
