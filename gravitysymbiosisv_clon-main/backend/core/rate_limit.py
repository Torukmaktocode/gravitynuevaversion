import os
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from core.config import get_user_id


def _get_user_key():
    from flask import request
    user_id, _ = get_user_id(request)
    return user_id or get_remote_address()


limiter = Limiter(
    key_func=_get_user_key,
    default_limits=[],
    storage_uri=os.environ.get("RATE_LIMIT_STORAGE", "memory://"),
    strategy="fixed-window",
)
