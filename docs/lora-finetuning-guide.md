# LoRA Fine-Tuning Guide for Code Models

Fine-tune Qwen2.5-Coder (or similar models) on your own codebase using LoRA (Low-Rank Adaptation).

## Overview

**What is LoRA?**
Instead of updating all 7 billion parameters, LoRA freezes the base model and trains small "adapter" matrices (typically 0.1-1% of original size). This means:
- Much less VRAM needed (can fine-tune 7B on 16GB)
- Training takes hours, not weeks
- Easy to swap adapters for different projects

**Your Setup:**
- Training: Mac M4 Pro 36GB (excellent for this)
- Inference: RTX 3070 Ti 8GB (run the fine-tuned model)

## Option 1: MLX (Recommended for Mac)

Apple's MLX framework is optimized for Apple Silicon and is the smoothest path on your M4 Pro.

### Setup

```bash
# Create a virtual environment
python3 -m venv ~/mlx-finetune
source ~/mlx-finetune/bin/activate

# Install MLX and dependencies
pip install mlx mlx-lm transformers datasets
```

### Prepare Your Training Data

Create a script to extract training examples from your codebase:

```python
#!/usr/bin/env python3
"""
extract_training_data.py - Convert your codebase into training examples
"""

import os
import json
import random
from pathlib import Path

def extract_code_files(root_dir, extensions=['.js', '.ts', '.tsx', '.jsx', '.java']):
    """Extract all code files from a directory."""
    files = []
    skip_dirs = {'node_modules', '.git', 'dist', 'build', '__pycache__', '.next'}

    for path in Path(root_dir).rglob('*'):
        if any(skip in path.parts for skip in skip_dirs):
            continue
        if path.suffix in extensions and path.is_file():
            try:
                content = path.read_text(encoding='utf-8')
                if len(content) > 100:  # Skip tiny files
                    files.append({
                        'path': str(path.relative_to(root_dir)),
                        'content': content,
                        'language': get_language(path.suffix)
                    })
            except Exception as e:
                print(f"Skipping {path}: {e}")

    return files

def get_language(suffix):
    return {
        '.js': 'javascript',
        '.jsx': 'javascript',
        '.ts': 'typescript',
        '.tsx': 'typescript',
        '.java': 'java'
    }.get(suffix, 'code')

def create_training_examples(files):
    """
    Create diverse training examples:
    1. Code completion (fill in the middle)
    2. Code explanation
    3. Code review/improvement
    4. Function implementation from docstring
    """
    examples = []

    for file in files:
        content = file['content']
        lang = file['language']
        path = file['path']

        # Example Type 1: Explain this code
        examples.append({
            "messages": [
                {"role": "user", "content": f"Explain what this {lang} code does:\n\n```{lang}\n{content[:2000]}\n```"},
                {"role": "assistant", "content": f"This code is from `{path}`. Let me explain what it does:\n\n[You'll want to manually review/edit these or use a larger model to generate explanations]"}
            ]
        })

        # Example Type 2: Complete this code
        if len(content) > 500:
            split_point = len(content) // 2
            prefix = content[:split_point]
            suffix = content[split_point:]
            examples.append({
                "messages": [
                    {"role": "user", "content": f"Complete this {lang} code:\n\n```{lang}\n{prefix}\n```"},
                    {"role": "assistant", "content": f"```{lang}\n{suffix}\n```"}
                ]
            })

        # Example Type 3: Write code in this style
        examples.append({
            "messages": [
                {"role": "user", "content": f"Write {lang} code similar to the style used in this project. Here's an example from the codebase:\n\n```{lang}\n{content[:1500]}\n```\n\nNow write a similar [describe what you want]."},
                {"role": "assistant", "content": "[Template - customize based on your needs]"}
            ]
        })

    return examples

def main():
    import sys

    if len(sys.argv) < 2:
        print("Usage: python extract_training_data.py /path/to/your/codebase")
        sys.exit(1)

    root_dir = sys.argv[1]
    output_file = "training_data.jsonl"

    print(f"Extracting code from: {root_dir}")
    files = extract_code_files(root_dir)
    print(f"Found {len(files)} code files")

    examples = create_training_examples(files)
    print(f"Created {len(examples)} training examples")

    # Shuffle and save
    random.shuffle(examples)

    with open(output_file, 'w') as f:
        for example in examples:
            f.write(json.dumps(example) + '\n')

    print(f"Saved to {output_file}")

    # Also create a small validation set
    val_size = max(10, len(examples) // 10)
    with open("validation_data.jsonl", 'w') as f:
        for example in examples[:val_size]:
            f.write(json.dumps(example) + '\n')

    print(f"Saved {val_size} validation examples")

if __name__ == "__main__":
    main()
```

### Better Training Data: Use an LLM to Generate Pairs

The script above creates templates. For high-quality training, use Claude or GPT-4 to generate the assistant responses:

```python
"""
generate_quality_pairs.py - Use Claude API to create high-quality training pairs
"""

import anthropic
import json
from pathlib import Path

client = anthropic.Anthropic()  # Uses ANTHROPIC_API_KEY env var

def generate_explanation(code: str, language: str, filepath: str) -> str:
    """Use Claude to generate a quality explanation."""
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": f"""Explain this {language} code from {filepath}. Be concise but thorough.
Focus on: purpose, key patterns used, and how it fits into a larger application.

```{language}
{code}
```"""
        }]
    )
    return response.content[0].text

def generate_training_pair(code: str, language: str, filepath: str) -> dict:
    """Generate a complete training example."""
    explanation = generate_explanation(code, language, filepath)

    return {
        "messages": [
            {"role": "user", "content": f"Explain this {language} code:\n\n```{language}\n{code}\n```"},
            {"role": "assistant", "content": explanation}
        ]
    }

# Usage: Run this on your extracted code files
# This costs money but produces much better training data
```

### Fine-Tune with MLX

```bash
# Download the base model (will cache locally)
python -m mlx_lm.convert \
    --hf-path Qwen/Qwen2.5-Coder-7B-Instruct \
    --mlx-path ./qwen-coder-7b-mlx

# Run LoRA fine-tuning
python -m mlx_lm.lora \
    --model ./qwen-coder-7b-mlx \
    --train \
    --data ./training_data.jsonl \
    --batch-size 4 \
    --lora-layers 16 \
    --iters 1000 \
    --learning-rate 1e-5 \
    --adapter-path ./my-code-adapter

# Test the fine-tuned model
python -m mlx_lm.generate \
    --model ./qwen-coder-7b-mlx \
    --adapter-path ./my-code-adapter \
    --prompt "Explain how the SessionService works in Context Kiln"
```

### Export for Use on Your 3070 Ti

```bash
# Fuse the adapter into the model
python -m mlx_lm.fuse \
    --model ./qwen-coder-7b-mlx \
    --adapter-path ./my-code-adapter \
    --save-path ./qwen-coder-finetuned

# Convert back to GGUF for use with llama.cpp/Ollama
# (You'll need llama.cpp's convert script)
```

## Option 2: Unsloth (Linux/CUDA - More Features)

If you want to train on a Linux machine with NVIDIA GPU, Unsloth is 2x faster and uses 70% less VRAM.

### Setup

```bash
pip install unsloth
pip install --no-deps trl peft accelerate bitsandbytes
```

### Fine-Tuning Script

```python
"""
finetune_unsloth.py - Fine-tune with Unsloth (for CUDA systems)
"""

from unsloth import FastLanguageModel
from datasets import load_dataset
from trl import SFTTrainer
from transformers import TrainingArguments

# Load model with 4-bit quantization
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="Qwen/Qwen2.5-Coder-7B-Instruct",
    max_seq_length=4096,
    dtype=None,  # Auto-detect
    load_in_4bit=True,  # QLoRA - saves VRAM
)

# Add LoRA adapters
model = FastLanguageModel.get_peft_model(
    model,
    r=16,  # LoRA rank - higher = more capacity but more VRAM
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                    "gate_proj", "up_proj", "down_proj"],
    lora_alpha=16,
    lora_dropout=0,
    bias="none",
    use_gradient_checkpointing="unsloth",  # Saves 30% VRAM
)

# Load your dataset
dataset = load_dataset("json", data_files="training_data.jsonl", split="train")

# Format for chat
def formatting_func(example):
    return tokenizer.apply_chat_template(
        example["messages"],
        tokenize=False,
    )

# Training
trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    formatting_func=formatting_func,
    args=TrainingArguments(
        output_dir="./output",
        per_device_train_batch_size=2,
        gradient_accumulation_steps=4,
        warmup_steps=10,
        max_steps=500,  # Adjust based on dataset size
        learning_rate=2e-4,
        fp16=True,
        logging_steps=10,
        save_steps=100,
    ),
)

trainer.train()

# Save the LoRA adapter
model.save_pretrained("./qwen-coder-lora")
tokenizer.save_pretrained("./qwen-coder-lora")

# Optionally merge and export to GGUF
model.save_pretrained_gguf("./qwen-coder-merged", tokenizer, quantization_method="q4_k_m")
```

## Training Data Best Practices

### Quality Over Quantity
- 500-2000 high-quality examples beats 50,000 mediocre ones
- Each example should teach something specific
- Manually review a sample of your training data

### Diverse Example Types
1. **Code explanation** - "Explain this code" → detailed explanation
2. **Code completion** - Partial code → completion
3. **Bug fixing** - Buggy code → fixed code with explanation
4. **Code review** - Code → constructive feedback
5. **Implementation** - Description → implementation
6. **Refactoring** - Old code → improved code

### Domain-Specific Examples
Since you're focused on JS/TS/Java, include:
- React component patterns
- Node.js async patterns
- TypeScript type definitions
- Spring Boot patterns (Java)
- Your specific framework conventions

### Example: React Component Training Pair

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Create a React component for a file tree that shows files and folders with expand/collapse functionality. Use TypeScript and Ant Design."
    },
    {
      "role": "assistant",
      "content": "```tsx\nimport React, { useState } from 'react';\nimport { Tree } from 'antd';\nimport { FolderOutlined, FileOutlined } from '@ant-design/icons';\nimport type { DataNode } from 'antd/es/tree';\n\ninterface FileTreeProps {\n  files: FileNode[];\n  onSelect?: (path: string) => void;\n}\n\ninterface FileNode {\n  name: string;\n  path: string;\n  isDirectory: boolean;\n  children?: FileNode[];\n}\n\nconst FileTree: React.FC<FileTreeProps> = ({ files, onSelect }) => {\n  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);\n\n  const convertToTreeData = (nodes: FileNode[]): DataNode[] => {\n    return nodes.map(node => ({\n      key: node.path,\n      title: node.name,\n      icon: node.isDirectory ? <FolderOutlined /> : <FileOutlined />,\n      children: node.children ? convertToTreeData(node.children) : undefined,\n    }));\n  };\n\n  return (\n    <Tree\n      showIcon\n      expandedKeys={expandedKeys}\n      onExpand={setExpandedKeys}\n      onSelect={(keys) => onSelect?.(keys[0] as string)}\n      treeData={convertToTreeData(files)}\n    />\n  );\n};\n\nexport default FileTree;\n```"
    }
  ]
}
```

## Hardware Requirements

| Model Size | Min VRAM (QLoRA) | Recommended | Notes |
|------------|------------------|-------------|-------|
| 3B | 6GB | 8GB | Good for testing |
| 7B | 12GB | 16GB | Sweet spot |
| 14B | 20GB | 24GB | Your M4 Pro can handle this |
| 32B | 36GB+ | 48GB | Pushing M4 Pro limits |

Your M4 Pro with 36GB unified memory can comfortably fine-tune up to 14B models, possibly 32B with aggressive quantization.

## Deployment

### Option A: Ollama (Easiest)

```bash
# Create a Modelfile
cat > Modelfile << 'EOF'
FROM ./qwen-coder-merged-q4_k_m.gguf
TEMPLATE """{{ .System }}
{{ .Prompt }}"""
PARAMETER temperature 0.7
PARAMETER top_p 0.9
EOF

# Create the model in Ollama
ollama create my-coder -f Modelfile

# Use it
ollama run my-coder "Explain SessionService"
```

### Option B: LM Studio
Just drag and drop the GGUF file into LM Studio.

### Option C: llama.cpp Server

```bash
./server -m ./qwen-coder-merged-q4_k_m.gguf -c 4096 --port 8080
```

## Tips for Your Use Case

1. **Start small**: Fine-tune on 100-200 examples first, test, iterate
2. **Include Context Kiln code**: Your model will learn your specific patterns
3. **Add framework examples**: React patterns, Electron IPC, Ant Design usage
4. **Test incrementally**: After each training run, test on real tasks
5. **Version your adapters**: Keep different versions for different purposes

## Quick Start Checklist

- [ ] Set up Python environment on M4 Pro
- [ ] Install MLX (`pip install mlx mlx-lm`)
- [ ] Extract code from your repositories
- [ ] Generate training pairs (manual or with Claude API)
- [ ] Run fine-tuning (start with 200-500 iterations)
- [ ] Test the model
- [ ] Export to GGUF for your 3070 Ti
- [ ] Deploy via Ollama or LM Studio

## Resources

- [MLX Documentation](https://ml-explore.github.io/mlx/)
- [Unsloth GitHub](https://github.com/unslothai/unsloth)
- [QLoRA Paper](https://arxiv.org/abs/2305.14314)
- [Qwen2.5-Coder](https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct)
