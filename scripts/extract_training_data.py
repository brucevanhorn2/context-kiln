#!/usr/bin/env python3
"""
Extract training data from your codebase for LoRA fine-tuning.

Usage:
    python scripts/extract_training_data.py /path/to/codebase
    python scripts/extract_training_data.py .  # Current directory

This creates:
    - training_data.jsonl: Training examples in chat format
    - validation_data.jsonl: 10% held out for validation
"""

import os
import sys
import json
import random
import re
from pathlib import Path
from typing import List, Dict, Optional

# Configuration
EXTENSIONS = {'.js', '.jsx', '.ts', '.tsx', '.java'}
SKIP_DIRS = {'node_modules', '.git', 'dist', 'build', '__pycache__', '.next', 'coverage', '.cache'}
MIN_FILE_SIZE = 100  # bytes
MAX_FILE_SIZE = 50000  # bytes - skip huge files
MAX_CONTENT_LENGTH = 3000  # chars per example


def get_language(suffix: str) -> str:
    """Map file extension to language name."""
    return {
        '.js': 'javascript',
        '.jsx': 'javascript',
        '.ts': 'typescript',
        '.tsx': 'typescript',
        '.java': 'java'
    }.get(suffix, 'code')


def extract_docstring(content: str, language: str) -> Optional[str]:
    """Extract the first docstring/comment block from code."""
    if language in ('javascript', 'typescript'):
        # JSDoc style
        match = re.search(r'/\*\*\s*([\s\S]*?)\*/', content)
        if match:
            return match.group(1).strip()
    elif language == 'java':
        # Javadoc style
        match = re.search(r'/\*\*\s*([\s\S]*?)\*/', content)
        if match:
            return match.group(1).strip()
    return None


def extract_functions(content: str, language: str) -> List[Dict]:
    """Extract individual functions/methods from code."""
    functions = []

    if language in ('javascript', 'typescript'):
        # Match function declarations, arrow functions, methods
        patterns = [
            r'((?:export\s+)?(?:async\s+)?function\s+\w+\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{[^}]+\})',
            r'((?:export\s+)?const\s+\w+\s*=\s*(?:async\s+)?\([^)]*\)\s*(?::\s*[^=]+)?\s*=>\s*\{[^}]+\})',
        ]
        for pattern in patterns:
            matches = re.findall(pattern, content, re.MULTILINE)
            functions.extend([{'code': m, 'language': language} for m in matches if len(m) > 50])

    elif language == 'java':
        # Match method declarations
        pattern = r'((?:public|private|protected)\s+(?:static\s+)?(?:\w+\s+)+\w+\s*\([^)]*\)\s*(?:throws\s+[\w,\s]+)?\s*\{[^}]+\})'
        matches = re.findall(pattern, content, re.MULTILINE)
        functions.extend([{'code': m, 'language': language} for m in matches if len(m) > 50])

    return functions[:5]  # Limit per file


def create_explanation_example(code: str, language: str, filepath: str) -> Dict:
    """Create a 'explain this code' training example."""
    truncated = code[:MAX_CONTENT_LENGTH]
    return {
        "messages": [
            {
                "role": "user",
                "content": f"Explain what this {language} code does:\n\n```{language}\n{truncated}\n```"
            },
            {
                "role": "assistant",
                "content": f"This code is from `{filepath}`. [REPLACE WITH ACTUAL EXPLANATION - use Claude API or write manually]"
            }
        ],
        "_meta": {"type": "explanation", "file": filepath, "needs_completion": True}
    }


def create_completion_example(code: str, language: str) -> Optional[Dict]:
    """Create a code completion training example."""
    if len(code) < 200:
        return None

    # Find a good split point (end of a line in the middle-ish)
    mid = len(code) // 2
    split = code.rfind('\n', mid - 200, mid + 200)
    if split == -1:
        split = mid

    prefix = code[:split].rstrip()
    suffix = code[split:].lstrip()

    if len(prefix) < 50 or len(suffix) < 50:
        return None

    return {
        "messages": [
            {
                "role": "user",
                "content": f"Complete this {language} code:\n\n```{language}\n{prefix[:MAX_CONTENT_LENGTH]}\n```"
            },
            {
                "role": "assistant",
                "content": f"```{language}\n{suffix[:MAX_CONTENT_LENGTH]}\n```"
            }
        ],
        "_meta": {"type": "completion", "needs_completion": False}
    }


def create_function_example(func: Dict, filepath: str) -> Dict:
    """Create a 'write this function' training example."""
    code = func['code']
    language = func['language']

    # Try to extract the function signature
    if language in ('javascript', 'typescript'):
        sig_match = re.match(r'((?:export\s+)?(?:async\s+)?(?:function\s+\w+|const\s+\w+\s*=)[^{]*)', code)
    else:
        sig_match = re.match(r'((?:public|private|protected)[^{]*)', code)

    if sig_match:
        signature = sig_match.group(1).strip()
        description = f"Implement a function with this signature: `{signature}`"
    else:
        description = f"Implement this {language} function"

    return {
        "messages": [
            {
                "role": "user",
                "content": f"{description}\n\nContext: This is from `{filepath}` in the project."
            },
            {
                "role": "assistant",
                "content": f"```{language}\n{code[:MAX_CONTENT_LENGTH]}\n```"
            }
        ],
        "_meta": {"type": "implementation", "file": filepath, "needs_completion": False}
    }


def extract_code_files(root_dir: str) -> List[Dict]:
    """Extract all relevant code files from directory."""
    files = []
    root_path = Path(root_dir).resolve()

    for path in root_path.rglob('*'):
        # Skip excluded directories
        if any(skip in path.parts for skip in SKIP_DIRS):
            continue

        # Check extension
        if path.suffix not in EXTENSIONS or not path.is_file():
            continue

        # Check size
        try:
            size = path.stat().st_size
            if size < MIN_FILE_SIZE or size > MAX_FILE_SIZE:
                continue

            content = path.read_text(encoding='utf-8')
            rel_path = str(path.relative_to(root_path))
            language = get_language(path.suffix)

            files.append({
                'path': rel_path,
                'content': content,
                'language': language,
                'size': size
            })
        except Exception as e:
            print(f"  Skipping {path}: {e}")

    return files


def generate_training_examples(files: List[Dict]) -> List[Dict]:
    """Generate diverse training examples from code files."""
    examples = []

    for file in files:
        content = file['content']
        language = file['language']
        filepath = file['path']

        # Type 1: Full file explanation (for smaller files)
        if len(content) < 2000:
            examples.append(create_explanation_example(content, language, filepath))

        # Type 2: Code completion
        completion = create_completion_example(content, language)
        if completion:
            examples.append(completion)

        # Type 3: Individual function implementations
        functions = extract_functions(content, language)
        for func in functions:
            examples.append(create_function_example(func, filepath))

    return examples


def main():
    if len(sys.argv) < 2:
        print("Usage: python extract_training_data.py /path/to/codebase")
        print("       python extract_training_data.py .  # Current directory")
        sys.exit(1)

    root_dir = sys.argv[1]

    if not os.path.isdir(root_dir):
        print(f"Error: {root_dir} is not a directory")
        sys.exit(1)

    print(f"Extracting code from: {os.path.abspath(root_dir)}")
    print(f"Looking for: {', '.join(EXTENSIONS)}")
    print()

    # Extract files
    files = extract_code_files(root_dir)
    print(f"Found {len(files)} code files")

    # Show breakdown by language
    by_lang = {}
    for f in files:
        lang = f['language']
        by_lang[lang] = by_lang.get(lang, 0) + 1
    for lang, count in sorted(by_lang.items()):
        print(f"  {lang}: {count} files")
    print()

    # Generate examples
    examples = generate_training_examples(files)
    print(f"Generated {len(examples)} training examples")

    # Count by type
    by_type = {}
    needs_completion = 0
    for ex in examples:
        t = ex.get('_meta', {}).get('type', 'unknown')
        by_type[t] = by_type.get(t, 0) + 1
        if ex.get('_meta', {}).get('needs_completion'):
            needs_completion += 1

    for t, count in sorted(by_type.items()):
        print(f"  {t}: {count} examples")
    print()

    if needs_completion > 0:
        print(f"Note: {needs_completion} examples need manual completion or Claude API")
        print("      (marked with 'needs_completion: True' in _meta)")
        print()

    # Shuffle
    random.shuffle(examples)

    # Split into train/val
    val_size = max(10, len(examples) // 10)
    val_examples = examples[:val_size]
    train_examples = examples[val_size:]

    # Remove _meta before saving (it's just for our tracking)
    def clean(ex):
        return {"messages": ex["messages"]}

    # Save training data
    with open("training_data.jsonl", 'w') as f:
        for ex in train_examples:
            f.write(json.dumps(clean(ex)) + '\n')
    print(f"Saved {len(train_examples)} training examples to training_data.jsonl")

    # Save validation data
    with open("validation_data.jsonl", 'w') as f:
        for ex in val_examples:
            f.write(json.dumps(clean(ex)) + '\n')
    print(f"Saved {len(val_examples)} validation examples to validation_data.jsonl")

    # Also save with metadata for review
    with open("training_data_with_meta.jsonl", 'w') as f:
        for ex in examples:
            f.write(json.dumps(ex) + '\n')
    print(f"Saved full data with metadata to training_data_with_meta.jsonl")

    print()
    print("Next steps:")
    print("1. Review training_data_with_meta.jsonl")
    print("2. For 'needs_completion' examples, add real explanations")
    print("3. Run fine-tuning with MLX or Unsloth")


if __name__ == "__main__":
    main()
