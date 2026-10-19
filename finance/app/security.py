import base64
import hashlib
import hmac
import os

from cryptography.fernet import Fernet, InvalidToken

from . import config


def hash_password(pw: str) -> str:
    salt = os.urandom(16)
    h = hashlib.scrypt(pw.encode(), salt=salt, n=2 ** 14, r=8, p=1, dklen=32)
    return "scrypt$" + salt.hex() + "$" + h.hex()


def verify_password(pw: str, stored: str) -> bool:
    try:
        _, salt, h = stored.split("$")
        calc = hashlib.scrypt(pw.encode(), salt=bytes.fromhex(salt), n=2 ** 14, r=8, p=1, dklen=32)
        return hmac.compare_digest(calc.hex(), h)
    except Exception:
        return False


def _fernet() -> Fernet:
    key = base64.urlsafe_b64encode(hashlib.sha256(("tok|" + config.SECRET_KEY).encode()).digest())
    return Fernet(key)


def encrypt(s: str) -> str:
    return _fernet().encrypt(s.encode()).decode() if s else ""


def decrypt(s: str) -> str:
    if not s:
        return ""
    try:
        return _fernet().decrypt(s.encode()).decode()
    except InvalidToken:
        return ""
