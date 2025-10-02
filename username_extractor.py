import sys
import json
from collections import Counter

if len(sys.argv) < 3:
    sys.exit("Usage: python3 username_extractor.py messages.json username.txt")

messages_file = sys.argv[1]
usernames_file = sys.argv[2]

# Load message JSON
with open(messages_file, 'r', encoding='utf8') as f:
    messages = json.load(f)

# Load usernames list
with open(usernames_file, 'r', encoding='utf8') as f:
    usernames = [line.strip() for line in f if line.strip()]

# Flatten JSON into plain text
def extract_text(obj):
    if isinstance(obj, dict):
        return " ".join(extract_text(v) for v in obj.values())
    elif isinstance(obj, list):
        return " ".join(extract_text(v) for v in obj)
    elif isinstance(obj, str):
        return obj
    else:
        return ""

text = extract_text(messages)

# Count username occurrences
counts = Counter()
for uname in usernames:
    counts[uname] = text.count(uname)

# Find least common username (but >0 count)
valid_counts = {u: c for u, c in counts.items() if c > 0}

if valid_counts:
    least = min(valid_counts, key=valid_counts.get)
    print(least)   # ✅ Print the least common username
else:
    print("")      # Empty if no match
