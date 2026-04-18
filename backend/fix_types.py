import os
import re

endpoints_dir = r"D:\User\Workspace\secondhand-marketplace\backend\app\api\v1\endpoints"

def patch_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    if "from typing import Any" not in content:
        # Find a good place to insert (after first line to avoid breaking __future__ if present, though none here)
        content = "from typing import Any\n" + content

    # Replace `-> Type:` with `-> Any:`
    # Careful: match only `) -> Something:`
    content = re.sub(r"\)\s*->\s*[^:]+:", ") -> Any:", content)
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

for filename in os.listdir(endpoints_dir):
    if filename.endswith(".py") and filename != "__init__.py":
        patch_file(os.path.join(endpoints_dir, filename))
