import os
import tempfile

d = tempfile.mkdtemp()
os.environ.update(DB_PATH=f"{d}/t.db", SECRET_KEY="test-secret", OWNER_EMAIL="owner@x.ua",
                  OWNER_PASSWORD="ownerpass1", SCHEDULER_ENABLED="0", API_TOKEN="tok123")
